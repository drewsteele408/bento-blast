// Validation for game states that come from outside the engine (e.g. a saved game loaded from
// storage). Lets callers discard corrupt data instead of crashing later in placePiece/getShape,
// or loading a game that can't be played or ended. Pure: never mutates or throws.

import { hasAnyValidMove } from './game';
import { hasShape } from './pieces';
import { CELL_COUNT, COLOR_COUNT, GameState, TRAY_SIZE } from './types';

/** RNG states are 32-bit unsigned integers (see seedToState in rng.ts). */
const MAX_RNG_STATE = 0xffffffff;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function isNonNegativeSafeInt(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isValidPiece(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.shapeId === 'string' &&
    hasShape(value.shapeId) &&
    isIntInRange(value.color, 1, COLOR_COUNT)
  );
}

/**
 * True if `value` is a well-formed GameState that the engine can safely play on, and whose
 * `isOver` agrees with the board and tray (so a game that can't move is never "in progress").
 */
export function isValidGameState(value: unknown): value is GameState {
  if (!isRecord(value)) return false;
  const { board, tray, score, combo, moves, isOver, seed, rngState } = value;
  // Array.from turns holes in sparse arrays into undefined, which `every` would skip.
  const wellFormed =
    Array.isArray(board) &&
    board.length === CELL_COUNT &&
    Array.from(board).every((cell) => isIntInRange(cell, 0, COLOR_COUNT)) &&
    Array.isArray(tray) &&
    tray.length === TRAY_SIZE &&
    Array.from(tray).every((slot) => slot === null || isValidPiece(slot)) &&
    isNonNegativeSafeInt(score) &&
    isNonNegativeSafeInt(combo) &&
    isNonNegativeSafeInt(moves) &&
    typeof isOver === 'boolean' &&
    typeof seed === 'number' &&
    Number.isFinite(seed) &&
    isIntInRange(rngState, 0, MAX_RNG_STATE);
  // Only now is it safe to look up shapes. This also rejects an all-empty tray marked as not
  // over: the engine deals as soon as the tray empties, so play could never continue.
  return wellFormed && isOver === !hasAnyValidMove(board, tray);
}
