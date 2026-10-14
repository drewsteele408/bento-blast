// Layout sizes shared by the board, tray and (in Phase 3) the drag layer.

export const sizes = {
  /** Horizontal space between the screen edge and the board, on each side. */
  boardPadding: 16,
  /** Gap between neighbouring cells, drawn as grid lines. */
  cellGap: 2,
  /** Corner radius of a block, as a fraction of the cell size. */
  cellRadius: 0.15,
  /** Tray pieces are drawn at this fraction of board scale. */
  trayScale: 0.6,
  /** While dragging, the piece sits this many cells above the finger. */
  dragOffsetCells: 1.5,
} as const;
