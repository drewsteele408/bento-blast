// Reducer that wraps the engine. Actions go in, the engine runs, and the store keeps the
// new state plus the events of the last action so effects (animation, haptics, sound) can react.

import { createGame, GameEvent, GameState, placePiece } from '@/engine';

export type GameStoreState = {
  game: GameState;
  /** Events produced by the most recent action. Empty after newGame/restore or an invalid move. */
  lastEvents: GameEvent[];
};

export type GameAction =
  | { type: 'newGame'; seed: number }
  | { type: 'placePiece'; trayIndex: number; row: number; col: number }
  | { type: 'restore'; game: GameState };

export function initGameStore(seed: number): GameStoreState {
  return { game: createGame(seed), lastEvents: [] };
}

export function gameReducer(state: GameStoreState, action: GameAction): GameStoreState {
  switch (action.type) {
    case 'newGame':
      return initGameStore(action.seed);

    case 'placePiece': {
      const result = placePiece(state.game, action.trayIndex, action.row, action.col);
      // Invalid move: the engine returns the same state object. Return ours unchanged too,
      // so React bails out of the re-render.
      if (result.state === state.game) return state;
      return { game: result.state, lastEvents: result.events };
    }

    case 'restore':
      return { game: action.game, lastEvents: [] };

    default:
      return state;
  }
}
