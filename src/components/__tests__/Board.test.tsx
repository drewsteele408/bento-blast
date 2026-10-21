import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { emptyBoard, idx } from '@/engine';
import { parseBoard } from '@/engine/debug';
import { placementPreview } from '@/hooks/placementPreview';
import { boardRim, colors, rampFor, sizes } from '@/theme';

import { Board } from '../Board';

function backgroundOf(cell: number) {
  return StyleSheet.flatten(screen.getAllByTestId('cell-color')[cell].props.style).backgroundColor;
}

describe('Board preview', () => {
  it('draws a ghost on the cells the hovering piece would cover', async () => {
    const board = emptyBoard();
    const preview = placementPreview(board, { shapeId: 'I3-h', color: 5 }, 4, 2);
    await render(<Board board={board} cellSize={40} preview={preview} />);

    expect(screen.getAllByTestId('ghost-cell')).toHaveLength(3);
    // Nothing would clear, so the cells keep their own (empty) color under the ghost.
    expect(backgroundOf(idx(4, 2))).toBe(rampFor(0).dark);
  });

  it('lights up every cell of a line the move would clear in the piece color', async () => {
    const board = parseBoard([
      '........',
      '........',
      '........',
      '......#.',
      '######..',
      '......#.',
      '........',
      '........',
    ]);
    const preview = placementPreview(board, { shapeId: 'I2-h', color: 5 }, 4, 6);
    await render(<Board board={board} cellSize={40} preview={preview} />);

    for (let col = 0; col < 8; col++) expect(backgroundOf(idx(4, col))).toBe(rampFor(5).dark);
    // Outside the cleared row, filled cells keep their color.
    expect(backgroundOf(idx(3, 6))).toBe(rampFor(1).dark);
  });

  it('draws no preview without one', async () => {
    await render(<Board board={emptyBoard()} cellSize={40} />);
    expect(screen.queryAllByTestId('ghost-cell')).toHaveLength(0);
  });
});

describe('Board box', () => {
  it('sets the cells into a wooden floor inside the lacquer rim', async () => {
    await render(<Board board={emptyBoard()} cellSize={40} />);
    const rim = boardRim(40);
    const floor = 40 * 8 + sizes.cellGap;

    expect(rim).toBeGreaterThan(0);
    expect(StyleSheet.flatten(screen.getByTestId('board').props.style).width).toBe(floor + rim * 2);
    expect(StyleSheet.flatten(screen.getByTestId('board-floor').props.style)).toMatchObject({
      width: floor,
      margin: rim,
      backgroundColor: colors.wood,
    });
  });
});
