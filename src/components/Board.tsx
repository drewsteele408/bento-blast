// The 8×8 board: a square sized to the screen width minus padding, drawn as 8 rows of cells.

import { StyleSheet, View } from 'react-native';

import { Board as BoardState, BOARD_SIZE, idx } from '@/engine';
import { colors, sizes } from '@/theme';

import { Cell } from './Cell';

type Props = {
  board: BoardState;
  cellSize: number;
  /** Debug tap-to-place. Must be a stable function (see Cell). */
  onCellPress?: (row: number, col: number) => void;
};

const ROWS = Array.from({ length: BOARD_SIZE }, (_, i) => i);

export function Board({ board, cellSize, onCellPress }: Props) {
  return (
    <View
      testID="board"
      style={[
        styles.board,
        { width: cellSize * BOARD_SIZE + sizes.cellGap, padding: sizes.cellGap / 2 },
      ]}
    >
      {ROWS.map((row) => (
        <View key={row} style={styles.row}>
          {ROWS.map((col) => (
            <Cell
              key={col}
              row={row}
              col={col}
              color={board[idx(row, col)]}
              size={cellSize}
              onPress={onCellPress}
            />
          ))}
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
