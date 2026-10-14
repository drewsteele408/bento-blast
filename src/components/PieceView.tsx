// Draws one piece's shape at a given cell size. Used by the tray now and the drag layer later.

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { getShape, Piece } from '@/engine';
import { sizes } from '@/theme';

import { BentoBlock } from './BentoBlock';

type Props = {
  piece: Piece;
  cellSize: number;
};

function PieceViewInner({ piece, cellSize }: Props) {
  const shape = getShape(piece.shapeId);
  const block = cellSize - sizes.cellGap;
  return (
    <View style={{ width: shape.width * cellSize, height: shape.height * cellSize }}>
      {shape.cells.map(({ row, col }) => (
        <BentoBlock
          key={`${row}-${col}`}
          color={piece.color}
          size={block}
          style={[
            styles.block,
            {
              left: col * cellSize + sizes.cellGap / 2,
              top: row * cellSize + sizes.cellGap / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

export const PieceView = memo(PieceViewInner);

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
  },
});
