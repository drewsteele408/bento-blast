// Maps a dragged piece's top-left corner (window coordinates) to the board cell it would land on.
// A worklet, so the drag gesture can call it on the UI thread every frame.

export type BoardLayout = {
  /** Window x of the top-left corner of cell (0, 0). */
  x: number;
  /** Window y of the top-left corner of cell (0, 0). */
  y: number;
  /** Width of one cell, including its share of the grid gap. */
  cellSize: number;
};

/**
 * The cell nearest to the piece's top-left corner, by rounding. The result can be off the
 * board (negative or ≥ 8); `canPlace` rejects those.
 */
export function screenToCell(
  pieceX: number,
  pieceY: number,
  layout: BoardLayout,
): { row: number; col: number } {
  'worklet';
  // `|| 0` turns -0 into 0, so callers can compare with ===.
  return {
    row: Math.round((pieceY - layout.y) / layout.cellSize) || 0,
    col: Math.round((pieceX - layout.x) / layout.cellSize) || 0,
  };
}
