import { dealTray } from '../dealer';
import { deepFreeze, formatBoard, parseBoard } from '../debug';
import { createGame, hasAnyValidMove, isValidMove, placePiece } from '../game';
import { getShape } from '../pieces';
import { seedToState } from '../rng';
import { BOARD_SIZE, Board, emptyBoard, GameEvent, GameState, Piece, Tray } from '../types';

const p = (shapeId: string, color = 1): Piece => ({ shapeId, color });

/** A hand-built state for scenario tests. */
function makeState(overrides: Partial<GameState> = {}): GameState {
  return deepFreeze({
    board: emptyBoard(),
    tray: [p('S1'), p('S1'), p('S1')],
    score: 0,
    combo: 0,
    isOver: false,
    seed: 1,
    rngState: seedToState(1),
    moves: 0,
    ...overrides,
  });
}

const types = (events: GameEvent[]) => events.map((e) => e.type);

/** Every empty cell is isolated, so only S1 fits. No row or column is full. */
const CHECKERBOARD: Board = parseBoard([
  '#.#.#.#.',
  '.#.#.#.#',
  '#.#.#.#.',
  '.#.#.#.#',
  '#.#.#.#.',
  '.#.#.#.#',
  '#.#.#.#.',
  '.#.#.#.#',
]);

describe('createGame', () => {
  it('starts with an empty board, a full tray, score 0 and the seed stored', () => {
    const game = createGame(42);
    expect(game.board).toEqual(emptyBoard());
    expect(game.tray).toHaveLength(3);
    expect(game.tray.every((piece) => piece !== null)).toBe(true);
    expect(game).toMatchObject({ score: 0, combo: 0, isOver: false, seed: 42, moves: 0 });
  });

  it('deals from the seed and stores the advanced RNG state', () => {
    const game = createGame(42);
    const expected = dealTray(seedToState(42));
    expect(game.tray).toEqual(expected.tray);
    expect(game.rngState).toBe(expected.rngState);
    expect(game.rngState).not.toBe(seedToState(42));
  });

  it('is repeatable for the same seed and differs for another', () => {
    expect(createGame(42)).toEqual(createGame(42));
    expect(createGame(42).tray).not.toEqual(createGame(43).tray);
  });

  it('is plain JSON-serializable data', () => {
    const game = createGame(42);
    expect(JSON.parse(JSON.stringify(game))).toEqual(game);
  });
});

describe('hasAnyValidMove', () => {
  it('is true on an empty board', () => {
    expect(hasAnyValidMove(emptyBoard(), [p('SQ3'), null, null])).toBe(true);
  });

  it('is false for an empty tray', () => {
    expect(hasAnyValidMove(emptyBoard(), [null, null, null])).toBe(false);
  });

  it('only S1 fits a checkerboard', () => {
    expect(hasAnyValidMove(CHECKERBOARD, [p('S1'), null, null])).toBe(true);
    expect(hasAnyValidMove(CHECKERBOARD, [null, p('I2-h'), p('SQ2')])).toBe(false);
  });

  it('finds a fit in the last possible position (bottom-right corner)', () => {
    const board = parseBoard([
      '########',
      '########',
      '########',
      '########',
      '########',
      '########',
      '######..',
      '######..',
    ]);
    expect(hasAnyValidMove(board, [p('SQ3'), p('I3-h'), p('SQ2')])).toBe(true);
    expect(hasAnyValidMove(board, [p('SQ3'), p('I3-h'), null])).toBe(false);
  });
});

describe('placePiece: invalid moves change nothing', () => {
  const state = makeState({ tray: [p('SQ2'), null, p('S1')] });

  it.each([
    ['negative index', -1, 0, 0],
    ['index past the tray', 3, 0, 0],
    ['fractional index', 0.5, 0, 0],
    ['empty slot', 1, 0, 0],
    ['off the board', 0, 7, 7],
    ['negative position', 0, -1, 0],
    ['fractional position', 0, 0.5, 0],
  ])('%s', (_name, trayIndex, row, col) => {
    const result = placePiece(state, trayIndex, row, col);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
    expect(isValidMove(state, trayIndex, row, col)).toBe(false);
  });

  it('overlapping a filled cell', () => {
    const blocked = makeState({ board: parseBoard(['#.......', ...Array(7).fill('........')]) });
    const result = placePiece(blocked, 0, 0, 0);
    expect(result.state).toBe(blocked);
    expect(result.events).toEqual([]);
  });

  it('game already over', () => {
    const over = makeState({ isOver: true });
    const result = placePiece(over, 0, 0, 0);
    expect(result.state).toBe(over);
    expect(result.events).toEqual([]);
  });
});

