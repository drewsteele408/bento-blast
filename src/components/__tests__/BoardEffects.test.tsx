import { act, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { GameEvent } from '@/engine';

import { BoardEffects } from '../BoardEffects';

/** The effects are decorative and hidden from screen readers, so queries must opt in. */
const HIDDEN = { includeHiddenElements: true };

const placed: GameEvent = {
  type: 'placed',
  trayIndex: 0,
  cells: [
    { row: 0, col: 6 },
    { row: 0, col: 7 },
    { row: 1, col: 7 },
  ],
  color: 3,
  points: 3,
};

/** Row 0 cleared: the piece's two cells in it pop, the one in row 1 settles. */
function clearedRow0(combo = 0): GameEvent {
  return {
    type: 'cleared',
    rows: [0],
    cols: [],
    cells: Array.from({ length: 8 }, (_, col) => ({ row: 0, col, color: 2 })),
    points: 10,
    combo,
  };
}

describe('BoardEffects', () => {
  it('draws nothing without a move', async () => {
    await render(<BoardEffects events={[]} cellSize={40} />);
    expect(screen.queryByTestId('board-effects', HIDDEN)).toBeNull();
  });

  it('settles the placed cells of a move that clears nothing', async () => {
    await render(<BoardEffects events={[placed]} cellSize={40} />);
    expect(screen.getAllByTestId('settle-cell', HIDDEN)).toHaveLength(3);
    expect(screen.queryAllByTestId('clear-cell', HIDDEN)).toHaveLength(0);
    expect(screen.queryByTestId('score-popup', HIDDEN)).toBeNull();
  });

  it('pops the cleared cells and shows the move score', async () => {
    await render(<BoardEffects events={[placed, clearedRow0()]} cellSize={40} />);
    expect(screen.getAllByTestId('clear-cell', HIDDEN)).toHaveLength(8);
    expect(screen.getAllByTestId('settle-cell', HIDDEN)).toHaveLength(1);
    expect(screen.getByTestId('score-popup', HIDDEN)).toHaveTextContent('+13');
    expect(screen.queryByTestId('combo-banner', HIDDEN)).toBeNull();
  });

  it('shows the combo banner from the second clear in a row', async () => {
    await render(<BoardEffects events={[placed, clearedRow0(1)]} cellSize={40} />);
    expect(screen.getByTestId('combo-banner', HIDDEN)).toHaveTextContent('Combo ×2');
  });

  it('fades every cleared cell out once the animation has played', async () => {
    jest.useFakeTimers();
    try {
      await render(<BoardEffects events={[placed, clearedRow0()]} cellSize={40} />);
      const cells = screen.getAllByTestId('clear-cell', HIDDEN);
      expect(getAnimatedStyle(cells[0]).opacity).toBe(1);

      await act(async () => jest.advanceTimersByTime(1000));
      for (const cell of cells) expect(getAnimatedStyle(cell).opacity).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('celebrates a board clear', async () => {
    await render(
      <BoardEffects
        events={[placed, clearedRow0(), { type: 'boardCleared', points: 300 }]}
        cellSize={40}
      />,
    );
    expect(screen.getByTestId('board-clear-banner', HIDDEN)).toHaveTextContent('Board clear!');
    expect(screen.getByTestId('board-flash', HIDDEN)).toBeTruthy();
    expect(screen.getByTestId('score-popup', HIDDEN)).toHaveTextContent('+313');
  });
});
