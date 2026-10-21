// One block drawn as a pixel-art bento compartment, from flat, square-cornered Views laid on a
// grid `sizes.blockPixels` art pixels wide:
//
//   outline (stepped corners) → lacquer rim in the block's color, lit along the top → dark
//   recessed compartment with a shadow under the rim → the block's food sprite on top.
//   Empty cells are a plain flat square.
//
// The food is drawn as Views, not an image: images get smoothed when scaled, which blurs pixel
// art, while Views snapped to whole art pixels stay crisp at any size.
//
// Shared by board cells and pieces, so the tray, the dragged piece and the board all match.

import { memo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ColorId } from '@/engine';
import { artPixel, colors, rampFor, spriteFor } from '@/theme';

/** The food sprite starts this many art pixels in from the block's edge: outline, then rim. */
const FOOD_INSET = 2;

type Props = {
  color: ColorId;
  /** Width and height of the block, without the gap around it. */
  size: number;
  /** Positions the block, e.g. inside a piece. */
  style?: StyleProp<ViewStyle>;
  /** testID for the layer whose background is the block's color (the rim's dark shade). */
  colorTestID?: string;
};

function BentoBlockInner({ color, size, style, colorTestID }: Props) {
  const ramp = rampFor(color);
  const p = artPixel(size);

  // An empty cell is a plain flat square, so the board stays calm and the food stands out.
  if (color === 0) {
    return (
      <View
        testID={colorTestID}
        style={[{ width: size, height: size, backgroundColor: ramp.dark }, style]}
      />
    );
  }

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* Outline: two overlapping bars leave each corner pixel out, a stepped pixel corner. */}
      <View style={[styles.layer, { left: p, right: p, top: 0, bottom: 0 }, styles.outline]} />
      <View style={[styles.layer, { left: 0, right: 0, top: p, bottom: p }, styles.outline]} />
      {/* Lacquer rim in the block's color, lit along the top. */}
      <View testID={colorTestID} style={[styles.layer, inset(p), { backgroundColor: ramp.dark }]} />
      <View
        style={[
          styles.layer,
          { left: 2 * p, right: 2 * p, top: p, height: p },
          { backgroundColor: ramp.light },
        ]}
      />
      {/* The dark compartment, with the rim's shadow falling across its top row. */}
      <View style={[styles.layer, inset(2 * p), styles.compartment]} />
      <View
        style={[
          styles.layer,
          { left: 2 * p, right: 2 * p, top: 2 * p, height: p },
          styles.compartmentShadow,
        ]}
      />
      {/* The food, as merged rectangles of whole art pixels. */}
      {spriteFor(color).map((r, i) => (
        <View
          key={i}
          style={[
            styles.layer,
            {
              left: (FOOD_INSET + r.x) * p,
              top: (FOOD_INSET + r.y) * p,
              width: r.w * p,
              height: r.h * p,
              backgroundColor: r.color,
            },
          ]}
        />
      ))}
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
  compartment: {
    backgroundColor: colors.compartment,
  },
  compartmentShadow: {
    backgroundColor: colors.compartmentShadow,
  },
});
