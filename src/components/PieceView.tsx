// Draws one piece's shape at a given cell size. Used by the tray now and the drag layer later.

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { getShape, Piece } from '@/engine';
import { colorFor, sizes } from '@/theme';

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
        <View
          key={`${row}-${col}`}
          style={[
            styles.block,
            {
              left: col * cellSize + sizes.cellGap / 2,
              top: row * cellSize + sizes.cellGap / 2,
              width: block,
              height: block,
              borderRadius: cellSize * sizes.cellRadius,
              backgroundColor: colorFor(piece.color),
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
