// What the board shows while a piece hovers over it: the ghost of the piece and the cells of
// every row and column it would clear. Preview only; the real move still goes through the store.

import { applyPiece, Board, canPlace, cellsInLines, findFullLines, getShape, idx, Piece, shapeCellsAt } from '@/engine';

export type PlacementPreview = {
  color: Piece['color'];
  /** Board indexes the piece would cover. */
  ghost: ReadonlySet<number>;
  /** Board indexes in rows and columns the move would clear. */
  clearing: ReadonlySet<number>;
};

/** The preview for `piece` with its top-left at (row, col), or null if it doesn't fit there. */
export function placementPreview(
  board: Board,
  piece: Piece,
  row: number,
  col: number,
): PlacementPreview | null {
  const shape = getShape(piece.shapeId);
  if (!canPlace(board, shape, row, col)) return null;

  const placed = applyPiece(board, shape, row, col, piece.color);
  const { rows, cols } = findFullLines(placed);
  return {
    color: piece.color,
    ghost: new Set(shapeCellsAt(shape, row, col).map((c) => idx(c.row, c.col))),
    clearing: new Set(cellsInLines(placed, rows, cols).map((c) => idx(c.row, c.col))),
  };
}
