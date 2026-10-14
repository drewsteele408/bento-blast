// Core engine types and board helpers. Pure TypeScript: no React imports.

export const BOARD_SIZE = 8;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
export const TRAY_SIZE = 3;
/** Number of piece colors. Valid piece colors are 1..COLOR_COUNT. */
export const COLOR_COUNT = 7;

export type ColorId = number; // 0 = empty, 1..COLOR_COUNT = palette index
export type Board = ColorId[]; // length 64, index = row * 8 + col

export type Cell = { row: number; col: number };
export type ColoredCell = Cell & { color: ColorId };

export type ShapeId = string; // e.g. 'I3-h', 'L4-90', 'SQ3'
export type Shape = {
  id: ShapeId;
  cells: Cell[]; // offsets from the top-left, normalized
  width: number;
  height: number;
  weight: number; // relative chance of being dealt
};

export type Piece = { shapeId: ShapeId; color: ColorId };
export type Tray = (Piece | null)[]; // length 3; null = already placed

export type GameState = {
  board: Board;
  tray: Tray;
  score: number;
  /**
   * Consecutive placements that cleared at least one line. It is also the combo
   * level the *next* clear is scored with: the first clear in a streak uses 0 (×1.0),
   * the second uses 1 (×1.5), and so on. A placement that clears nothing resets it to 0.
   */
  combo: number;
  isOver: boolean;
  /** Starting seed of this game (kept for replays / daily challenges). */
  seed: number;
  /** Current RNG state. Advances after every deal so a restored game deals the same pieces. */
  rngState: number;
  moves: number;
};

export type GameEvent =
  | { type: 'placed'; trayIndex: number; cells: Cell[]; color: ColorId; points: number }
  | {
      type: 'cleared';
      rows: number[];
      cols: number[];
      /** Every cleared cell with the color it had, so the UI can animate it after the engine emptied it. */
      cells: ColoredCell[];
      points: number;
      combo: number;
    }
  | { type: 'boardCleared'; points: number }
  | { type: 'dealt'; tray: Tray }
  | { type: 'gameOver'; finalScore: number };

export function idx(row: number, col: number): number {
  return row * BOARD_SIZE + col;
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function emptyBoard(): Board {
  return new Array<ColorId>(CELL_COUNT).fill(0);
}

export function isBoardEmpty(board: Board): boolean {
  return board.every((color) => color === 0);
}
