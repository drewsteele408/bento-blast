// The 8×8 board, drawn as one big empty bento box: a black lacquer rim around a wooden floor,
// with the 8 rows of cells set into it so the wood shows between them as dividers. The rim is
// drawn in art pixels at the blocks' scale, so it matches their pixel-art look.
//
// While a piece hovers over a spot where it fits, the board also draws its ghost and lights up
// the lines it would clear. Children (the board effects) are drawn on top of the cells.

import { memo, ReactNode } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { Board as BoardState, BOARD_SIZE, idx } from '@/engine';
import type { PlacementPreview } from '@/hooks/placementPreview';
import { boardRim, colors, sizes } from '@/theme';

import { Cell } from './Cell';

type Props = {
  board: BoardState;
  cellSize: number;
  preview?: PlacementPreview | null;
  /** Reports where the board sits, for the drag gesture. */
  onLayout?: (e: LayoutChangeEvent) => void;
  /** Overlays positioned over the board, such as the clear animation. */
  children?: ReactNode;
};

const ROWS = Array.from({ length: BOARD_SIZE }, (_, i) => i);

export function Board({ board, cellSize, preview, onLayout, children }: Props) {
  const rim = boardRim(cellSize);
  const floor = cellSize * BOARD_SIZE + sizes.cellGap;

  return (
    <View testID="board" onLayout={onLayout} style={{ width: floor + rim * 2 }}>
      <Rim pixel={rim / sizes.boardRimPixels} />
      <View
        testID="board-floor"
        style={[styles.floor, { width: floor, margin: rim, padding: sizes.cellGap / 2 }]}
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
        {children}
      </View>
    </View>
  );
}

/**
 * The lacquer rim, drawn under the floor: an outline with stepped pixel corners, the lacquer lit
 * along its top edge, and a dark lip where it drops down to the floor.
 */
const Rim = memo(function Rim({ pixel: p }: { pixel: number }) {
  return (
    <>
      <View style={[styles.layer, { left: p, right: p, top: 0, bottom: 0 }, styles.outline]} />
      <View style={[styles.layer, { left: 0, right: 0, top: p, bottom: p }, styles.outline]} />
      <View style={[styles.layer, inset(p), styles.lacquer]} />
      <View
        style={[styles.layer, { left: 2 * p, right: 2 * p, top: p, height: p }, styles.shine]}
      />
      <View style={[styles.layer, inset(3 * p), styles.lip]} />
    </>
  );
});

const inset = (by: number) => ({ left: by, right: by, top: by, bottom: by });

const styles = StyleSheet.create({
  floor: {
    backgroundColor: colors.wood,
  },
  layer: {
    position: 'absolute',
  },
  outline: {
    backgroundColor: colors.blockOutline,
  },
  lacquer: {
    backgroundColor: colors.lacquer,
  },
  shine: {
    backgroundColor: colors.lacquerLight,
  },
  lip: {
    backgroundColor: colors.lacquerDark,
  },
  row: {
    flexDirection: 'row',
  },
});
