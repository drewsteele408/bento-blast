// One board cell. Memoized with primitive props, so a move or a hover change re-renders only
// the cells whose look changed.

import { memo } from 'react';
import { View } from 'react-native';

import { ColorId } from '@/engine';
import { colorFor, sizes } from '@/theme';

type Props = {
  color: ColorId;
  size: number;
  /** Color of a hovering piece that would cover this cell; 0 = none. */
  ghostColor?: ColorId;
  /** Color of a hovering piece whose move would clear this cell's row or column; 0 = none. */
  clearColor?: ColorId;
};

function CellView({ color, size, ghostColor = 0, clearColor = 0 }: Props) {
  const block = {
    width: size - sizes.cellGap,
    height: size - sizes.cellGap,
    margin: sizes.cellGap / 2,
    borderRadius: size * sizes.cellRadius,
  };

  // A cell in a line about to clear lights up in the dragged piece's color, ghost cells included.
  if (clearColor) {
    return <View testID="board-cell" style={[block, { backgroundColor: colorFor(clearColor) }]} />;
  }

  return (
    <View testID="board-cell" style={[block, { backgroundColor: colorFor(color) }]}>
      {ghostColor !== 0 && (
        <View
          testID="ghost-cell"
          style={[
            block,
            {
              margin: 0,
              opacity: sizes.ghostOpacity,
              backgroundColor: colorFor(ghostColor),
            },
          ]}
        />
      )}
    </View>
  );
}

export const Cell = memo(CellView);
