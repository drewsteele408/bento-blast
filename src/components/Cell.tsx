// One board cell. Memoized with primitive props, so a move or a hover change re-renders only
// the cells whose look changed.

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ColorId } from '@/engine';
import { sizes } from '@/theme';

import { BentoBlock } from './BentoBlock';

type Props = {
  color: ColorId;
  size: number;
  /** Color of a hovering piece that would cover this cell; 0 = none. */
  ghostColor?: ColorId;
  /** Color of a hovering piece whose move would clear this cell's row or column; 0 = none. */
  clearColor?: ColorId;
};

function CellView({ color, size, ghostColor = 0, clearColor = 0 }: Props) {
  const block = size - sizes.cellGap;

  // A cell in a line about to clear lights up in the dragged piece's color, ghost cells included.
  return (
    <View testID="board-cell" style={{ width: block, height: block, margin: sizes.cellGap / 2 }}>
      <BentoBlock color={clearColor || color} size={block} fillTestID="cell-fill" />
      {!clearColor && ghostColor !== 0 && (
        <View testID="ghost-cell" style={styles.ghost}>
          <BentoBlock color={ghostColor} size={block} />
        </View>
      )}
    </View>
  );
}

export const Cell = memo(CellView);

const styles = StyleSheet.create({
  ghost: {
    ...StyleSheet.absoluteFill,
    opacity: sizes.ghostOpacity,
  },
});
