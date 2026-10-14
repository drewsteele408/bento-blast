// App colors. Basic placeholder look for now (see the spec's decision log); Drew will revisit it.

import { COLOR_COUNT, ColorId } from '@/engine';

/**
 * Block colors indexed by `ColorId`. Index 0 is an empty board cell; 1..COLOR_COUNT are
 * the piece colors the dealer hands out.
 */
export const blockColors: readonly string[] = [
  '#2A2F45', // 0 empty
  '#F25F5C', // 1 red
  '#FFB13B', // 2 orange
  '#FFE066', // 3 yellow
  '#5FD068', // 4 green
  '#3FA7F5', // 5 blue
  '#9B6CF0', // 6 purple
  '#F06CB5', // 7 pink
];

if (blockColors.length !== COLOR_COUNT + 1) {
  throw new Error(`blockColors needs ${COLOR_COUNT + 1} entries (empty + ${COLOR_COUNT} colors)`);
}

/** Color for a cell. Unknown ids fall back to the empty color instead of crashing the board. */
export function colorFor(color: ColorId): string {
  return blockColors[color] ?? blockColors[0];
}

export const colors = {
  background: '#151829',
  boardBackground: '#1D2135',
  gridLine: '#151829',
  text: '#FFFFFF',
  textMuted: '#9AA0BC',
  accent: '#FFB13B',
  /** Outline of the tray slot picked in tap-to-place debug mode. */
  selected: '#FFFFFF',
} as const;
