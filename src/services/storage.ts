// Thin wrapper around MMKV for everything the app keeps on the device: best score, the game in
// progress and settings. Reads and writes are synchronous. Bad or outdated data is discarded and
// replaced by a default; nothing here throws on what it finds in storage.
//
// In Jest, `createMMKV` detects the test runner and returns MMKV's built-in in-memory mock.

import { createMMKV } from 'react-native-mmkv';

import { GameState, isValidGameState } from '@/engine';

/** Bump when `GameState` changes shape. Saves with any other version are discarded. */
export const SAVE_VERSION = 1;

export const STORAGE_KEYS = {
  bestScore: 'bestScore',
  currentGame: 'currentGame',
  settings: 'settings',
} as const;

export type Settings = {
  sound: boolean;
  haptics: boolean;
};

export const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true };

/** The MMKV instance. App code uses the functions below; tests use it to plant bad data. */
export const storage = createMMKV({ id: 'bento-blast' });

// --- Best score ---

export function getBestScore(): number {
  const best = storage.getNumber(STORAGE_KEYS.bestScore);
  return best !== undefined && Number.isFinite(best) && best > 0 ? best : 0;
}

export function setBestScore(score: number): void {
  storage.set(STORAGE_KEYS.bestScore, score);
}

// --- Game in progress ---

type SavedGame = { version: number; state: GameState };

export function saveGame(state: GameState): void {
  const saved: SavedGame = { version: SAVE_VERSION, state };
  storage.set(STORAGE_KEYS.currentGame, JSON.stringify(saved));
}

/**
 * The saved game, or null if there is none. A save that is bad JSON, from another version,
 * invalid, or already over is deleted and treated as none.
 */
export function loadGame(): GameState | null {
  const json = storage.getString(STORAGE_KEYS.currentGame);
  if (json === undefined) return null;

  const saved = parseJson(json);
  if (
    typeof saved === 'object' &&
    saved !== null &&
    'version' in saved &&
    saved.version === SAVE_VERSION &&
    'state' in saved &&
    isValidGameState(saved.state) &&
    !saved.state.isOver
  ) {
    return saved.state;
  }
  clearGame();
  return null;
}

export function clearGame(): void {
  storage.remove(STORAGE_KEYS.currentGame);
}

// --- Settings ---

/** Saved settings, with defaults for anything missing or malformed. */
export function getSettings(): Settings {
  const json = storage.getString(STORAGE_KEYS.settings);
  const saved = json === undefined ? null : parseJson(json);
  if (typeof saved !== 'object' || saved === null) return DEFAULT_SETTINGS;
  const { sound, haptics } = saved as Partial<Record<keyof Settings, unknown>>;
  return {
    sound: typeof sound === 'boolean' ? sound : DEFAULT_SETTINGS.sound,
    haptics: typeof haptics === 'boolean' ? haptics : DEFAULT_SETTINGS.haptics,
  };
}

export function setSettings(settings: Settings): void {
  storage.set(STORAGE_KEYS.settings, JSON.stringify(settings));
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}
