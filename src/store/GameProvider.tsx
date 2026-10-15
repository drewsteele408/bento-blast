// Holds the game store in React state and shares it through two contexts. Components that
// only dispatch (tray, board taps) use the dispatch context, which never changes, so they
// don't re-render on every move.
//
// It also persists the store: on mount it loads the best score and restores the saved game, if
// any; after every move it saves the game, and on game over it clears the save and records a
// beaten best score. It also plays the haptic for each move.

import { createContext, Dispatch, ReactNode, useContext, useEffect, useReducer } from 'react';

import { feedbackForEvents } from '@/services/haptics';
import { clearGame, getBestScore, loadGame, saveGame, setBestScore } from '@/services/storage';

import { GameAction, gameReducer, GameStoreState, initGameStore, selectBest } from './gameReducer';

const GameStateContext = createContext<GameStoreState | null>(null);
const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);

type Props = {
  children: ReactNode;
  /** Seed for the first game when there's no save. Defaults to the clock; tests pass one. */
  initialSeed?: number;
};

export function GameProvider({ children, initialSeed }: Props) {
  // The initializer runs once, so storage and the clock are read only on mount.
  const [state, dispatch] = useReducer(gameReducer, initialSeed, initFromStorage);
  const { game, lastEvents } = state;

  useEffect(() => {
    if (game.isOver) clearGame();
    else saveGame(game);
  }, [game]);

  // While a game runs, its score isn't saved as the best: the saved game still holds it, and the
  // game-over modal needs the best from before the game to award "New best!". It is saved once
  // the game ends, or when a new game folds it into `best`. The store is the source of truth, so
  // a lower value (after Reset best score in Settings) is written too.
  const bestToSave = game.isOver ? selectBest(state) : state.best;
  useEffect(() => {
    if (bestToSave !== getBestScore()) setBestScore(bestToSave);
  }, [bestToSave]);

  // One haptic per move, for the biggest thing that happened. lastEvents is a new array after
  // every action, and empty after newGame/restore, so nothing fires on mount.
  useEffect(() => {
    feedbackForEvents(lastEvents);
  }, [lastEvents]);

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

function initFromStorage(seed: number | undefined): GameStoreState {
  const store = initGameStore(seed ?? Date.now(), getBestScore());
  const saved = loadGame();
  return saved ? gameReducer(store, { type: 'restore', game: saved }) : store;
}
