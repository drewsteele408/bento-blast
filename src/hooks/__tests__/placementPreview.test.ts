import { emptyBoard, idx } from '@/engine';
import { deepFreeze, parseBoard } from '@/engine/debug';

import { placementPreview } from '../placementPreview';

describe('placementPreview', () => {
  it('returns null where the piece does not fit', () => {
    const board = parseBoard([
      '#.......',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ]);
    expect(placementPreview(board, { shapeId: 'I2-h', color: 2 }, 0, 0)).toBeNull();
    // Off the right edge.
    expect(placementPreview(emptyBoard(), { shapeId: 'I2-h', color: 2 }, 0, 7)).toBeNull();
    // Off the top.
    expect(placementPreview(emptyBoard(), { shapeId: 'S1', color: 2 }, -1, 0)).toBeNull();
  });

  it('shows the ghost cells and nothing clearing on an open board', () => {
    const preview = placementPreview(emptyBoard(), { shapeId: 'C3-0', color: 4 }, 2, 3);
    expect(preview?.color).toBe(4);
    // C3-0 is ['##', '#.'].
    expect([...preview!.ghost].sort((a, b) => a - b)).toEqual([19, 20, 27]);
    expect(preview!.clearing.size).toBe(0);
  });

  it('lists every cell of the rows and columns that would clear', () => {
    // Row 0 is missing (0, 7); column 7 is missing (0, 7) too.
    const board = deepFreeze(
      parseBoard([
        '#######.',
        '.......#',
        '.......#',
        '.......#',
        '.......#',
        '.......#',
        '.......#',
        '.......#',
      ]),
    );
    const preview = placementPreview(board, { shapeId: 'S1', color: 3 }, 0, 7);
    expect([...preview!.ghost]).toEqual([idx(0, 7)]);
    // 8 + 8 cells, with (0, 7) shared.
    expect(preview!.clearing.size).toBe(15);
    expect(preview!.clearing.has(idx(0, 0))).toBe(true);
    expect(preview!.clearing.has(idx(7, 7))).toBe(true);
    expect(preview!.clearing.has(idx(1, 0))).toBe(false);
  });
});
