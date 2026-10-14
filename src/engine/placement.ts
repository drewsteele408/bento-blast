import { Board, Cell, ColorId, idx, isInBounds, Shape } from './types';

/** Board cells a shape would cover with its top-left at (row, col). May be off the board. */
export function shapeCellsAt(shape: Shape, row: number, col: number): Cell[] {
  return shape.cells.map((c) => ({ row: row + c.row, col: col + c.col }));
}

/** True if every cell of the shape lands on the board on an empty cell. */
export function canPlace(board: Board, shape: Shape, row: number, col: number): boolean {
  if (!Number.isInteger(row) || !Number.isInteger(col)) return false;
  return shapeCellsAt(shape, row, col).every(
    (c) => isInBounds(c.row, c.col) && board[idx(c.row, c.col)] === 0,
  );
}

/**
 * Returns a new board with the shape placed in `color`. Callers must check `canPlace` first;
 * an invalid placement throws, because it means a bug in the caller.
 */
export function applyPiece(
  board: Board,
  shape: Shape,
  row: number,
  col: number,
  color: ColorId,
): Board {
  if (!canPlace(board, shape, row, col)) {
    throw new Error(`applyPiece: ${shape.id} does not fit at ${row},${col}`);
  }
  const next = board.slice();
  for (const c of shapeCellsAt(shape, row, col)) next[idx(c.row, c.col)] = color;
  return next;
}
