import { BOARD_SIZE, Board, ColoredCell, idx } from './types';

export type FullLines = { rows: number[]; cols: number[] };

/** Finds every full row and full column at the same time, in one pass over the board. */
export function findFullLines(board: Board): FullLines {
  const rowCounts = new Array<number>(BOARD_SIZE).fill(0);
  const colCounts = new Array<number>(BOARD_SIZE).fill(0);
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[idx(row, col)] !== 0) {
        rowCounts[row]++;
        colCounts[col]++;
      }
    }
  }
  const full = (counts: number[]) =>
    counts.flatMap((count, i) => (count === BOARD_SIZE ? [i] : []));
  return { rows: full(rowCounts), cols: full(colCounts) };
}

/**
 * Every cell in the given rows and columns, with its current color. A cell shared by a row
 * and a column appears once. Sorted top-to-bottom, left-to-right.
 */
export function cellsInLines(board: Board, rows: number[], cols: number[]): ColoredCell[] {
  const rowSet = new Set(rows);
  const colSet = new Set(cols);
  const cells: ColoredCell[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (rowSet.has(row) || colSet.has(col)) {
        cells.push({ row, col, color: board[idx(row, col)] });
      }
    }
  }
  return cells;
}

/** Returns a new board with the given rows and columns emptied. */
export function clearLines(board: Board, rows: number[], cols: number[]): Board {
  const next = board.slice();
  for (const c of cellsInLines(board, rows, cols)) next[idx(c.row, c.col)] = 0;
  return next;
}
