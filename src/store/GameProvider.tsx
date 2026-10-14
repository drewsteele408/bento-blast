// Holds the game store in React state and shares it through two contexts. Components that
// only dispatch (tray, board taps) use the dispatch context, which never changes, so they
// don't re-render on every move.

import { createContext, Dispatch, ReactNode, useContext, useReducer } from 'react';

import { GameAction, gameReducer, GameStoreState, initGameStore } from './gameReducer';

const GameStateContext = createContext<GameStoreState | null>(null);
const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);

type Props = {
  children: ReactNode;
  /** Seed for the first game. Defaults to the current time; tests pass a fixed one. */
  initialSeed?: number;
};

export function GameProvider({ children, initialSeed }: Props) {
  // The initializer runs once, so the clock is read only for the first game.
  const [state, dispatch] = useReducer(gameReducer, initialSeed, initFromSeed);

  return (
    <GameDispatchContext.Provider value={dispatch}>
      <GameStateContext.Provider value={state}>{children}</GameStateContext.Provider>
    </GameDispatchContext.Provider>
  );
}

export function useGame(): GameStoreState {
  const state = useContext(GameStateContext);
  if (!state) throw new Error('useGame must be used inside <GameProvider>');
  return state;
}

export function useGameDispatch(): Dispatch<GameAction> {
  const dispatch = useContext(GameDispatchContext);
  if (!dispatch) throw new Error('useGameDispatch must be used inside <GameProvider>');
  return dispatch;
}

function initFromSeed(seed: number | undefined): GameStoreState {
  return initGameStore(seed ?? Date.now());
}
