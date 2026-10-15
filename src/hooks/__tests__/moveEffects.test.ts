import { GameEvent } from '@/engine';

import { CLEAR_STAGGER_MAX_MS, moveEffects } from '../moveEffects';

const placedI2: GameEvent = {
  type: 'placed',
  trayIndex: 0,
  cells: [
    { row: 3, col: 6 },
    { row: 3, col: 7 },
  ],
  color: 4,
  points: 2,
};

/** Row 3 cleared by the I2 above, at combo level `combo`. */
function clearedRow3(combo = 0): GameEvent {
  return {
    type: 'cleared',
    rows: [3],
    cols: [],
    cells: Array.from({ length: 8 }, (_, col) => ({ row: 3, col, color: col < 6 ? 1 : 4 })),
    points: 10,
    combo,
  };
}

describe('moveEffects', () => {
  it('draws nothing for events without a placement', () => {
    expect(moveEffects([])).toBeNull();
    expect(moveEffects([{ type: 'dealt', tray: [null, null, null] }])).toBeNull();
  });

  it('settles every placed cell when nothing clears, with no popup or banners', () => {
    const fx = moveEffects([placedI2])!;
    expect(fx.settle).toEqual({ cells: placedI2.cells, color: 4 });
    expect(fx.cleared).toEqual([]);
    expect(fx.popupAt).toBeNull();
    expect(fx.combo).toBe(0);
    expect(fx.boardCleared).toBe(false);
  });

  it('pops cleared cells instead of settling them, rippling out from the piece', () => {
    const fx = moveEffects([placedI2, clearedRow3()])!;
    expect(fx.settle.cells).toEqual([]);
    expect(fx.cleared).toHaveLength(8);
    const delay = (col: number) => fx.cleared.find((c) => c.col === col)!.delayMs;
    // The piece's center is at col 6.5: its own cells go first, the far end last (capped).
    expect(delay(6)).toBeLessThan(delay(3));
    expect(delay(3)).toBeLessThan(delay(0));
    expect(delay(0)).toBeLessThanOrEqual(CLEAR_STAGGER_MAX_MS);
    // Colors come from the event: the board has already emptied these cells.
    expect(fx.cleared.find((c) => c.col === 0)!.color).toBe(1);
  });

  it('centers the popup on the cleared cells and shows the whole move score', () => {
    const fx = moveEffects([placedI2, clearedRow3()])!;
    expect(fx.popupAt).toEqual({ row: 3, col: 3.5 });
    expect(fx.points).toBe(12);
  });

  it('shows no combo banner for the first clear of a streak, then the streak count', () => {
    expect(moveEffects([placedI2, clearedRow3(0)])!.combo).toBe(0);
    // combo level 2 = third clear in a row, shown as ×3 like the score bar.
    expect(moveEffects([placedI2, clearedRow3(2)])!.combo).toBe(3);
  });

  it('puts the combo banner in the half of the board away from the popup', () => {
    const top = moveEffects([placedI2, clearedRow3(1)])!;
    expect(top.popupAt!.row).toBeLessThan(3.5);
    expect(top.comboRow).toBeGreaterThan(3.5);
  });

  it('celebrates a board clear, moving the popup below the banner and adding the bonus', () => {
    const fx = moveEffects([placedI2, clearedRow3(), { type: 'boardCleared', points: 300 }])!;
    expect(fx.boardCleared).toBe(true);
    expect(fx.points).toBe(312);
    expect(fx.popupAt!.row).toBeGreaterThan(3.5);
  });
});
