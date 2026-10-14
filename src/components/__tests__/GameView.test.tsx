import { fireEvent, render, screen } from '@testing-library/react-native';

import { createGame, getShape } from '@/engine';
import { GameProvider } from '@/store';

import { GameView } from '../GameView';

const SEED = 1;

async function renderGame() {
  await render(
    <GameProvider initialSeed={SEED}>
      <GameView />
    </GameProvider>,
  );
}

describe('GameView', () => {
  it('renders 64 board cells and 3 tray slots', async () => {
    await renderGame();
    expect(screen.getAllByTestId('board-cell')).toHaveLength(64);
    expect(screen.getAllByTestId(/^tray-slot-/)).toHaveLength(3);
    expect(screen.getByTestId('score')).toHaveTextContent('0');
  });

  it('places a piece in debug mode: tap a tray piece, then a board cell', async () => {
    await renderGame();
    // Every shape fits at the top-left of an empty board.
    await fireEvent.press(screen.getByTestId('tray-slot-0'));
    expect(screen.getByTestId('tray-slot-0')).toBeSelected();

    await fireEvent.press(screen.getAllByTestId('board-cell')[0]);

    // One point per block; a single piece can't fill a line on an empty board.
    const blocks = getShape(createGame(SEED).tray[0]!.shapeId).cells.length;
    expect(screen.getByTestId('score')).toHaveTextContent(String(blocks));
    expect(screen.getByTestId('tray-slot-0')).toBeDisabled();
    expect(screen.getByTestId('tray-slot-0')).not.toBeSelected();
  });

  it('does nothing when a board cell is tapped with no piece picked', async () => {
    await renderGame();
    await fireEvent.press(screen.getAllByTestId('board-cell')[0]);
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.getByTestId('tray-slot-0')).toBeEnabled();
  });

  it('keeps the piece picked after a tap on a cell where it does not fit', async () => {
    await renderGame();
    await fireEvent.press(screen.getByTestId('tray-slot-0'));
    // Bottom-right corner: only a single block could fit there.
    const shape = getShape(createGame(SEED).tray[0]!.shapeId);
    expect(shape.cells.length).toBeGreaterThan(1);
    await fireEvent.press(screen.getAllByTestId('board-cell')[63]);

    expect(screen.getByTestId('score')).toHaveTextContent('0');
    expect(screen.getByTestId('tray-slot-0')).toBeSelected();
  });

  it('unpicks a piece when its slot is tapped again', async () => {
    await renderGame();
    await fireEvent.press(screen.getByTestId('tray-slot-1'));
    await fireEvent.press(screen.getByTestId('tray-slot-1'));
    expect(screen.getByTestId('tray-slot-1')).not.toBeSelected();

    await fireEvent.press(screen.getAllByTestId('board-cell')[0]);
    expect(screen.getByTestId('score')).toHaveTextContent('0');
  });
});
