import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { State, type PanGesture } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { Dispatch, useEffect } from 'react';

import { applyPiece, canPlace, createGame, GameState, getShape } from '@/engine';
import { saveGame, setBestScore, storage } from '@/services/storage';
import { GameAction, GameProvider, useGameDispatch } from '@/store';
import { sizes } from '@/theme';

import { GAME_OVER_DELAY_MS, GameView } from '../GameView';

const SEED = 1;
const firstTray = createGame(SEED).tray;
const shapeIn = (slot: number) => getShape(firstTray[slot]!.shapeId);
const firstShape = shapeIn(0);

/** Where the tests lay out the tray, relative to the screen root. The board sits at (0, 0). */
const TRAY_Y = 1000;

const onHome = jest.fn();
let dispatch: Dispatch<GameAction>;

/** Hands the store's dispatch to the test, to set up states that are slow to reach by dragging. */
function CaptureDispatch() {
  const storeDispatch = useGameDispatch();
  // In an effect: render must not touch outside variables.
  useEffect(() => {
    dispatch = storeDispatch;
  }, [storeDispatch]);
  return null;
}

beforeEach(() => {
  storage.clearAll();
  onHome.mockClear();
});

async function renderGame() {
  await render(
    <GameProvider initialSeed={SEED}>
      <GameView onHome={onHome} />
      <CaptureDispatch />
    </GameProvider>,
  );
  // Jest runs no layout pass, so report positions the way the device would.
  await fireEvent(screen.getByTestId('board'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 0, height: 0 } },
  });
  await fireEvent(screen.getByTestId('piece-tray'), 'layout', {
    nativeEvent: { layout: { x: 0, y: TRAY_Y, width: 0, height: 0 } },
  });
}

function sizeOf(testID: string, index = 0) {
  const { width, height } = StyleSheet.flatten(screen.getAllByTestId(testID)[index].props.style);
  return { width: Number(width), height: Number(height) };
}

/**
 * Drags a tray slot from its center by (dx, dy) and releases. In Jest the lift animation doesn't
 * advance during the synchronous gesture, so the piece stays centered where the slot's center
 * moved to.
 */
async function dragPiece(slotIndex: number, dx: number, dy: number) {
  const slot = sizeOf('tray-slot-0');
  const touch = { x: slot.width / 2, y: slot.height / 2 };
  fireGestureHandler<PanGesture>(getByGestureTestId(`tray-pan-${slotIndex}`), [
    { state: State.BEGAN, ...touch },
    // The first ACTIVE event starts the drag; the next one is a move.
    { state: State.ACTIVE, ...touch },
    { state: State.ACTIVE, ...touch, translationX: dx, translationY: dy },
    { state: State.END, ...touch, translationX: dx, translationY: dy },
  ]);
  // The drop reaches React through scheduleOnRN, which runs on a microtask in Jest.
  await act(async () => {});
}

const dragFirstPiece = (dx: number, dy: number) => dragPiece(0, dx, dy);

/** The (dx, dy) that puts a tray piece's top-left on board cell (row, col). */
function dragTo(row: number, col: number, slotIndex = 0) {
  const cellSize = sizeOf('board-cell').width + sizes.cellGap;
  const slot = sizeOf('tray-slot-0');
  const shape = shapeIn(slotIndex);
  const width = shape.width * cellSize;
  const height = shape.height * cellSize;
  const cellX = sizes.cellGap / 2 + col * cellSize;
  const cellY = sizes.cellGap / 2 + row * cellSize;
  return {
    dx: cellX - (slotIndex * slot.width + slot.width / 2 - width / 2),
    dy: cellY - (TRAY_Y + slot.height / 2 - height / 2),
  };
}

