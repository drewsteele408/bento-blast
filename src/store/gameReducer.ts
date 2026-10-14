// Reducer that wraps the engine. Actions go in, the engine runs, and the store keeps the
// new state plus the events of the last action so effects (animation, haptics, sound) can react.

import { createGame, GameEvent, GameState, placePiece } from '@/engine';

export type GameStoreState = {
  game: GameState;
  /** Events produced by the most recent action. Empty after newGame/restore or an invalid move. */
  lastEvents: GameEvent[];
  /**
   * Best score of the games before this one. The current game's score isn't folded in until a
   * new game starts, so "did this game beat the best?" stays answerable; use `selectBest` to
   * show the best including the current game.
   */
  best: number;
};

export type GameAction =
  | { type: 'newGame'; seed: number }
  | { type: 'placePiece'; trayIndex: number; row: number; col: number }
  | { type: 'restore'; game: GameState };

export function initGameStore(seed: number, best = 0): GameStoreState {
  return { game: createGame(seed), lastEvents: [], best };
}

export function gameReducer(state: GameStoreState, action: GameAction): GameStoreState {
  switch (action.type) {
    case 'newGame':
      // The game being left behind (finished or abandoned) counts toward the best.
      return initGameStore(action.seed, selectBest(state));

    case 'placePiece': {
      const result = placePiece(state.game, action.trayIndex, action.row, action.col);
      // Invalid move: the engine returns the same state object. Return ours unchanged too,
      // so React bails out of the re-render.
      if (result.state === state.game) return state;
      return { ...state, game: result.state, lastEvents: result.events };
    }

    case 'restore':
      return { ...state, game: action.game, lastEvents: [] };

    default:
      return state;
  }
}

/** Best score to show: the stored best, or the current score once it's higher. */
export function selectBest(state: GameStoreState): number {
  return Math.max(state.best, state.game.score);
}

/** True when the current game has beaten the best of all earlier games. */
export function selectIsNewBest(state: GameStoreState): boolean {
  return state.game.score > state.best;
}

/** True when there's a game worth continuing: started and not over. */
export function selectHasGameInProgress(state: GameStoreState): boolean {
  return state.game.moves > 0 && !state.game.isOver;
}
