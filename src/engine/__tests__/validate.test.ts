import { deepFreeze } from '../debug';
import { createGame, hasAnyValidMove, isValidMove, placePiece } from '../game';
import { BOARD_SIZE, GameState, TRAY_SIZE } from '../types';
import { isValidGameState } from '../validate';

/** Plays the first valid move found (scanning tray slots, then cells). */
function playFirstValidMove(state: GameState): GameState {
  for (let t = 0; t < TRAY_SIZE; t++) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (isValidMove(state, t, row, col)) return placePiece(state, t, row, col).state;
      }
    }
  }
  throw new Error('no valid move');
}

const fresh = (): GameState => deepFreeze(createGame(12345));

/** Returns a frozen copy of a fresh game with the given fields overridden. */
function withFields(fields: Record<string, unknown>): unknown {
  return deepFreeze({ ...createGame(12345), ...fields });
}

/** Returns a frozen copy of a fresh game with `key` removed. */
function without(key: keyof GameState): unknown {
  const copy: Record<string, unknown> = { ...createGame(12345) };
  delete copy[key];
  return deepFreeze(copy);
}

describe('isValidGameState: valid states', () => {
  it('accepts a fresh game', () => {
    expect(isValidGameState(fresh())).toBe(true);
  });

  it('accepts a game after a few moves', () => {
    let state = fresh();
    for (let i = 0; i < 3; i++) state = deepFreeze(playFirstValidMove(state));
    expect(state.moves).toBe(3);
    expect(isValidGameState(state)).toBe(true);
  });

  it('accepts a JSON round-tripped game', () => {
    let state = fresh();
    state = playFirstValidMove(state);
    const restored = deepFreeze(JSON.parse(JSON.stringify(state)));
    expect(isValidGameState(restored)).toBe(true);
  });

  it('accepts extra unknown keys', () => {
    expect(isValidGameState(withFields({ extra: 'hello' }))).toBe(true);
  });

  it('accepts a tray with placed (null) slots', () => {
    const tray = [null, null, { shapeId: 'S1', color: 7 }];
    expect(isValidGameState(withFields({ tray }))).toBe(true);
  });

  it('accepts rngState at the 32-bit bounds', () => {
    expect(isValidGameState(withFields({ rngState: 0 }))).toBe(true);
    expect(isValidGameState(withFields({ rngState: 4294967295 }))).toBe(true);
  });

  it('does not mutate its input', () => {
    const state = fresh();
    const before = JSON.stringify(state);
    isValidGameState(state);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('isValidGameState: invalid values', () => {
  it('rejects non-objects', () => {
    expect(isValidGameState(null)).toBe(false);
    expect(isValidGameState(undefined)).toBe(false);
    expect(isValidGameState(42)).toBe(false);
    expect(isValidGameState('state')).toBe(false);
    expect(isValidGameState([])).toBe(false);
    expect(isValidGameState(deepFreeze([fresh()]))).toBe(false);
  });

  it.each(['board', 'tray', 'score', 'combo', 'moves', 'isOver', 'seed', 'rngState'] as const)(
    'rejects a state missing %s',
    (key) => {
      expect(isValidGameState(without(key))).toBe(false);
    },
  );

  it('rejects a board of the wrong length or type', () => {
    expect(isValidGameState(withFields({ board: new Array(63).fill(0) }))).toBe(false);
    expect(isValidGameState(withFields({ board: new Array(65).fill(0) }))).toBe(false);
    expect(isValidGameState(withFields({ board: 'nope' }))).toBe(false);
  });

  it.each([-1, 8, 1.5, NaN, '1', null])('rejects a board cell of %p', (bad) => {
    const board: unknown[] = new Array(64).fill(0);
    board[10] = bad;
    expect(isValidGameState(withFields({ board }))).toBe(false);
  });

  it('accepts every board color 0..7', () => {
    const board = Array.from({ length: 64 }, (_, i) => i % 8);
    // Only column 0 is empty, so isOver depends on the tray; keep it consistent.
    const isOver = !hasAnyValidMove(board, createGame(12345).tray);
    expect(isValidGameState(withFields({ board, isOver }))).toBe(true);
  });

  it('rejects a tray of the wrong length or type', () => {
    const piece = { shapeId: 'S1', color: 1 };
    expect(isValidGameState(withFields({ tray: [piece, piece] }))).toBe(false);
    expect(isValidGameState(withFields({ tray: [piece, piece, piece, piece] }))).toBe(false);
    expect(isValidGameState(withFields({ tray: {} }))).toBe(false);
  });

  it('rejects an unknown or non-string shapeId', () => {
    expect(
      isValidGameState(withFields({ tray: [null, null, { shapeId: 'NOPE', color: 1 }] })),
    ).toBe(false);
    expect(isValidGameState(withFields({ tray: [null, null, { shapeId: 5, color: 1 }] }))).toBe(
      false,
    );
    expect(isValidGameState(withFields({ tray: [null, null, { color: 1 }] }))).toBe(false);
  });

  it.each([0, 8, 1.5, '1', undefined])('rejects a tray piece color of %p', (color) => {
    const tray = [null, null, { shapeId: 'S1', color }];
    expect(isValidGameState(withFields({ tray }))).toBe(false);
  });

  it('rejects a non-object tray entry', () => {
    expect(isValidGameState(withFields({ tray: [null, null, 'S1'] }))).toBe(false);
    expect(isValidGameState(withFields({ tray: [null, null, []] }))).toBe(false);
  });

  it.each(['score', 'combo', 'moves'])('rejects a bad %s', (key) => {
    for (const bad of [-1, 1.5, NaN, Infinity, 2 ** 53, '3', null]) {
      expect(isValidGameState(withFields({ [key]: bad }))).toBe(false);
    }
  });

  it('rejects a non-boolean isOver', () => {
    expect(isValidGameState(withFields({ isOver: 0 }))).toBe(false);
    expect(isValidGameState(withFields({ isOver: 'false' }))).toBe(false);
  });

  it.each([NaN, Infinity, -Infinity, '1', null])('rejects a seed of %p', (seed) => {
    expect(isValidGameState(withFields({ seed }))).toBe(false);
  });

  it.each([-1, 4294967296, 1.5, NaN, '1', null])('rejects an rngState of %p', (rngState) => {
    expect(isValidGameState(withFields({ rngState }))).toBe(false);
  });
});

describe('isValidGameState: consistency', () => {
  /** Every cell filled with a checkerboard of colors 1 and 2, so no line is empty. */
  const fullBoard = () => Array.from({ length: 64 }, (_, i) => 1 + (i % 2));

  it('rejects a game marked not over when no tray piece fits', () => {
    expect(isValidGameState(withFields({ board: fullBoard(), isOver: false }))).toBe(false);
  });

  it('accepts the same game marked over', () => {
    expect(isValidGameState(withFields({ board: fullBoard(), isOver: true }))).toBe(true);
  });

  it('rejects a game marked over that still has a move', () => {
    expect(isValidGameState(withFields({ isOver: true }))).toBe(false);
  });

  it('rejects an all-empty tray', () => {
    expect(isValidGameState(withFields({ tray: [null, null, null], isOver: false }))).toBe(false);
  });

  it('rejects sparse board and tray arrays', () => {
    expect(isValidGameState(withFields({ board: new Array(64) }))).toBe(false);
    const sparseTray = new Array(3);
    sparseTray[2] = createGame(12345).tray[0];
    expect(isValidGameState(withFields({ tray: sparseTray }))).toBe(false);
  });

  it('rejects shape ids that are Object.prototype keys', () => {
    for (const shapeId of ['__proto__', 'toString', 'constructor']) {
      expect(isValidGameState(withFields({ tray: [{ shapeId, color: 1 }, null, null] }))).toBe(
        false,
      );
    }
  });
});
