// The game loop: createGame and placePiece. Input state + action → new state + events.

import { cellsInLines, clearLines, findFullLines } from './clearing';
import { dealTray } from './dealer';
import { getShape } from './pieces';
import { applyPiece, canPlace, shapeCellsAt } from './placement';
import { seedToState } from './rng';
import { scoreBreakdown } from './scoring';
import {
  BOARD_SIZE,
  Board,
  emptyBoard,
  GameEvent,
  GameState,
  isBoardEmpty,
  Tray,
  TRAY_SIZE,
} from './types';

export type MoveResult = { state: GameState; events: GameEvent[] };

/**
 * Starts a new game. The engine never reads the clock or Math.random, so the caller
 * supplies the seed (e.g. `Date.now()` for a normal game, `20261014` for a daily challenge).
 */
export function createGame(seed: number): GameState {
  const board = emptyBoard();
  const { tray, rngState } = dealTray(seedToState(seed));
  return {
    board,
    tray,
    score: 0,
    combo: 0,
    isOver: !hasAnyValidMove(board, tray),
    seed,
    rngState,
    moves: 0,
  };
}

/** True if at least one remaining tray piece fits somewhere on the board. */
export function hasAnyValidMove(board: Board, tray: Tray): boolean {
  return tray.some((piece) => {
    if (!piece) return false;
    const shape = getShape(piece.shapeId);
    for (let row = 0; row <= BOARD_SIZE - shape.height; row++) {
      for (let col = 0; col <= BOARD_SIZE - shape.width; col++) {
        if (canPlace(board, shape, row, col)) return true;
      }
    }
    return false;
  });
}

/** True if the tray piece at `trayIndex` can go at (row, col) right now. */
export function isValidMove(
  state: GameState,
  trayIndex: number,
  row: number,
  col: number,
): boolean {
  if (state.isOver) return false;
  if (!Number.isInteger(trayIndex) || trayIndex < 0 || trayIndex >= TRAY_SIZE) return false;
  const piece = state.tray[trayIndex];
  if (!piece) return false;
  return canPlace(state.board, getShape(piece.shapeId), row, col);
}

/**
 * Places a tray piece with its top-left at (row, col).
 *
 * Order: validate → place → find lines → clear → score / update combo → board-clear bonus →
 * deal if the tray is empty → game-over check. Events are emitted in the same order.
 *
 * An invalid move (bad index, empty slot, doesn't fit, game already over) returns the same
 * state object and no events; it does not throw. Corrupt state (e.g. an unknown shape id
 * from a bad save) does throw, so restore code should validate saved games with `hasShape`.
 */
export function placePiece(
  state: GameState,
  trayIndex: number,
  row: number,
  col: number,
): MoveResult {
  // 1. Validate
  if (!isValidMove(state, trayIndex, row, col)) return { state, events: [] };
  const piece = state.tray[trayIndex]!;
  const shape = getShape(piece.shapeId);
  const events: GameEvent[] = [];

  // 2. Place
  const placedBoard = applyPiece(state.board, shape, row, col, piece.color);
  let tray: Tray = state.tray.map((p, i) => (i === trayIndex ? null : p));

  // 3. Find lines
  const { rows, cols } = findFullLines(placedBoard);
  const lines = rows.length + cols.length;

  // 4. Clear
  const board = lines > 0 ? clearLines(placedBoard, rows, cols) : placedBoard;

  // 5. Score and update the combo. The combo level for this clear is the streak so far.
  const boardCleared = lines > 0 && isBoardEmpty(board);
  const points = scoreBreakdown({
    blocks: shape.cells.length,
    lines,
    combo: state.combo,
    boardCleared,
  });
  const combo = lines > 0 ? state.combo + 1 : 0;

  events.push({
    type: 'placed',
    trayIndex,
    cells: shapeCellsAt(shape, row, col),
    color: piece.color,
    points: points.blockPoints,
  });
  if (lines > 0) {
    events.push({
      type: 'cleared',
      rows,
      cols,
      cells: cellsInLines(placedBoard, rows, cols),
      points: points.clearPoints,
      combo: state.combo,
    });
  }

  // 6. Board-clear bonus
  if (boardCleared) events.push({ type: 'boardCleared', points: points.bonusPoints });

  // 7. Deal if the tray is empty
  let rngState = state.rngState;
  if (tray.every((p) => p === null)) {
    const dealt = dealTray(rngState);
    tray = dealt.tray;
    rngState = dealt.rngState;
    events.push({ type: 'dealt', tray });
  }

  // 8. Game-over check
  const score = state.score + points.total;
  const isOver = !hasAnyValidMove(board, tray);
  if (isOver) events.push({ type: 'gameOver', finalScore: score });

  return {
    state: {
      board,
      tray,
      score,
      combo,
      isOver,
      seed: state.seed,
      rngState,
      moves: state.moves + 1,
    },
    events,
  };
}
