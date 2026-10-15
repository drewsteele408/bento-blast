// One block drawn as a pixel-art bento compartment, from a few flat, square-cornered Views laid on
// a grid `sizes.blockPixels` art pixels wide:
//
//   outline (stepped corners) → lacquer rim with a highlight along the top → recessed fill with a
//   shadow under the rim → a shine pixel on the food. Empty cells are a plain flat square.
//
// Shared by board cells and pieces, so the tray, the dragged piece and the board all match.
// Food art (PNG sprites) can later sit on top of the fill.

import { memo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ColorId } from '@/engine';
import { artPixel, colors, rampFor } from '@/theme';

type Props = {
  color: ColorId;
  /** Width and height of the block, without the gap around it. */
  size: number;
  /** Positions the block, e.g. inside a piece. */
  style?: StyleProp<ViewStyle>;
  /** testID for the fill layer, whose background is the block's color. */
  fillTestID?: string;
};

function BentoBlockInner({ color, size, style, fillTestID }: Props) {
  const ramp = rampFor(color);
  const p = artPixel(size);

  // An empty cell is a plain flat square, so the board stays calm and the food stands out.
  if (color === 0) {
    return (
      <View
        testID={fillTestID}
        style={[{ width: size, height: size, backgroundColor: ramp.base }, style]}
      />
    );
  }

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* Outline: two overlapping bars leave each corner pixel out, a stepped pixel corner. */}
      <View style={[styles.layer, { left: p, right: p, top: 0, bottom: 0 }, styles.outline]} />
      <View style={[styles.layer, { left: 0, right: 0, top: p, bottom: p }, styles.outline]} />
      {/* Lacquer rim, lit along the top. */}
      <View style={[styles.layer, inset(p), { backgroundColor: ramp.dark }]} />
      <View
        style={[
          styles.layer,
          { left: 2 * p, right: 2 * p, top: p, height: p },
          { backgroundColor: ramp.light },
        ]}
      />
      {/* The compartment, with the rim's shadow falling across its top row. */}
      <View
        testID={fillTestID}
        style={[styles.layer, inset(2 * p), { backgroundColor: ramp.base }]}
      />
      <View
        style={[
          styles.layer,
          { left: 2 * p, right: 2 * p, top: 2 * p, height: p },
          { backgroundColor: ramp.dark },
        ]}
      />
      {/* Shine on the food. */}
      <View
        style={[
          styles.layer,
          { left: 4 * p, top: 4 * p, width: 2 * p, height: p },
          { backgroundColor: ramp.light },
        ]}
      />
    </View>
  );
}

export const BentoBlock = memo(BentoBlockInner);

const inset = (by: number): ViewStyle => ({ left: by, right: by, top: by, bottom: by });

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
  },
  outline: {
    backgroundColor: colors.blockOutline,
  },
});
