import { COLOR_COUNT } from '@/engine';

import { blockRamps } from '../colors';
import {
  FOOD_PIXELS,
  foodGrids,
  foodSprites,
  mergeRects,
  SpriteRect,
  spriteFor,
} from '../foodSprites';

/** Paints rectangles back onto a grid of colors ('' = nothing), failing on any overlap. */
function paint(rects: readonly SpriteRect[], size: number): string[][] {
  const out = Array.from({ length: size }, () => Array<string>(size).fill(''));
  for (const { x, y, w, h, color } of rects) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        expect(out[y + j][x + i]).toBe('');
        out[y + j][x + i] = color;
      }
    }
  }
  return out;
}

describe('mergeRects', () => {
  it('merges a solid block into one rectangle', () => {
    expect(mergeRects(['DD', 'DD'], () => '#000')).toEqual([
      { x: 0, y: 0, w: 2, h: 2, color: '#000' },
    ]);
  });

  it('skips transparent pixels and splits different letters', () => {
    const rects = mergeRects(['D.', 'BB'], (letter) => letter);
    expect(rects).toEqual([
      { x: 0, y: 0, w: 1, h: 1, color: 'D' },
      { x: 0, y: 1, w: 2, h: 1, color: 'B' },
    ]);
  });
});

describe('foodSprites', () => {
  it('has a food for every block color and none for an empty cell', () => {
    expect(foodSprites).toHaveLength(COLOR_COUNT + 1);
    expect(foodSprites[0]).toEqual([]);
    for (let id = 1; id <= COLOR_COUNT; id++) expect(foodSprites[id].length).toBeGreaterThan(0);
  });

  it("covers exactly each sprite's pixels, in the block's own ramp", () => {
    for (let id = 1; id <= COLOR_COUNT; id++) {
      const painted = paint(foodSprites[id], FOOD_PIXELS);
      const ramp = blockRamps[id];
      foodGrids[id].forEach((row, y) =>
        [...row].forEach((letter, x) => {
          if (letter === '.') expect(painted[y][x]).toBe('');
          else expect(painted[y][x]).not.toBe('');
          if (letter === 'D') expect(painted[y][x]).toBe(ramp.dark);
          if (letter === 'B') expect(painted[y][x]).toBe(ramp.base);
          if (letter === 'L') expect(painted[y][x]).toBe(ramp.light);
        }),
      );
    }
  });

  it('falls back to no food for an unknown color', () => {
    expect(spriteFor(99 as never)).toEqual([]);
  });
});