describe('placePiece: placing', () => {
  it('places the piece, empties its tray slot and scores 1 per block', () => {
    const state = makeState({ tray: [p('S1'), p('T4-0', 3), p('S1')] });
    const { state: next, events } = placePiece(state, 1, 0, 0);
    expect(formatBoard(next.board).split('\n').slice(0, 2)).toEqual(['333.....', '.3......']);
    expect(next.tray).toEqual([p('S1'), null, p('S1')]);
    expect(next).toMatchObject({ score: 4, combo: 0, moves: 1, isOver: false });
    expect(next.rngState).toBe(state.rngState); // no deal yet
    expect(events).toEqual([
      {
        type: 'placed',
        trayIndex: 1,
        color: 3,
        points: 4,
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 1, col: 1 },
        ],
      },
    ]);
  });

  it('never changes the input state (deep-frozen)', () => {
    const state = makeState({
      board: parseBoard(['#######.', ...Array(7).fill('........')]),
      tray: [p('S1'), null, null],
    });
    const snapshot = JSON.stringify(state);
    expect(() => placePiece(state, 0, 0, 7)).not.toThrow();
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('placePiece: clearing and scoring', () => {
  it('clears a row: 1 block + 10, and reports cleared cells with their colors', () => {
    const state = makeState({
      board: parseBoard(['1234567.', '#.......', ...Array(6).fill('........')]),
    });
    const { state: next, events } = placePiece(state, 0, 0, 7);
    expect(formatBoard(next.board).split('\n')[0]).toBe('........');
    expect(next.score).toBe(11);
    expect(next.combo).toBe(1);
    expect(types(events)).toEqual(['placed', 'cleared']);
    const cleared = events[1];
    expect(cleared).toMatchObject({ type: 'cleared', rows: [0], cols: [], points: 10, combo: 0 });
    if (cleared.type !== 'cleared') throw new Error('expected cleared');
    expect(cleared.cells.map((c) => c.color)).toEqual([1, 2, 3, 4, 5, 6, 7, 1]);
  });

  it('clears a row and a column at once: 2 lines = 40, shared cell once', () => {
    const state = makeState({
      board: parseBoard([
        '...#....',
        '...#....',
        '...#....',
        '###.####',
        '...#....',
        '...#....',
        '...#....',
        '...#...#',
      ]),
    });
    const { state: next, events } = placePiece(state, 0, 3, 3);
    expect(next.score).toBe(1 + 40);
    const cleared = events.find((e) => e.type === 'cleared');
    expect(cleared).toMatchObject({ rows: [3], cols: [3], points: 40 });
    if (cleared?.type !== 'cleared') throw new Error('expected cleared');
    expect(cleared.cells).toHaveLength(15);
    expect(formatBoard(next.board).split('\n')[7]).toBe('.......1');
  });

  it('builds a combo over consecutive clears and resets it after a move with no clear', () => {
    let state = makeState({
      board: parseBoard([
        '#######.',
        '#######.',
        '........',
        '........',
        '........',
        '........',
        '........',
        '.......#',
      ]),
      tray: [p('S1'), p('S1'), p('S1')],
    });

    // First clear in a streak: combo 0 → ×1.0
    let result = placePiece(state, 0, 0, 7);
    expect(result.events.find((e) => e.type === 'cleared')).toMatchObject({ points: 10, combo: 0 });
    expect(result.state).toMatchObject({ score: 11, combo: 1 });
    state = result.state;

    // Second clear in a row: combo 1 → ×1.5
    result = placePiece(state, 1, 1, 7);
    expect(result.events.find((e) => e.type === 'cleared')).toMatchObject({ points: 15, combo: 1 });
    expect(result.state).toMatchObject({ score: 11 + 16, combo: 2 });
    state = result.state;

    // No clear: combo resets to 0
    result = placePiece(state, 2, 4, 4);
    expect(types(result.events)).not.toContain('cleared');
    expect(result.state).toMatchObject({ score: 11 + 16 + 1, combo: 0 });
  });

  it('a clear after a reset starts back at combo 0', () => {
    const state = makeState({
      board: parseBoard(['#######.', ...Array(7).fill('........')]),
      combo: 0,
      tray: [p('S1'), p('S1'), null],
    });
    const afterMiss = placePiece(state, 1, 5, 5).state; // no clear
    const result = placePiece(afterMiss, 0, 0, 7);
    expect(result.events.find((e) => e.type === 'cleared')).toMatchObject({ points: 10, combo: 0 });
  });

  it('applies the combo multiplier only to the clear score, not to blocks', () => {
    const state = makeState({
      board: parseBoard(['#####...', '#.......', ...Array(6).fill('........')]),
      combo: 2, // third clear in a row → ×2.0
      tray: [p('I3-h'), p('S1'), null],
    });
    const { state: next } = placePiece(state, 0, 0, 5);
    expect(next.score).toBe(3 + 20);
    expect(next.combo).toBe(3);
  });

  it('adds the 300 board-clear bonus when the board ends up empty', () => {
    const state = makeState({
      board: parseBoard(['#######.', ...Array(7).fill('........')]),
      tray: [p('S1'), p('S1'), null],
    });
    const { state: next, events } = placePiece(state, 0, 0, 7);
    expect(next.board).toEqual(emptyBoard());
    expect(next.score).toBe(1 + 10 + 300);
    expect(types(events)).toEqual(['placed', 'cleared', 'boardCleared']);
    expect(events[2]).toEqual({ type: 'boardCleared', points: 300 });
  });

  it('gives no board-clear bonus when something is left', () => {
    const state = makeState({
      board: parseBoard(['#######.', '#.......', ...Array(6).fill('........')]),
    });
    const { events } = placePiece(state, 0, 0, 7);
    expect(types(events)).not.toContain('boardCleared');
  });
});

describe('placePiece: dealing', () => {
  it('re-deals after the third placement, from the stored RNG state', () => {
    let state = makeState({ tray: [p('S1'), p('S1'), p('S1')], rngState: 12345 });
    state = placePiece(state, 0, 0, 0).state;
    state = placePiece(state, 1, 2, 2).state;
    expect(state.tray).toEqual([null, null, p('S1')]);
    expect(state.rngState).toBe(12345);

    const { state: next, events } = placePiece(state, 2, 4, 4);
    const expected = dealTray(12345);
    expect(next.tray).toEqual(expected.tray);
    expect(next.rngState).toBe(expected.rngState);
    expect(types(events)).toEqual(['placed', 'dealt']);
    expect(events[1]).toEqual({ type: 'dealt', tray: expected.tray });
  });

  it('does not deal while any piece is left, in any placement order', () => {
    let state = makeState({ tray: [p('S1'), p('S1'), p('S1')] });
    state = placePiece(state, 2, 0, 0).state;
    state = placePiece(state, 0, 1, 1).state;
    expect(state.tray).toEqual([null, p('S1'), null]);
  });

  it('a restored (JSON round-tripped) game deals the same next pieces', () => {
    let state = makeState({ tray: [p('S1'), null, null], rngState: 999 });
    const restored: GameState = JSON.parse(JSON.stringify(state));
    state = placePiece(state, 0, 0, 0).state;
    const fromRestored = placePiece(restored, 0, 0, 0).state;
    expect(fromRestored).toEqual(state);
  });

  it('emits events in order when a move clears, empties the board and re-deals', () => {
    const state = makeState({
      board: parseBoard(['#######.', ...Array(7).fill('........')]),
      tray: [null, p('S1'), null],
    });
    const { events } = placePiece(state, 1, 0, 7);
    expect(types(events)).toEqual(['placed', 'cleared', 'boardCleared', 'dealt']);
  });
});

describe('placePiece: game over', () => {
  it('ends the game after a placement when the remaining pieces do not fit', () => {
    const state = makeState({ board: CHECKERBOARD, tray: [p('S1'), p('I2-h'), null] });
    const { state: next, events } = placePiece(state, 0, 0, 1);
    expect(next.isOver).toBe(true);
    expect(next.tray).toEqual([null, p('I2-h'), null]);
    expect(types(events)).toEqual(['placed', 'gameOver']);
    expect(events[1]).toEqual({ type: 'gameOver', finalScore: 1 });
  });

  it('ends the game right after a deal when no new piece fits', () => {
    // Find an RNG state whose next deal has no single block (deterministic search).
    let rngState = 1;
    while (dealTray(rngState).tray.some((piece) => piece!.shapeId === 'S1')) rngState++;

    const state = makeState({
      board: CHECKERBOARD,
      tray: [p('S1'), null, null],
      rngState,
      score: 50,
    });
    const { state: next, events } = placePiece(state, 0, 0, 1);
    expect(types(events)).toEqual(['placed', 'dealt', 'gameOver']);
    expect(next.tray).toEqual(dealTray(rngState).tray);
    expect(next.isOver).toBe(true);
    expect(events[2]).toEqual({ type: 'gameOver', finalScore: 51 });
  });

  it('keeps playing when a remaining piece still fits', () => {
    const state = makeState({ board: CHECKERBOARD, tray: [p('S1'), p('S1'), null] });
    const { state: next, events } = placePiece(state, 0, 0, 1);
    expect(next.isOver).toBe(false);
    expect(types(events)).toEqual(['placed']);
  });
});

/** Plays the first valid move it finds (tray order, then top-left to bottom-right). */
function playGreedyGame(seed: number) {
  let state = createGame(seed);
  const allEvents: GameEvent[] = [];
  const states: GameState[] = [state];
  while (!state.isOver) {
    let moved = false;
    for (let t = 0; t < state.tray.length && !moved; t++) {
      const piece = state.tray[t];
      if (!piece) continue;
      const shape = getShape(piece.shapeId);
      for (let row = 0; row <= BOARD_SIZE - shape.height && !moved; row++) {
        for (let col = 0; col <= BOARD_SIZE - shape.width && !moved; col++) {
          if (isValidMove(state, t, row, col)) {
            const result = placePiece(state, t, row, col);
            state = result.state;
            allEvents.push(...result.events);
            states.push(state);
            moved = true;
          }
        }
      }
    }
    if (!moved) throw new Error('isOver is false but no move was found');
  }
  return { state, allEvents, states };
}

describe('a full scripted game (seed 42)', () => {
  const { state, allEvents, states } = playGreedyGame(42);

  it('is deterministic', () => {
    expect(playGreedyGame(42)).toEqual({ state, allEvents, states });
  });

  it('matches the recorded result (regression guard: update only on purpose)', () => {
    expect(createGame(42).tray).toEqual([
      { shapeId: 'L4-270', color: 4 },
      { shapeId: 'Z4-v', color: 5 },
      { shapeId: 'I3-v', color: 4 },
    ]);
    expect(state).toMatchObject({ score: 108, moves: 20, isOver: true, rngState: 3911320156 });
    expect(allEvents.filter((e) => e.type === 'dealt')).toHaveLength(6);
  });

  it('final score equals the sum of all event points', () => {
    const sum = allEvents.reduce((total, e) => total + ('points' in e ? e.points : 0), 0);
    expect(state.score).toBe(sum);
    expect(allEvents.at(-1)).toEqual({ type: 'gameOver', finalScore: state.score });
  });

  it('keeps invariants after every move', () => {
    for (const s of states) {
      expect(s.board).toHaveLength(64);
      expect(s.tray).toHaveLength(3);
      // Never left with a full line on the board
      for (let r = 0; r < BOARD_SIZE; r++) {
        expect(s.board.slice(r * 8, r * 8 + 8).every((c) => c !== 0)).toBe(false);
      }
      // The tray is never empty (an empty tray is re-dealt immediately)
      expect(s.tray.some((piece) => piece !== null)).toBe(true);
    }
  });

  it('ends exactly when no tray piece fits', () => {
    expect(hasAnyValidMove(state.board, state.tray)).toBe(false);
    for (const s of states.slice(0, -1)) expect(hasAnyValidMove(s.board, s.tray)).toBe(true);
  });

  it('every move on a finished game is ignored', () => {
    const tray: Tray = state.tray;
    tray.forEach((_piece, i) => {
      expect(placePiece(state, i, 0, 0).state).toBe(state);
    });
  });
});
