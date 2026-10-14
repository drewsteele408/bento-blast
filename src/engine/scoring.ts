// Scoring rules (spec "Game rules" §6). Tunable constants live here.

export const POINTS_PER_BLOCK = 1;
export const LINE_POINTS = 10;
export const COMBO_STEP = 0.5;
export const BOARD_CLEAR_BONUS = 300;

export type ScoreInput = {
  /** Blocks in the placed piece. */
  blocks: number;
  /** Rows + columns cleared by this placement. */
  lines: number;
  /**
   * Combo level for this clear: 0 for the first clear in a streak, 1 for the second in a
   * row, and so on. Ignored when `lines` is 0.
   */
  combo: number;
  /** True if the board is completely empty after the clear. */
  boardCleared: boolean;
};

export type ScoreBreakdown = {
  blockPoints: number;
  clearPoints: number;
  bonusPoints: number;
  total: number;
};

/**
 * Block points are never multiplied; only the line-clear score gets the combo multiplier.
 * The board-clear bonus is flat.
 */
export function scoreBreakdown({ blocks, lines, combo, boardCleared }: ScoreInput): ScoreBreakdown {
  const blockPoints = blocks * POINTS_PER_BLOCK;
  const clearPoints =
    lines > 0 ? Math.round(LINE_POINTS * lines * lines * (1 + combo * COMBO_STEP)) : 0;
  const bonusPoints = boardCleared ? BOARD_CLEAR_BONUS : 0;
  return { blockPoints, clearPoints, bonusPoints, total: blockPoints + clearPoints + bonusPoints };
}

/** Total points for one move. */
export function scoreMove(input: ScoreInput): number {
  return scoreBreakdown(input).total;
}
