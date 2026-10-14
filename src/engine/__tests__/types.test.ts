import { formatBoard, parseBoard } from '../debug';
import { BOARD_SIZE, CELL_COUNT, emptyBoard, idx, isBoardEmpty, isInBounds } from '../types';

describe('board helpers', () => {
  it('uses an 8x8 board stored as 64 cells', () => {
    expect(BOARD_SIZE).toBe(8);
    expect(CELL_COUNT).toBe(64);
  });

  it('idx maps row/col to a row-major index', () => {
    expect(idx(0, 0)).toBe(0);
    expect(idx(0, 7)).toBe(7);
    expect(idx(1, 0)).toBe(8);
    expect(idx(7, 7)).toBe(63);
  });

  it('emptyBoard returns 64 zeros, a fresh array each call', () => {
    const a = emptyBoard();
    expect(a).toHaveLength(64);
    expect(a.every((c) => c === 0)).toBe(true);
    expect(emptyBoard()).not.toBe(a);
    expect(isBoardEmpty(a)).toBe(true);
  });

  it('isInBounds rejects every edge', () => {
    expect(isInBounds(0, 0)).toBe(true);
    expect(isInBounds(7, 7)).toBe(true);
    expect(isInBounds(-1, 0)).toBe(false);
    expect(isInBounds(0, -1)).toBe(false);
    expect(isInBounds(8, 0)).toBe(false);
    expect(isInBounds(0, 8)).toBe(false);
  });
});

describe('parseBoard / formatBoard', () => {
  const rows = [
    '3.......',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '#######.',
  ];

  it('parses colors and round-trips', () => {
    const board = parseBoard(rows);
    expect(board[idx(0, 0)]).toBe(3);
    expect(board[idx(7, 0)]).toBe(1);
    expect(board[idx(7, 7)]).toBe(0);
    expect(isBoardEmpty(board)).toBe(false);
    expect(formatBoard(board)).toBe(rows.join('\n').replace(/#/g, '1'));
  });

  it('rejects malformed input', () => {
    expect(() => parseBoard(['........'])).toThrow();
    expect(() => parseBoard([...rows.slice(0, 7), 'x.......'])).toThrow();
  });
});
