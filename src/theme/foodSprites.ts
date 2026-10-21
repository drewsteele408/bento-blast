// Food pixel art for the blocks: one 10×10 sprite per block color, drawn inside the block's
// 14×14 frame, 2 art pixels in from each edge.
//
// Each sprite is a grid of letters, one per art pixel: D/B/L are the block's own ramp
// (dark/base/light), the other letters are shared accent colors, and '.' lets the dark
// compartment show through. At load, each sprite is merged into a few rectangles, so a block
// draws about 20–35 Views instead of 100.

import { COLOR_COUNT, ColorId } from '@/engine';

import { blockRamps, Ramp } from './colors';

/** A sprite is this many art pixels wide and tall. */
export const FOOD_PIXELS = 10;

/** Colors shared by every food, on top of each block's own D/B/L ramp. */
const accents: Readonly<Record<string, string>> = {
  G: '#5DB84A', // leaf green
  g: '#2E6E2C', // leaf green, dark
  N: '#1E2A22', // nori
  n: '#3A4A3E', // nori shine
  Y: '#FFE3A0', // sweet potato flesh, flower center
  y: '#E0B860', // sweet potato speck
  w: '#FFF8E0', // sweet potato shine
};

/** Sprites indexed by `ColorId`. Index 0 is an empty cell, which has no food. */
export const foodGrids: readonly (readonly string[])[] = [
  [],
  // 1 umeboshi
  [
    '..........',
    '...DDDD...',
    '..DBBBBD..',
    '.DBLLBBBD.',
    '.DBLBBBBD.',
    '.DBBBBBBD.',
    '.DBBBBBDD.',
    '..DBBBDD..',
    '...DDDD...',
    '..........',
  ],
  // 2 carrot
  [
    '.......GG.',
    '......GGg.',
    '.....DDg..',
    '....DLBD..',
    '...DLBBD..',
    '...DBBD...',
    '..DLBBD...',
    '..DBBD....',
    '.DBD......',
    '.DD.......',
  ],
  // 3 tamagoyaki
  [
    '..........',
    '.DDDDDDDD.',
    'DLLLLLLLLD',
    'DLBBBBBBBD',
    'DLBDDDDBBD',
    'DLBDLLDBBD',
    'DLBDBBBBBD',
    'DLBDDDDDBD',
    '.DDDDDDDD.',
    '..........',
  ],
  // 4 broccoli
  [
    '.DD.DD.DD.',
    'DLLDLLDLBD',
    'DLBBLBBBBD',
    'DBBBBBBBBD',
    '.DBBDBBBD.',
    '..DDBBDD..',
    '...DLBD...',
    '...DLBD...',
    '...DLBD...',
    '...DDDD...',
  ],
  // 5 onigiri
  [
    '....DD....',
    '...DLLD...',
    '..DLLLBD..',
    '..DLLBBD..',
    '.DLLBBBBD.',
    '.DLBBBBBD.',
    'DLBNNNNBBD',
    'DBBNnNNBBD',
    'DBBNNNNBBD',
    '.DDNNNNDD.',
  ],
  // 6 sweet potato
  [
    '..........',
    '..DDDDDD..',
    '.DBBBBBBD.',
    'DBYwYYYYBD',
    'DBYYYYYYBD',
    'DBYYYYyYBD',
    'DBYyYYYYBD',
    '.DBBBBBBD.',
    '..DDDDDD..',
    '..........',
  ],
  // 7 sakura
  [
    '...DD.DD..',
    '..DLLDLBD.',
    'DDDLBDBBDD',
    'DLLBBBBBLD',
    '.DBBYYBBD.',
    '.DBBYYBBD.',
    'DLBBBBBBBD',
    'DDBBDDBBDD',
    '..DBD.DBD.',
    '...D...D..',
  ],
];

/** One solid rectangle of a sprite, in art pixels from the sprite's top-left corner. */
export type SpriteRect = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: string;
};

/** The color a sprite letter stands for in a block of the given ramp; undefined if unknown. */
function colorOf(letter: string, ramp: Ramp): string | undefined {
  if (letter === 'D') return ramp.dark;
  if (letter === 'B') return ramp.base;
  if (letter === 'L') return ramp.light;
  return accents[letter];
}

/**
 * Merges a sprite's pixels into solid rectangles of one color each, skipping '.'. Greedy: from
 * each pixel not yet covered, grow right, then down while the whole run still matches.
 */
export function mergeRects(
  grid: readonly string[],
  colorFor: (letter: string) => string,
): SpriteRect[] {
  const height = grid.length;
  const width = height ? grid[0].length : 0;
  const covered = grid.map((row) => [...row].map((letter) => letter === '.'));
  const matches = (x: number, y: number, letter: string) => !covered[y][x] && grid[y][x] === letter;
  const rects: SpriteRect[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (covered[y][x]) continue;
      const letter = grid[y][x];
      let w = 1;
      while (x + w < width && matches(x + w, y, letter)) w++;
      let h = 1;
      while (y + h < height && [...Array(w).keys()].every((i) => matches(x + i, y + h, letter)))
        h++;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) covered[y + j][x + i] = true;
      rects.push({ x, y, w, h, color: colorFor(letter) });
    }
  }
  return rects;
}

if (foodGrids.length !== COLOR_COUNT + 1) {
  throw new Error(`foodGrids needs ${COLOR_COUNT + 1} entries (empty + ${COLOR_COUNT} colors)`);
}

/** Each food sprite as rectangles, indexed by `ColorId`. Empty cells have none. */
export const foodSprites: readonly (readonly SpriteRect[])[] = foodGrids.map((grid, id) => {
  if (id === 0) return [];
  if (grid.length !== FOOD_PIXELS || grid.some((row) => row.length !== FOOD_PIXELS)) {
    throw new Error(`Food sprite ${id} must be ${FOOD_PIXELS}×${FOOD_PIXELS}`);
  }
  return mergeRects(grid, (letter) => {
    const color = colorOf(letter, blockRamps[id]);
    if (!color) throw new Error(`Food sprite ${id} uses unknown letter '${letter}'`);
    return color;
  });
});

/** The food drawn on a block. Unknown ids get none instead of crashing the board. */
export function spriteFor(color: ColorId): readonly SpriteRect[] {
  return foodSprites[color] ?? [];
}
