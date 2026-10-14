import { cellsInLines, clearLines, findFullLines } from '../clearing';
import { deepFreeze, formatBoard, parseBoard } from '../debug';
import { emptyBoard } from '../types';

describe('findFullLines', () => {
  it('finds nothing on an empty board', () => {
    expect(findFullLines(emptyBoard())).toEqual({ rows: [], cols: [] });
  });

  it('ignores an almost-full row', () => {
    const board = parseBoard([
      '#######.',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ]);
    expect(findFullLines(board)).toEqual({ rows: [], cols: [] });
  });

  it('finds one row', () => {
    const board = parseBoard([
      '........',
      '........',
      '12345671',
      '........',
      '........',
      '........',
      '........',
      '........',
    ]);
    expect(findFullLines(board)).toEqual({ rows: [2], cols: [] });
  });

  it('finds one column', () => {
    const board = parseBoard([
      '.....#..',
      '.....#..',
      '.....#..',
      '.....#..',
      '.....#..',
      '.....#..',
      '.....#..',
      '.....#..',
    ]);
    expect(findFullLines(board)).toEqual({ rows: [], cols: [5] });
  });

  it('finds a row and a column at the same time', () => {
    const board = parseBoard([
      '...#....',
      '...#....',
      '...#....',
      '########',
      '...#....',
      '...#....',
      '...#....',
      '...#....',
    ]);
    expect(findFullLines(board)).toEqual({ rows: [3], cols: [3] });
  });

  it('finds several rows plus several columns', () => {
    const board = parseBoard([
      '########',
      '#.#....#',
      '########',
      '#.#....#',
      '#.#....#',
      '#.#....#',
      '#.#....#',
      '#.#....#',
    ]);
    expect(findFullLines(board)).toEqual({ rows: [0, 2], cols: [0, 2, 7] });
  });
});

describe('clearLines', () => {
  it('clears one row and keeps everything else', () => {
    const board = deepFreeze(
      parseBoard([
        '........',
        '..3.....',
        '########',
        '........',
        '........',
        '........',
        '........',
        '.......5',
      ]),
    );
    expect(formatBoard(clearLines(board, [2], []))).toBe(
      [
        '........',
        '..3.....',
        '........',
        '........',
        '........',
        '........',
        '........',
        '.......5',
      ].join('\n'),
    );
  });

  it('clears a row and a column together, counting the shared cell once', () => {
    const board = deepFreeze(
      parseBoard([
        '...2....',
        '...2....',
        '...2....',
        '33333333',
        '...2...4',
        '...2....',
        '...2....',
        '...2....',
      ]),
    );
    const cells = cellsInLines(board, [3], [3]);
    expect(cells).toHaveLength(15); // 8 + 8 - 1 shared
    expect(cells.find((c) => c.row === 3 && c.col === 3)).toEqual({ row: 3, col: 3, color: 3 });
    expect(formatBoard(clearLines(board, [3], [3]))).toBe(
      [
        '........',
        '........',
        '........',
        '........',
        '.......4',
        '........',
        '........',
        '........',
      ].join('\n'),
    );
  });

  it('clears several rows plus several columns', () => {
    const board = deepFreeze(
      parseBoard([
        '########',
        '#.#..5.#',
        '########',
        '#.#....#',
        '#.#....#',
        '#.#....#',
        '#.#....#',
        '#.#....#',
      ]),
    );
    const next = clearLines(board, [0, 2], [0, 2, 7]);
    expect(formatBoard(next)).toBe(
      [
        '........',
        '.....5..',
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
      ].join('\n'),
    );
    // 2 rows * 8 + 3 cols * 8 - 6 shared cells
    expect(cellsInLines(board, [0, 2], [0, 2, 7])).toHaveLength(34);
  });

  it('returns a new array and never changes the input', () => {
    const board = deepFreeze(parseBoard(Array(8).fill('########')));
    const next = clearLines(board, [0], []);
    expect(next).not.toBe(board);
    expect(board.every((c) => c === 1)).toBe(true);
  });

  it('records the color of each cleared cell', () => {
    const board = parseBoard([
      '12345671',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ]);
    expect(cellsInLines(board, [0], []).map((c) => c.color)).toEqual([1, 2, 3, 4, 5, 6, 7, 1]);
  });
});
