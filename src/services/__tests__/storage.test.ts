import { createGame, GameState, placePiece } from '@/engine';

import {
  clearGame,
  DEFAULT_SETTINGS,
  getBestScore,
  getSettings,
  loadGame,
  saveGame,
  setBestScore,
  setSettings,
  storage,
  STORAGE_KEYS,
} from '../storage';

beforeEach(() => {
  storage.clearAll();
});

/** Plays the first valid spot for each tray piece, scanning the board top-left first. */
function playMoves(state: GameState, count: number): GameState {
  let game = state;
  for (let n = 0; n < count; n++) {
    const next = firstValidMove(game);
    if (!next) break;
    game = next;
  }
  return game;
}

function firstValidMove(game: GameState): GameState | null {
  for (let slot = 0; slot < game.tray.length; slot++) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const { state } = placePiece(game, slot, row, col);
        if (state !== game) return state;
      }
    }
  }
  return null;
}

describe('best score', () => {
  it('is 0 when nothing is saved', () => {
    expect(getBestScore()).toBe(0);
  });

  it('round-trips', () => {
    setBestScore(1234);
    expect(getBestScore()).toBe(1234);
  });

  it('treats a non-number as 0', () => {
    storage.set(STORAGE_KEYS.bestScore, 'lots');
    expect(getBestScore()).toBe(0);
  });
});

describe('saved game', () => {
  it('is null when nothing is saved', () => {
    expect(loadGame()).toBeNull();
  });

  it('saves as { version: 1, state }', () => {
    const game = createGame(5);
    saveGame(game);
    expect(JSON.parse(storage.getString(STORAGE_KEYS.currentGame)!)).toEqual({
      version: 1,
      state: game,
    });
  });

  it('round-trips a game in progress exactly', () => {
    const game = playMoves(createGame(5), 4);
    saveGame(game);
    expect(loadGame()).toEqual(game);
  });

  it('deals the same pieces after a restore as the original game would have', () => {
    // Enough moves to empty the tray at least once, so the RNG state has advanced.
    const midGame = playMoves(createGame(99), 5);
    saveGame(midGame);
    const restored = loadGame()!;

    expect(playMoves(restored, 6)).toEqual(playMoves(midGame, 6));
  });

  it('clearGame removes the save', () => {
    saveGame(createGame(5));
    clearGame();
    expect(loadGame()).toBeNull();
  });

  it.each([
    ['bad JSON', '{not json'],
    ['a non-object', '42'],
    ['a missing version', JSON.stringify({ state: createGame(5) })],
    ['another version', JSON.stringify({ version: 2, state: createGame(5) })],
    ['an invalid state', JSON.stringify({ version: 1, state: { board: [] } })],
    [
      'an unknown shape',
      JSON.stringify({
        version: 1,
        state: { ...createGame(5), tray: [{ shapeId: 'NOPE', color: 1 }, null, null] },
      }),
    ],
    ['a finished game', JSON.stringify({ version: 1, state: { ...createGame(5), isOver: true } })],
  ])('discards %s instead of throwing', (_, json) => {
    storage.set(STORAGE_KEYS.currentGame, json);
    expect(loadGame()).toBeNull();
    expect(storage.contains(STORAGE_KEYS.currentGame)).toBe(false);
  });
});

describe('settings', () => {
  it('defaults to sound and haptics on', () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ sound: true, haptics: true });
  });

  it('round-trips', () => {
    setSettings({ sound: false, haptics: true });
    expect(getSettings()).toEqual({ sound: false, haptics: true });
  });

  it('falls back to defaults for bad JSON and per field for bad values', () => {
    storage.set(STORAGE_KEYS.settings, '{oops');
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);

    storage.set(STORAGE_KEYS.settings, JSON.stringify({ sound: false, haptics: 'yes' }));
    expect(getSettings()).toEqual({ sound: false, haptics: true });
  });
});
