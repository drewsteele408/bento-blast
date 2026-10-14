import { scoreBreakdown, scoreMove } from '../scoring';

describe('scoreMove', () => {
  // prettier-ignore
  it.each([
    // Rule: +1 per block placed, no clear
    { rule: '1 block, no clear', blocks: 1, lines: 0, combo: 0, boardCleared: false, expected: 1 },
    { rule: '9 blocks, no clear', blocks: 9, lines: 0, combo: 0, boardCleared: false, expected: 9 },
    // Rule: combo is ignored when nothing clears
    { rule: 'combo without a clear', blocks: 4, lines: 0, combo: 3, boardCleared: false, expected: 4 },
    // Rule: 10 x lines x lines
    { rule: '1 line', blocks: 1, lines: 1, combo: 0, boardCleared: false, expected: 1 + 10 },
    { rule: '2 lines', blocks: 1, lines: 2, combo: 0, boardCleared: false, expected: 1 + 40 },
    { rule: '3 lines', blocks: 3, lines: 3, combo: 0, boardCleared: false, expected: 3 + 90 },
    { rule: '4 lines', blocks: 5, lines: 4, combo: 0, boardCleared: false, expected: 5 + 160 },
    { rule: '6 lines', blocks: 9, lines: 6, combo: 0, boardCleared: false, expected: 9 + 360 },
    // Rule: clear score x (1 + combo x 0.5); block points not multiplied
    { rule: '1 line, combo 1', blocks: 1, lines: 1, combo: 1, boardCleared: false, expected: 1 + 15 },
    { rule: '1 line, combo 2', blocks: 1, lines: 1, combo: 2, boardCleared: false, expected: 1 + 20 },
    { rule: '2 lines, combo 1', blocks: 4, lines: 2, combo: 1, boardCleared: false, expected: 4 + 60 },
    { rule: '3 lines, combo 3', blocks: 5, lines: 3, combo: 3, boardCleared: false, expected: 5 + 225 },
    // Rule: +300 when the board is cleared, not multiplied
    { rule: 'board clear', blocks: 1, lines: 1, combo: 0, boardCleared: true, expected: 1 + 10 + 300 },
    { rule: 'board clear, combo 2', blocks: 2, lines: 2, combo: 2, boardCleared: true, expected: 2 + 80 + 300 },
  ])('$rule → $expected', ({ blocks, lines, combo, boardCleared, expected }) => {
    expect(scoreMove({ blocks, lines, combo, boardCleared })).toBe(expected);
  });

  it('breaks the total into parts', () => {
    expect(scoreBreakdown({ blocks: 4, lines: 2, combo: 1, boardCleared: true })).toEqual({
      blockPoints: 4,
      clearPoints: 60,
      bonusPoints: 300,
      total: 364,
    });
  });

  it('always returns whole numbers', () => {
    for (let lines = 0; lines <= 16; lines++) {
      for (let combo = 0; combo <= 10; combo++) {
        expect(Number.isInteger(scoreMove({ blocks: 3, lines, combo, boardCleared: false }))).toBe(
          true,
        );
      }
    }
  });
});
