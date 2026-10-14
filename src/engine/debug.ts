// Helpers for tests and debugging: build boards from text and print them back.
// Pure TypeScript, safe to use from the app too (e.g. dev-only scenarios).

import { BOARD_SIZE, Board, CELL_COUNT, emptyBoard, idx } from './types';

/**
 * Builds a board from 8 strings of 8 characters. `.` is empty, `1`-`9` is that color,
 * and `#` is color 1. Example: `parseBoard(['########', ...])`.
 */
export function parseBoard(rows: readonly string[]): Board {
  if (rows.length !== BOARD_SIZE || rows.some((r) => r.length !== BOARD_SIZE)) {
    throw new Error(`parseBoard needs ${BOARD_SIZE} rows of ${BOARD_SIZE} characters`);
  }
  const board = emptyBoard();
  rows.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      if (ch === '.') return;
      const color = ch === '#' ? 1 : Number(ch);
      if (!Number.isInteger(color) || color < 1) {
        throw new Error(`parseBoard: bad character '${ch}' at ${row},${col}`);
      }
      board[idx(row, col)] = color;
    });
  });
  return board;
}

/** Prints a board as 8 lines, using the same characters as `parseBoard`. */
export function formatBoard(board: Board): string {
  if (board.length !== CELL_COUNT) throw new Error('formatBoard: board must have 64 cells');
  const lines: string[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    let line = '';
    for (let col = 0; col < BOARD_SIZE; col++) {
      const color = board[idx(row, col)];
      line += color === 0 ? '.' : String(color);
    }
    lines.push(line);
  }
  return lines.join('\n');
}

/** Recursively freezes an object so tests fail loudly if engine code mutates it. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}