describe('GameView', () => {
  it('renders 64 board cells, 3 tray slots and the drag layer', async () => {
    await renderGame();
    expect(screen.getAllByTestId('board-cell')).toHaveLength(64);
    expect(screen.getAllByTestId(/^tray-slot-/)).toHaveLength(3);
    expect(screen.getByTestId('drag-layer')).toBeTruthy();
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.queryAllByTestId('ghost-cell')).toHaveLength(0);
  });

  it('places a piece dragged onto the board', async () => {
    await renderGame();
    const { dx, dy } = dragTo(0, 0);
    await dragFirstPiece(dx, dy);

    // One point per block; a single piece can't fill a line on an empty board.
    expect(screen.getByTestId('score')).toHaveTextContent(String(firstShape.cells.length));
    expect(screen.getByLabelText('Empty tray slot 1')).toBeTruthy();
  });

  it('snaps to the nearest cell', async () => {
    await renderGame();
    const cellSize = sizeOf('board-cell').width + sizes.cellGap;
    const { dx, dy } = dragTo(2, 3);
    // A third of a cell off in both directions still lands on (2, 3).
    await dragFirstPiece(dx + cellSize / 3, dy - cellSize / 3);
    expect(screen.getByTestId('score')).toHaveTextContent(String(firstShape.cells.length));
  });

  it('sends the piece back when it is dropped where it does not fit', async () => {
    await renderGame();
    // Still over the tray, below the board.
    await dragFirstPiece(40, -40);
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.getByLabelText('Tray piece 1')).toBeTruthy();
  });

  it('ignores a tap on a tray piece', async () => {
    await renderGame();
    await dragFirstPiece(2, 2);
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.getByLabelText('Tray piece 1')).toBeTruthy();
  });

  it('frees the drag after a drop, then deals a new tray once all three are placed', async () => {
    await renderGame();
    // Spots that don't overlap and fill no line for seed 1's tray (J4, C3, R6).
    const spots = [
      [0, 0],
      [0, 3],
      [4, 0],
    ];
    let score = 0;
    for (const [slotIndex, [row, col]] of spots.entries()) {
      const { dx, dy } = dragTo(row, col, slotIndex);
      await dragPiece(slotIndex, dx, dy);
      score += shapeIn(slotIndex).cells.length;
      expect(screen.getByTestId('score')).toHaveTextContent(String(score));
    }
    // A fresh set of three.
    for (const n of [1, 2, 3]) expect(screen.getByLabelText(`Tray piece ${n}`)).toBeTruthy();
  });
});

/**
 * A saved game one move from the end: empty cells in a checkerboard (no line can fill, no 3×3
 * fits), an S1 that fits and an SQ3 that doesn't. Placing the S1 ends the game.
 */
function oneMoveFromGameOver(score: number): GameState {
  return {
    ...createGame(SEED),
    board: Array.from({ length: 64 }, (_, i) => ((Math.floor(i / 8) + (i % 8)) % 2 === 0 ? 0 : 1)),
    tray: [{ shapeId: 'S1', color: 2 }, { shapeId: 'SQ3', color: 3 }, null],
    score,
    moves: 20,
  };
}

/** Plays the move that ends the game, then waits out the pause before the modal. */
async function playLastMove() {
  await act(async () => dispatch({ type: 'placePiece', trayIndex: 0, row: 0, col: 0 }));
  await screen.findByTestId('game-over', {}, { timeout: GAME_OVER_DELAY_MS + 1000 });
}

describe('GameView: stale gesture callbacks', () => {
  /**
   * Gesture Handler swaps in each render's callbacks a moment after the drag lock is freed, so a
   * finger already on the next piece can run the previous render's callbacks, with the board
   * from before the last move. Such a drop must never leave the game locked.
   */
  it('ignores a drag that runs callbacks from before the last move, and keeps playing', async () => {
    await renderGame();
    const pan1 = getByGestureTestId('tray-pan-1');
    const staleHandlers = pan1.handlers;
    const boardBefore = createGame(SEED).board;

    // Place slot 0 at (0, 0).
    const first = dragTo(0, 0);
    await dragFirstPiece(first.dx, first.dy);
    const score = firstShape.cells.length;
    expect(screen.getByTestId('score')).toHaveTextContent(String(score));

    // A spot for slot 1 that was free before that move but is taken now.
    const shape1 = shapeIn(1);
    const boardAfter = applyPiece(boardBefore, firstShape, 0, 0, 1);
    const taken = findSpot(
      (r, c) => canPlace(boardBefore, shape1, r, c) && !canPlace(boardAfter, shape1, r, c),
    );

    // Drag slot 1 there with the old callbacks, as in the window before they're swapped.
    const freshHandlers = pan1.handlers;
    pan1.handlers = staleHandlers;
    const stale = dragTo(taken.row, taken.col, 1);
    await dragPiece(1, stale.dx, stale.dy);
    pan1.handlers = freshHandlers;
    expect(screen.getByTestId('score')).toHaveTextContent(String(score));

    // Not locked: slot 1 can still be placed on a free spot.
    const free = findSpot((r, c) => canPlace(boardAfter, shape1, r, c));
    const ok = dragTo(free.row, free.col, 1);
    await dragPiece(1, ok.dx, ok.dy);
    expect(screen.getByTestId('score')).not.toHaveTextContent(String(score));
  });
});

function findSpot(fits: (row: number, col: number) => boolean) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) if (fits(row, col)) return { row, col };
  }
  throw new Error('no spot');
}

