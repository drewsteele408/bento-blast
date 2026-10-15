// The three tray slots. Pieces draw at tray scale; a slot whose piece was placed stays empty
// so the other pieces don't shift. Each slot can be dragged onto the board.

import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { Tray } from '@/engine';
import { DragState, pieceToken } from '@/hooks/useDragState';
import { sizes } from '@/theme';

import { DraggablePiece } from './DraggablePiece';

/** The widest and tallest shape is 5 cells, so every slot is sized to fit 5×5. */
const MAX_SHAPE_CELLS = 5;
/** Breathing room between a slot's edge and its piece. */
const SLOT_INSET = 6;

/** Cell size of tray pieces: `sizes.trayScale` of the board's, or smaller if 5 cells won't fit. */
export function trayCellSize(trayWidth: number, boardCellSize: number, slots: number): number {
  return Math.min(
    boardCellSize * sizes.trayScale,
    (trayWidth / slots - SLOT_INSET * 2) / MAX_SHAPE_CELLS,
  );
}

type Props = {
  tray: Tray;
  /** Moves made so far, for `pieceToken`. */
  moves: number;
  /**
   * Changes whenever a new tray is dealt, including for a new game. The slots are remounted
   * then, so each deal gets fresh views and gesture handlers: a slot whose UI-thread callbacks
   * broke (as a hot reload can do) recovers on the next deal instead of staying dead.
   */
  dealKey: number;
  /** Width of the whole tray (the board width). */
  width: number;
  boardCellSize: number;
  drag: DragState;
  /** False once the game is over. */
  enabled: boolean;
  onDrop: (index: number, token: number, row: number, col: number) => void;
  /** Reports where the tray sits, for the drag gesture. */
  onLayout?: (e: LayoutChangeEvent) => void;
};

export function PieceTray({
  tray,
  moves,
  dealKey,
  width,
  boardCellSize,
  drag,
  enabled,
  onDrop,
  onLayout,
}: Props) {
  const cellSize = trayCellSize(width, boardCellSize, tray.length);

  return (
    <View testID="piece-tray" onLayout={onLayout} style={[styles.tray, { width }]}>
      {tray.map((piece, index) => (
        <DraggablePiece
          key={`${dealKey}-${index}`}
          index={index}
          piece={piece}
          token={pieceToken(moves, index)}
          width={width / tray.length}
          height={cellSize * MAX_SHAPE_CELLS + SLOT_INSET * 2}
          trayCellSize={cellSize}
          boardCellSize={boardCellSize}
          drag={drag}
          enabled={enabled}
          onDrop={onDrop}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
  },
});
