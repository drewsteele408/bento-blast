import { createGame, emptyBoard, GameState, Piece } from '@/engine';
import { deepFreeze, parseBoard } from '@/engine/debug';
import { seedToState } from '@/engine/rng';

import {
  gameReducer,
  GameStoreState,
  initGameStore,
  selectBest,
  selectCanResetBest,
  selectHasGameInProgress,
  selectIsNewBest,
} from '../gameReducer';

const p = (shapeId: string, color = 1): Piece => ({ shapeId, color });

function makeGame(overrides: Partial<GameState> = {}): GameState {
  return {
    board: emptyBoard(),
    tray: [p('S1'), p('S1'), p('S1')],
    score: 0,
    combo: 0,
    isOver: false,
    seed: 1,
    rngState: seedToState(1),
    moves: 0,
    ...overrides,
  };
}

function makeStore(overrides: Partial<GameState> = {}, best = 0): GameStoreState {
  return deepFreeze({ game: makeGame(overrides), lastEvents: [], best });
}

describe('initGameStore', () => {
  it('creates a fresh game for the seed with no events', () => {
    const store = initGameStore(42);
    expect(store.game).toEqual(createGame(42));
    expect(store.lastEvents).toEqual([]);
    expect(store.best).toBe(0);
  });

  it('starts from the given best score', () => {
    expect(initGameStore(42, 900).best).toBe(900);
  });
});

describe('gameReducer: newGame', () => {
  it('replaces the game with a new one from the seed and clears lastEvents', () => {
    const before = deepFreeze({
      game: makeGame({ score: 500, moves: 12 }),
      lastEvents: [{ type: 'gameOver' as const, finalScore: 500 }],
      best: 0,
    });
    const after = gameReducer(before, { type: 'newGame', seed: 7 });
    expect(after.game).toEqual(createGame(7));
    expect(after.game.score).toBe(0);
    expect(after.lastEvents).toEqual([]);
  });

  it('folds the score of the game it replaces into best', () => {
    expect(gameReducer(makeStore({ score: 500 }, 300), { type: 'newGame', seed: 7 }).best).toBe(
      500,
    );
    expect(gameReducer(makeStore({ score: 200 }, 300), { type: 'newGame', seed: 7 }).best).toBe(
      300,
    );
  });
});

describe('gameReducer: placePiece', () => {
  it('runs the engine and stores the new state and the placed event', () => {
    const before = makeStore();
    const after = gameReducer(before, { type: 'placePiece', trayIndex: 1, row: 2, col: 3 });

    expect(after.game.board[2 * 8 + 3]).toBe(1);
    expect(after.game.tray).toEqual([p('S1'), null, p('S1')]);
    expect(after.game.score).toBe(1);
    expect(after.game.moves).toBe(1);
    expect(after.lastEvents).toEqual([
      { type: 'placed', trayIndex: 1, cells: [{ row: 2, col: 3 }], color: 1, points: 1 },
    ]);
  });

  it('sets cleared events when a placement fills a row', () => {
    const before = makeStore({
      board: parseBoard([
        '#######.',
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
      ]),
    });
    const after = gameReducer(before, { type: 'placePiece', trayIndex: 0, row: 0, col: 7 });

    expect(after.lastEvents.map((e) => e.type)).toEqual(['placed', 'cleared', 'boardCleared']);
    // 1 block + 10 for one line + 300 board-clear bonus
    expect(after.game.score).toBe(311);
    expect(after.game.combo).toBe(1);
  });

  it('replaces lastEvents on each move instead of appending', () => {
    const first = gameReducer(makeStore(), { type: 'placePiece', trayIndex: 0, row: 0, col: 0 });
    const second = gameReducer(first, { type: 'placePiece', trayIndex: 1, row: 5, col: 5 });
    expect(second.lastEvents).toEqual([
      { type: 'placed', trayIndex: 1, cells: [{ row: 5, col: 5 }], color: 1, points: 1 },
    ]);
  });

  it('includes a dealt event when the last tray piece is placed', () => {
    const before = makeStore({ tray: [null, null, p('S1')] });
    const after = gameReducer(before, { type: 'placePiece', trayIndex: 2, row: 0, col: 0 });
    expect(after.lastEvents.map((e) => e.type)).toEqual(['placed', 'dealt']);
    expect(after.game.tray.every((piece) => piece !== null)).toBe(true);
  });

  it.each([
    [
      'a filled cell',
      { trayIndex: 0, row: 0, col: 0 },
      { board: parseBoard(['#.......', ...Array(7).fill('........')]) },
    ],
    ['off the board', { trayIndex: 0, row: 8, col: 0 }, {}],
    ['an empty tray slot', { trayIndex: 0, row: 3, col: 3 }, { tray: [null, p('S1'), p('S1')] }],
    ['a bad tray index', { trayIndex: 3, row: 3, col: 3 }, {}],
    ['a game that is over', { trayIndex: 0, row: 3, col: 3 }, { isOver: true }],
  ])('returns the same store object for a move onto %s', (_label, move, overrides) => {
    const before = makeStore(overrides as Partial<GameState>);
    const after = gameReducer(before, { type: 'placePiece', ...move });
    expect(after).toBe(before);
  });

  it('keeps the previous lastEvents after an invalid move', () => {
    const first = gameReducer(makeStore(), { type: 'placePiece', trayIndex: 0, row: 0, col: 0 });
    const second = gameReducer(first, { type: 'placePiece', trayIndex: 0, row: 1, col: 1 });
    expect(second).toBe(first);
  });
});

