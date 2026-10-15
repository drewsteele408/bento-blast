// One tray slot with a pan gesture. Touching the piece picks it up; the piece itself is drawn by
// DragLayer at the screen root while it's dragged, and this slot hides its own copy.
//
// The gesture callbacks run on the UI thread. Only the drop crosses to React, with the cell
// the piece was released over; React decides whether the move is valid.

import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { getShape, Piece } from '@/engine';
import {
  DragPhase,
  DragState,
  hoveredCell,
  isAway,
  moveDrag,
  pickUp,
  pieceToken,
  returnToTray,
} from '@/hooks/useDragState';

import { PieceView } from './PieceView';

/** A release closer than this to the touch-down point is a tap, and the piece goes back. */
const TAP_SLOP = 8;

type Props = {
  index: number;
  piece: Piece | null;
  /** `pieceToken` of this slot's piece. */
  token: number;
  /** Slot size. Slots must sit side by side from the tray's left edge. */
  width: number;
  height: number;
  trayCellSize: number;
  boardCellSize: number;
  drag: DragState;
  enabled: boolean;
  /** Called on the JS thread when the piece is released after a real drag. */
  onDrop: (index: number, token: number, row: number, col: number) => void;
};

export function DraggablePiece({
  index,
  piece,
  token,
  width,
  height,
  trayCellSize,
  boardCellSize,
  drag,
  enabled,
  onDrop,
}: Props) {
  const shape = piece ? getShape(piece.shapeId) : null;
  const pieceWidth = (shape?.width ?? 0) * boardCellSize;
  const pieceHeight = (shape?.height ?? 0) * boardCellSize;
  const startScale = trayCellSize / boardCellSize;

  /**
   * Picks this piece up if no other drag holds the lock. (x, y) is the finger inside the slot
   * and (tx, ty) how far it has already moved, so a late claim starts where the finger is now.
   */
  const claim = (x: number, y: number, tx: number, ty: number) => {
    'worklet';
    if (drag.phase.get() !== DragPhase.idle) return;
    // Callbacks from a render before the last move: their piece and board are out of date.
    if (token !== pieceToken(drag.moves.get(), index)) return;
    // The slot's top-left in root coordinates: slots sit side by side in the tray row.
    const tray = drag.tray.get();
    const slotX = tray.x + index * width;
    const startX = slotX + x - tx;
    const startY = tray.y + y - ty;
    drag.origin.set({
      startX,
      startY,
      homeX: slotX + width / 2,
      homeY: tray.y + height / 2,
      width: pieceWidth,
      height: pieceHeight,
      startScale,
    });
    moveDrag(drag, tx, ty);
    pickUp(drag, index, token);
  };

  const pan = Gesture.Pan()
    .withTestId(`tray-pan-${index}`)
    .enabled(enabled && piece !== null)
    .maxPointers(1)
    .minDistance(0)
    .onStart((e) => {
      claim(e.x, e.y, e.translationX, e.translationY);
    })
    .onUpdate((e) => {
      // A finger that touched down while another piece was still springing back takes over
      // once it has landed, instead of being ignored until it lifts.
      if (drag.phase.get() === DragPhase.idle) claim(e.x, e.y, e.translationX, e.translationY);
      if (drag.slot.get() !== index || drag.phase.get() !== DragPhase.dragging) return;
      moveDrag(drag, e.translationX, e.translationY);
    })
    .onEnd((e, success) => {
      if (drag.slot.get() !== index || drag.phase.get() !== DragPhase.dragging) return;
      // Cancelled (the system took the touch, or the slot was disabled): not a drop, wherever
      // the finger was. Leave the phase alone and onFinalize sends the piece back.
      if (!success) return;
      // A tap: likewise.
      if (Math.hypot(e.translationX, e.translationY) < TAP_SLOP) return;
      // Use the release point itself, in case no update arrived after the last move.
      moveDrag(drag, e.translationX, e.translationY);
      const { row, col } = hoveredCell(drag);
      drag.phase.set(DragPhase.dropping);
      scheduleOnRN(onDrop, index, token, row, col);
    })
    .onFinalize(() => {
      // Runs after onEnd, and also on cancel. Still dragging means nobody took the drop.
      if (drag.slot.get() === index && drag.phase.get() === DragPhase.dragging) {
        returnToTray(drag);
      }
    });

  // The overlay draws this piece while it's away from the tray.
  const slotStyle = useAnimatedStyle(() => ({
    opacity: isAway(drag, token) ? 0 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID={`tray-slot-${index}`}
        accessibilityLabel={piece ? `Tray piece ${index + 1}` : `Empty tray slot ${index + 1}`}
        accessibilityState={{ disabled: !piece }}
        style={[styles.slot, { width, height }, slotStyle]}
      >
        {piece && <PieceView piece={piece} cellSize={trayCellSize} />}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
