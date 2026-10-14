import { deepFreeze, formatBoard, parseBoard } from '../debug';
import { getShape } from '../pieces';
import { applyPiece, canPlace, shapeCellsAt } from '../placement';
import { emptyBoard } from '../types';

describe('canPlace', () => {
  const empty = deepFreeze(emptyBoard());
  const sq2 = getShape('SQ2');
  const i3h = getShape('I3-h');
  const i3v = getShape('I3-v');

  it('fits anywhere fully inside an empty board', () => {
    expect(canPlace(empty, sq2, 0, 0)).toBe(true);
    expect(canPlace(empty, sq2, 3, 4)).toBe(true);
  });

  it('fits exactly into each corner', () => {
    expect(canPlace(empty, sq2, 0, 0)).toBe(true);
    expect(canPlace(empty, sq2, 0, 6)).toBe(true);
    expect(canPlace(empty, sq2, 6, 0)).toBe(true);
    expect(canPlace(empty, sq2, 6, 6)).toBe(true);
    expect(canPlace(empty, getShape('I5-h'), 7, 3)).toBe(true);
    expect(canPlace(empty, getShape('SQ3'), 5, 5)).toBe(true);
  });

  it.each([
    ['top', -1, 0],
    ['left', 0, -1],
    ['bottom', 7, 0],
    ['right', 0, 7],
    ['far off', 20, 20],
  ])('rejects a piece hanging off the %s edge', (_edge, row, col) => {
    expect(canPlace(empty, sq2, row, col)).toBe(false);
  });

  it('rejects lines that run off the edge by one cell', () => {
    expect(canPlace(empty, i3h, 0, 5)).toBe(true);
    expect(canPlace(empty, i3h, 0, 6)).toBe(false);
    expect(canPlace(empty, i3v, 5, 0)).toBe(true);
    expect(canPlace(empty, i3v, 6, 0)).toBe(false);
  });

  it('checks the actual cells, not the bounding box', () => {
    // L4-270 is "..#" / "###": its top-left bounding cell is empty space.
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
    expect(canPlace(board, getShape('L4-270'), 0, 0)).toBe(true);
  });

  it('rejects overlapping a filled cell', () => {
    const board = parseBoard([
      '........',
      '.#......',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ]);
    expect(canPlace(board, sq2, 0, 0)).toBe(false);
    expect(canPlace(board, sq2, 1, 1)).toBe(false);
    expect(canPlace(board, sq2, 0, 2)).toBe(true);
  });

  it('rejects non-integer positions', () => {
    expect(canPlace(empty, sq2, 0.5, 0)).toBe(false);
    expect(canPlace(empty, sq2, 0, NaN)).toBe(false);
  });
});

describe('applyPiece', () => {
  it('returns a new board with the piece placed, leaving the input untouched', () => {
    const board = deepFreeze(emptyBoard());
    const next = applyPiece(board, getShape('T4-0'), 6, 5, 4);
    expect(next).not.toBe(board);
    expect(formatBoard(next)).toBe(
      [
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
        '.....444',
        '......4.',
      ].join('\n'),
    );
    expect(board.every((c) => c === 0)).toBe(true);
  });

  it('throws on an invalid placement', () => {
    expect(() => applyPiece(emptyBoard(), getShape('SQ2'), 7, 7, 1)).toThrow();
  });
});

describe('shapeCellsAt', () => {
  it('offsets shape cells by the position', () => {
    expect(shapeCellsAt(getShape('I2-h'), 3, 4)).toEqual([
      { row: 3, col: 4 },
      { row: 3, col: 5 },
    ]);
  });
});