describe('GameView: move effects', () => {
  /** The effects are decorative and hidden from screen readers, so queries must opt in. */
  const HIDDEN = { includeHiddenElements: true };

  /** Row 0 full but for its last cell, and an S1 to fill it. The block in the bottom corner
   * keeps it from being a board clear. */
  function oneCellFromClear(): GameState {
    return {
      ...createGame(SEED),
      board: Array.from({ length: 64 }, (_, i) => (i < 7 || i === 63 ? 1 : 0)),
      tray: [{ shapeId: 'S1', color: 2 }, { shapeId: 'S1', color: 3 }, null],
      moves: 4,
    };
  }

  it('plays the clear animation and score popup after a move that clears a line', async () => {
    saveGame(oneCellFromClear());
    await renderGame();
    expect(screen.queryByTestId('board-effects', HIDDEN)).toBeNull();

    await act(async () => dispatch({ type: 'placePiece', trayIndex: 0, row: 0, col: 7 }));
    expect(screen.getAllByTestId('clear-cell', HIDDEN)).toHaveLength(8);
    expect(screen.getByTestId('score-popup', HIDDEN)).toHaveTextContent('+11');
  });

  it('does not replay the last move when the screen opens again', async () => {
    saveGame(oneCellFromClear());
    // The store lives in the root layout and outlasts the game screen, so only GameView remounts.
    const ui = (showGame: boolean) => (
      <GameProvider initialSeed={SEED}>
        {showGame && <GameView onHome={onHome} />}
        <CaptureDispatch />
      </GameProvider>
    );
    await render(ui(true));
    await act(async () => dispatch({ type: 'placePiece', trayIndex: 0, row: 0, col: 7 }));
    expect(screen.getByTestId('board-effects', HIDDEN)).toBeTruthy();

    await screen.rerender(ui(false));
    await screen.rerender(ui(true));
    expect(screen.queryByTestId('board-effects', HIDDEN)).toBeNull();
  });
});

describe('GameView: game over', () => {
  it('waits a moment before the modal, so the last move can be seen', async () => {
    saveGame(oneMoveFromGameOver(40));
    await renderGame();
    await act(async () => dispatch({ type: 'placePiece', trayIndex: 0, row: 0, col: 0 }));
    expect(screen.queryByTestId('game-over')).toBeNull();
    expect(
      await screen.findByTestId('game-over', {}, { timeout: GAME_OVER_DELAY_MS + 1000 }),
    ).toBeTruthy();
  });

  it('shows no dialogs while playing', async () => {
    await renderGame();
    expect(screen.queryByTestId('game-over')).toBeNull();
    expect(screen.queryByTestId('pause-menu')).toBeNull();
  });

  it('shows the modal with the final score when no piece fits', async () => {
    setBestScore(500);
    saveGame(oneMoveFromGameOver(40));
    await renderGame();
    await playLastMove();

    expect(screen.getByTestId('game-over')).toBeTruthy();
    expect(screen.getByTestId('final-score')).toHaveTextContent('41');
    expect(screen.getByTestId('final-best')).toHaveTextContent('500');
    expect(screen.queryByTestId('new-best')).toBeNull();
    expect(screen.getByLabelText('Pause')).toBeDisabled();
  });

  it('awards "New best!" when the final score beats the best', async () => {
    setBestScore(30);
    saveGame(oneMoveFromGameOver(40));
    await renderGame();
    await playLastMove();

    expect(screen.getByTestId('new-best')).toBeTruthy();
    expect(screen.getByTestId('final-best')).toHaveTextContent('41');
  });

  it('Restart starts a new game', async () => {
    saveGame(oneMoveFromGameOver(40));
    await renderGame();
    await playLastMove();
    await fireEvent.press(screen.getByRole('button', { name: 'Restart' }));

    expect(screen.queryByTestId('game-over')).toBeNull();
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    // The finished game's score is now the best.
    expect(screen.getByText('41')).toBeTruthy();
  });

  it('Home leaves the screen', async () => {
    saveGame(oneMoveFromGameOver(40));
    await renderGame();
    await playLastMove();
    await fireEvent.press(screen.getByRole('button', { name: 'Home' }));
    await waitFor(() => expect(onHome).toHaveBeenCalledTimes(1));
    // Hidden first, so it isn't left over the screen while it's popped.
    expect(screen.queryByTestId('game-over')).toBeNull();
  });
});

describe('GameView: pause', () => {
  it('Resume closes the menu and keeps the game', async () => {
    saveGame({ ...createGame(SEED), score: 77, moves: 5 });
    await renderGame();
    await fireEvent.press(screen.getByLabelText('Pause'));
    expect(screen.getByTestId('pause-menu')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.queryByTestId('pause-menu')).toBeNull();
    expect(screen.getByTestId('score')).toHaveTextContent('77');
  });

  it('Restart starts a new game', async () => {
    saveGame({ ...createGame(SEED), score: 77, moves: 5 });
    await renderGame();
    await fireEvent.press(screen.getByLabelText('Pause'));
    await fireEvent.press(screen.getByRole('button', { name: 'Restart' }));

    expect(screen.queryByTestId('pause-menu')).toBeNull();
    expect(screen.getByTestId('score')).toHaveTextContent('0');
  });

  it('Home leaves the screen', async () => {
    await renderGame();
    await fireEvent.press(screen.getByLabelText('Pause'));
    await fireEvent.press(screen.getByRole('button', { name: 'Home' }));
    await waitFor(() => expect(onHome).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('pause-menu')).toBeNull();
  });
});
