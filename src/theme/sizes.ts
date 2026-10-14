// Layout sizes shared by the board, tray and (in Phase 3) the drag layer.

export const sizes = {
  /** Horizontal space between the screen edge and the board, on each side. */
  boardPadding: 16,
  /** Gap between neighbouring cells, drawn as grid lines. */
  cellGap: 2,
  /** A block is drawn on a grid this many art pixels wide, so it reads as pixel art at any size. */
  blockPixels: 14,
  /** Tray pieces are drawn at this fraction of board scale. */
  trayScale: 0.6,
  /** While dragging, the piece sits this many cells above the finger. */
  dragOffsetCells: 1.5,
  /** Opacity of the ghost a hovering piece draws on the board. */
  ghostOpacity: 0.45,
} as const;
