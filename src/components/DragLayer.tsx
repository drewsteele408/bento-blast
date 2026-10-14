// The overlay that draws the dragged piece, covering the whole game screen so the piece is never
// clipped by the tray. Every tray piece is drawn here ahead of time, hidden, so picking one up
// shows it on the next UI frame without waiting for a React render.
//
// It also watches the hovered cell on the UI thread and tells React only when it changes.

import { StyleSheet } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Piece, Tray } from '@/engine';
import {
  DragPhase,
  DragState,
  hoveredCell,
  hoverKey,
  isAway,
  NO_HOVER,
  pieceToken,
  pieceTopLeft,
} from '@/hooks/useDragState';

import { PieceView } from './PieceView';

type Props = {
  tray: Tray;
  /** Moves made so far, for `pieceToken`. */
  moves: number;
  /** Board cell size; the dragged piece is drawn at board scale. */
  cellSize: number;
  drag: DragState;
  /** Gets a `hoverKey` (or NO_HOVER) on the JS thread each time the hovered cell changes. */
  onHover: (key: number) => void;
};

export function DragLayer({ tray, moves, cellSize, drag, onHover }: Props) {
  useAnimatedReaction(
    () => {
      // Keep the hover while a drop is pending, so the ghost stays until the piece lands.
      const phase = drag.phase.get();
      if (phase !== DragPhase.dragging && phase !== DragPhase.dropping) return NO_HOVER;
      const { row, col } = hoveredCell(drag);
      return hoverKey(drag.slot.get(), row, col);
    },
    (key, previous) => {
      if (key !== previous) scheduleOnRN(onHover, key);
    },
  );

  return (
    <Animated.View
      style={styles.overlay}
      testID="drag-layer"
    >
      {tray.map(
        (piece, index) =>
          piece && (
            <DraggedPiece
              key={index}
              token={pieceToken(moves, index)}
              piece={piece}
              cellSize={cellSize}
              drag={drag}
            />
          ),
      )}
    </Animated.View>
  );
}

type DraggedPieceProps = {
  token: number;
  piece: Piece;
  cellSize: number;
  drag: DragState;
};

function DraggedPiece({ token, piece, cellSize, drag }: DraggedPieceProps) {
  const style = useAnimatedStyle(() => {
    // By token, not slot: once a placement renders, a piece newly dealt into this slot has a
    // new token and stays hidden, even before the UI thread hears the drag is over.
    if (!isAway(drag, token)) {
      return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    }
    const origin = drag.origin.get();
    const lift = drag.lift.get();
    const corner = pieceTopLeft(drag.x.get(), drag.y.get(), lift, origin, cellSize);
    return {
      opacity: 1,
      // Scales around the piece's center: from tray size in the slot to board size when lifted.
      transform: [
        { translateX: corner.x },
        { translateY: corner.y },
        { scale: origin.startScale + (1 - origin.startScale) * lift },
      ],
    };
  });

  return (
    <Animated.View style={[styles.piece, style]}>
      <PieceView piece={piece} cellSize={cellSize} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
  },
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
