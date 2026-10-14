import { act, render } from '@testing-library/react-native';
import { Dispatch, useEffect } from 'react';

import { BOARD_SIZE, createGame, GameState, isValidMove, placePiece, TRAY_SIZE } from '@/engine';
import { getBestScore, loadGame, saveGame, setBestScore, storage } from '@/services/storage';

import { GameAction } from '../gameReducer';
import { GameProvider, useGame, useGameDispatch } from '../GameProvider';

let dispatch: Dispatch<GameAction>;
let game: GameState;

/** Hands the store to the test. Assigned in an effect: render must not touch outside variables. */
function Probe() {
  const latestDispatch = useGameDispatch();
  const latestGame = useGame().game;
  useEffect(() => {
    dispatch = latestDispatch;
    game = latestGame;
  });
  return null;
}

async function renderProvider(seed = 1) {
  await render(
    <GameProvider initialSeed={seed}>
      <Probe />
    </GameProvider>,
  );
}

/** Empty cells in a checkerboard; an S1 fits, an SQ3 never does. Placing the S1 ends the game. */
function oneMoveFromGameOver(score: number): GameState {
  return {
    ...createGame(1),
    board: Array.from({ length: 64 }, (_, i) => ((Math.floor(i / 8) + (i % 8)) % 2 === 0 ? 0 : 1)),
    tray: [{ shapeId: 'S1', color: 2 }, { shapeId: 'SQ3', color: 3 }, null],
    score,
    moves: 20,
  };
}

/** The first valid move, scanning tray slots and then cells. */
function firstMove(state: GameState) {
  for (let trayIndex = 0; trayIndex < TRAY_SIZE; trayIndex++) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (isValidMove(state, trayIndex, row, col)) return { trayIndex, row, col };
      }
    }
  }
  throw new Error('no valid move');
}

beforeEach(() => {
  storage.clearAll();
});

describe('GameProvider persistence', () => {
  it('starts a fresh game from the seed when nothing is saved', async () => {
    await renderProvider(7);
    expect(game).toEqual(createGame(7));
  });

  it('restores the saved game on mount', async () => {
    const saved = { ...createGame(3), score: 120, moves: 9 };
    saveGame(saved);
    await renderProvider(7);
    expect(game).toEqual(saved);
  });

  it('a restored game plays on, including the next deal, exactly like the original', async () => {
    // One move into seed 3's game: two pieces left, so the next deal comes after two more moves.
    let original = createGame(3);
    const first = firstMove(original);
    original = placePiece(original, first.trayIndex, first.row, first.col).state;
    saveGame(original);
    await renderProvider(999);

    for (let n = 0; n < 4; n++) {
      const move = firstMove(original);
      original = placePiece(original, move.trayIndex, move.row, move.col).state;
      await act(async () => dispatch({ type: 'placePiece', ...move }));
      expect(game).toEqual(original);
    }
    // The tray was emptied and dealt again along the way.
    expect(original.moves).toBe(5);
  });

  it('saves the game after every move', async () => {
    await renderProvider();
    await act(async () => dispatch({ type: 'placePiece', trayIndex: 0, row: 0, col: 0 }));
    expect(game.moves).toBe(1);
    expect(loadGame()).toEqual(game);
  });

  it('on game over, clears the save and records a beaten best score', async () => {
    setBestScore(10);
    saveGame(oneMoveFromGameOver(40));
    await renderProvider();
    // Mid-game, the best on disk is still the old one.
    expect(getBestScore()).toBe(10);

    await act(async () => dispatch({ type: 'placePiece', trayIndex: 0, row: 0, col: 0 }));
    expect(game.isOver).toBe(true);
    expect(loadGame()).toBeNull();
    expect(getBestScore()).toBe(41);
  });

  it('keeps a higher best score on game over', async () => {
    setBestScore(500);
    saveGame(oneMoveFromGameOver(40));
    await renderProvider();
    await act(async () => dispatch({ type: 'placePiece', trayIndex: 0, row: 0, col: 0 }));
    expect(getBestScore()).toBe(500);
  });

  it('records the score of an abandoned game as best when a new game starts', async () => {
    saveGame({ ...createGame(3), score: 250, moves: 9 });
    await renderProvider();
    await act(async () => dispatch({ type: 'newGame', seed: 8 }));
    expect(getBestScore()).toBe(250);
    expect(loadGame()).toEqual(createGame(8));
  });
});