describe('gameReducer: restore', () => {
  it('replaces the game with the saved one and clears lastEvents', () => {
    const saved = makeGame({ score: 1234, moves: 40, combo: 2 });
    const before = deepFreeze({
      game: createGame(3),
      lastEvents: [{ type: 'gameOver' as const, finalScore: 0 }],
      best: 800,
    });
    const after = gameReducer(before, { type: 'restore', game: saved });
    expect(after.game).toBe(saved);
    expect(after.lastEvents).toEqual([]);
    expect(after.best).toBe(800);
  });
});

describe('gameReducer: best score', () => {
  it('keeps best through moves; the current score is folded in only by newGame', () => {
    const after = gameReducer(makeStore({}, 0), {
      type: 'placePiece',
      trayIndex: 0,
      row: 0,
      col: 0,
    });
    expect(after.game.score).toBe(1);
    expect(after.best).toBe(0);
    expect(selectBest(after)).toBe(1);
  });

  it('resetBest forgets the best but keeps the game, whose score still counts', () => {
    const store = makeStore({ score: 40, moves: 3 }, 900);
    const after = gameReducer(store, { type: 'resetBest', seed: 5 });
    expect(after.best).toBe(0);
    expect(after.game).toBe(store.game);
    expect(selectBest(after)).toBe(40);
  });

  it('resetBest after game over replaces the finished game, so its score stops counting', () => {
    const store = makeStore({ score: 500, moves: 30, isOver: true }, 300);
    expect(selectCanResetBest(store)).toBe(true);
    const after = gameReducer(store, { type: 'resetBest', seed: 5 });
    expect(after.game).toEqual(createGame(5));
    expect(after.best).toBe(0);
    expect(selectBest(after)).toBe(0);
    expect(selectCanResetBest(after)).toBe(false);
  });

  it('resetBest works on the first game ever once it has ended', () => {
    const store = makeStore({ score: 120, moves: 12, isOver: true }, 0);
    expect(selectBest(gameReducer(store, { type: 'resetBest', seed: 5 }))).toBe(0);
  });

  it('resetBest with nothing to reset returns the same state', () => {
    const store = makeStore({ score: 40, moves: 3 }, 0);
    expect(selectCanResetBest(store)).toBe(false);
    expect(gameReducer(store, { type: 'resetBest', seed: 5 })).toBe(store);
  });
});

describe('selectors', () => {
  it('selectBest is the higher of best and the current score', () => {
    expect(selectBest(makeStore({ score: 50 }, 100))).toBe(100);
    expect(selectBest(makeStore({ score: 150 }, 100))).toBe(150);
  });

  it('selectIsNewBest is true only when the score beats the earlier best', () => {
    expect(selectIsNewBest(makeStore({ score: 150 }, 100))).toBe(true);
    expect(selectIsNewBest(makeStore({ score: 100 }, 100))).toBe(false);
    expect(selectIsNewBest(makeStore({ score: 0 }, 0))).toBe(false);
  });

  it('selectHasGameInProgress needs at least one move and a game that is not over', () => {
    expect(selectHasGameInProgress(makeStore({ moves: 0 }))).toBe(false);
    expect(selectHasGameInProgress(makeStore({ moves: 3 }))).toBe(true);
    expect(selectHasGameInProgress(makeStore({ moves: 3, isOver: true }))).toBe(false);
  });
});
