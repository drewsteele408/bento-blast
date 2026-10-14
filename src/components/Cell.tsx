// One board cell. Memoized, so a move re-renders only the cells whose color changed.

import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { ColorId } from '@/engine';
import { colorFor, sizes } from '@/theme';

type Props = {
  row: number;
  col: number;
  color: ColorId;
  size: number;
  /** Debug tap-to-place. Must be a stable function, or every cell re-renders. */
  onPress?: (row: number, col: number) => void;
};

function CellView({ row, col, color, size, onPress }: Props) {
  const style = {
    width: size - sizes.cellGap,
    height: size - sizes.cellGap,
    margin: sizes.cellGap / 2,
    borderRadius: size * sizes.cellRadius,
    backgroundColor: colorFor(color),
  };

  if (!onPress) return <View testID="board-cell" style={style} />;
  return <Pressable testID="board-cell" style={style} onPress={() => onPress(row, col)} />;
}

export const Cell = memo(CellView);
