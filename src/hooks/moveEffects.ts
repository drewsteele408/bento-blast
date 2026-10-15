// What the board effects layer draws after a move, worked out from the move's events: which
// placed cells settle, which cleared cells pop (and in what order), and where the score popup
// and banners go. Pure, so it's tested without animations.

import { BOARD_SIZE, Cell, ColoredCell, ColorId, GameEvent } from '@/engine';

/** Each cleared cell waits this long per cell of distance from the placed piece: a ripple. */
export const CLEAR_STAGGER_MS_PER_CELL = 15;
/** The ripple's longest wait, so a big clear still ends quickly. */
export const CLEAR_STAGGER_MAX_MS = 90;
/** Combo banner shows from this streak on. The first clear of a streak isn't a combo yet. */
export const MIN_COMBO_BANNER = 2;

/** A point on the board in cell units; fractions are between cells. */
export type BoardPoint = { row: number; col: number };

export type MoveEffects = {
  /** Placed cells that stayed on the board, with the piece color. */
  settle: { cells: Cell[]; color: ColorId };
  /** Cleared cells with their color and how long each waits before popping. */
  cleared: (ColoredCell & { delayMs: number })[];
  /** Everything the move scored, the same as the jump in the score. */
  points: number;
  /** Where the "+points" popup is centered; null when nothing cleared. */
  popupAt: BoardPoint | null;
  /** Streak count to show as "Combo ×N" (it matches the score bar); 0 = no banner. */
  combo: number;
  /** Center row of the combo banner, picked to stay clear of the popup. */
  comboRow: number;
  boardCleared: boolean;
};

/** The effects for one move's events, or null if they hold no placement. */
export function moveEffects(events: readonly GameEvent[]): MoveEffects | null {
  const placed = events.find((e) => e.type === 'placed');
  if (!placed) return null;
  const cleared = events.find((e) => e.type === 'cleared');
  const boardClear = events.find((e) => e.type === 'boardCleared');

  const clearedCells = cleared?.cells ?? [];
  const isCleared = new Set(clearedCells.map(key));
  const origin = centerOf(placed.cells);

  const points = placed.points + (cleared?.points ?? 0) + (boardClear?.points ?? 0);
  const combo = cleared && cleared.combo + 1 >= MIN_COMBO_BANNER ? cleared.combo + 1 : 0;

  // A board clear puts its banner in the middle, so the popup moves below it.
  let popupAt: BoardPoint | null = null;
  if (boardClear) popupAt = { row: BOARD_SIZE * 0.7, col: (BOARD_SIZE - 1) / 2 };
  else if (cleared) popupAt = centerOf(clearedCells);

  // The combo banner goes in whichever half of the board the popup isn't in.
  const middle = (BOARD_SIZE - 1) / 2;
  const comboRow = popupAt && popupAt.row < middle ? BOARD_SIZE * 0.7 : BOARD_SIZE * 0.15;

  return {
    settle: { cells: placed.cells.filter((c) => !isCleared.has(key(c))), color: placed.color },
    cleared: clearedCells.map((cell) => ({
      ...cell,
      delayMs: Math.min(
        CLEAR_STAGGER_MAX_MS,
        Math.round(distance(cell, origin) * CLEAR_STAGGER_MS_PER_CELL),
      ),
    })),
    points,
    popupAt,
    combo,
    comboRow,
    boardCleared: boardClear !== undefined,
  };
}

function key({ row, col }: Cell): number {
  return row * BOARD_SIZE + col;
}

function centerOf(cells: readonly Cell[]): BoardPoint {
  const sum = cells.reduce((acc, c) => ({ row: acc.row + c.row, col: acc.col + c.col }), {
    row: 0,
    col: 0,
  });
  return { row: sum.row / cells.length, col: sum.col / cells.length };
}

function distance(a: BoardPoint, b: BoardPoint): number {
  return Math.hypot(a.row - b.row, a.col - b.col);
}
