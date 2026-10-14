import { BoardLayout, screenToCell } from '../screenToCell';

const layout: BoardLayout = { x: 20, y: 100, cellSize: 40 };

describe('screenToCell', () => {
  it('maps a corner exactly on a cell to that cell', () => {
    expect(screenToCell(20, 100, layout)).toEqual({ row: 0, col: 0 });
    expect(screenToCell(20 + 3 * 40, 100 + 5 * 40, layout)).toEqual({ row: 5, col: 3 });
  });

  it('rounds to the nearest cell', () => {
    // 19px right of col 2 (less than half a cell) → col 2; 21px → col 3.
    expect(screenToCell(20 + 80 + 19, 100, layout)).toEqual({ row: 0, col: 2 });
    expect(screenToCell(20 + 80 + 21, 100, layout)).toEqual({ row: 0, col: 3 });
    // 25px below row 6 → row 7.
    expect(screenToCell(20, 100 + 240 + 25, layout)).toEqual({ row: 7, col: 0 });
  });

  it('rounds a corner slightly up-left of the board onto cell (0, 0)', () => {
    expect(screenToCell(5, 90, layout)).toEqual({ row: 0, col: 0 });
    expect(Object.is(screenToCell(5, 90, layout).row, 0)).toBe(true); // not -0
  });

  it('returns off-board cells when the piece is outside the board', () => {
    expect(screenToCell(-60, -20, layout)).toEqual({ row: -3, col: -2 });
    expect(screenToCell(20 + 9 * 40, 100 + 12 * 40, layout)).toEqual({ row: 12, col: 9 });
  });
});
