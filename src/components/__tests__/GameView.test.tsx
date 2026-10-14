import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { State, type PanGesture } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { createGame, getShape } from '@/engine';
import { GameProvider } from '@/store';
import { sizes } from '@/theme';

import { GameView } from '../GameView';

const SEED = 1;
const firstTray = createGame(SEED).tray;
const shapeIn = (slot: number) => getShape(firstTray[slot]!.shapeId);
const firstShape = shapeIn(0);

/** Where the tests lay out the tray, relative to the screen root. The board sits at (0, 0). */
const TRAY_Y = 1000;

async function renderGame() {
  await render(
    <GameProvider initialSeed={SEED}>
      <GameView />
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
