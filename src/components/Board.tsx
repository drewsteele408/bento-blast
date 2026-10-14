// The 8×8 board: a square sized to the screen width minus padding, drawn as 8 rows of cells.
// While a piece hovers over a spot where it fits, the board also draws its ghost and lights up
// the lines it would clear.

import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { Board as BoardState, BOARD_SIZE, idx } from '@/engine';
import type { PlacementPreview } from '@/hooks/placementPreview';
import { colors, sizes } from '@/theme';

import { Cell } from './Cell';

type Props = {
  board: BoardState;
  cellSize: number;
  preview?: PlacementPreview | null;
  /** Reports where the board sits, for the drag gesture. */
  onLayout?: (e: LayoutChangeEvent) => void;
};

const ROWS = Array.from({ length: BOARD_SIZE }, (_, i) => i);

export function Board({ board, cellSize, preview, onLayout }: Props) {
  return (
    <View
      testID="board"
      onLayout={onLayout}
      style={[
        styles.board,
        { width: cellSize * BOARD_SIZE + sizes.cellGap, padding: sizes.cellGap / 2 },
      ]}
    >
      {ROWS.map((row) => (
        <View key={row} style={styles.row}>
          {ROWS.map((col) => {
            const i = idx(row, col);
            return (
              <Cell
                key={col}
                color={board[i]}
                size={cellSize}
                ghostColor={preview?.ghost.has(i) ? preview.color : 0}
                clearColor={preview?.clearing.has(i) ? preview.color : 0}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: colors.boardBackground,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
  },
});
