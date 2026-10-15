// App colors. Blocks use a pixel-art bento look (prototype): every color is a 3-shade ramp,
// the way pixel art shades by hand-picked steps instead of gradients.

import { COLOR_COUNT, ColorId } from '@/engine';

/** One block's shades: `light` for highlights, `base` for the fill, `dark` for rim and shadow. */
export type Ramp = { readonly light: string; readonly base: string; readonly dark: string };

/**
 * Block ramps indexed by `ColorId`. Index 0 is an empty cell; 1..COLOR_COUNT are the
 * piece colors the dealer hands out, each themed on a bento food.
 */
export const blockRamps: readonly Ramp[] = [
  { light: '#2E2629', base: '#2E2629', dark: '#2E2629' }, // 0 empty: drawn flat, base only
  { light: '#FF9A8A', base: '#E8574A', dark: '#9E2A2B' }, // 1 umeboshi / salmon
  { light: '#FFC680', base: '#F28C28', dark: '#A34F14' }, // 2 carrot
  { light: '#FFF4B0', base: '#F7D046', dark: '#B0841A' }, // 3 tamagoyaki
  { light: '#B4EC92', base: '#5DB84A', dark: '#2E6E2C' }, // 4 edamame
  { light: '#FFFFFF', base: '#E6E0D2', dark: '#9C927E' }, // 5 rice
  { light: '#C9A6F5', base: '#8A5CC9', dark: '#4E2F80' }, // 6 ube
  { light: '#FFC2DE', base: '#F07AB0', dark: '#A8406E' }, // 7 sakura denbu
];

if (blockRamps.length !== COLOR_COUNT + 1) {
  throw new Error(`blockRamps needs ${COLOR_COUNT + 1} entries (empty + ${COLOR_COUNT} colors)`);
}

/** The base (fill) color of each block, indexed by `ColorId`. */
export const blockColors: readonly string[] = blockRamps.map((ramp) => ramp.base);

/** Ramp for a cell. Unknown ids fall back to the empty ramp instead of crashing the board. */
export function rampFor(color: ColorId): Ramp {
  return blockRamps[color] ?? blockRamps[0];
}

/** Fill color for a cell. Unknown ids fall back to the empty color. */
export function colorFor(color: ColorId): string {
  return rampFor(color).base;
}

export const colors = {
  /** Pastel yellow behind every screen. */
  background: '#FFF3C4',
  boardBackground: '#1D2135',
  /** The board's black lacquer rim: `lacquerLight` catches the light along its top edge. */
  lacquer: '#221C1F',
  lacquerLight: '#4D4347',
  /** The lip where the rim drops down to the board floor. */
  lacquerDark: '#0B0809',
  /** The wooden dividers between board cells. */
  wood: '#B98550',
  /** The 1-pixel outline around every block. */
  blockOutline: '#120B0E',
  gridLine: '#151829',
  /** Text on dark surfaces: dialogs, the pause button. */
  text: '#FFFFFF',
  textMuted: '#9AA0BC',
  /** Text on the light app background, and on accent buttons. */
  ink: '#3B3024',
  inkMuted: '#6E5F45',
  accent: '#FFB13B',
  /** Destructive actions, e.g. Reset best score. Readable on the dark cards. */
  danger: '#FF8A7A',
  /** A switch's track when it's off. */
  switchOff: '#3A3F5A',
  /** Score popups and banners over the board. */
  popupText: '#FFFFFF',
  /** The hard pixel shadow under popup text. */
  popupShadow: '#120B0E',
} as const;
