import { dealPiece, dealTray } from '../dealer';
import { getShape, hasShape } from '../pieces';
import { seedToState } from '../rng';
import { COLOR_COUNT, Shape } from '../types';

describe('dealTray', () => {
  it('deals three valid pieces with colors 1..COLOR_COUNT', () => {
    let state = seedToState(2026);
    for (let i = 0; i < 200; i++) {
      const { tray, rngState } = dealTray(state);
      expect(tray).toHaveLength(3);
      for (const piece of tray) {
        expect(piece).not.toBeNull();
        expect(hasShape(piece!.shapeId)).toBe(true);
        expect(piece!.color).toBeGreaterThanOrEqual(1);
        expect(piece!.color).toBeLessThanOrEqual(COLOR_COUNT);
      }
      state = rngState;
    }
  });

  it('is repeatable: the same RNG state deals the same tray', () => {
    expect(dealTray(seedToState(1))).toEqual(dealTray(seedToState(1)));
    expect(dealTray(seedToState(1))).toEqual({
      tray: [
        { shapeId: 'J4-0', color: 1 },
        { shapeId: 'C3-270', color: 7 },
        { shapeId: 'R6-h', color: 2 },
      ],
      rngState: 2399460287,
    });
  });

  it('advances the RNG state by two draws per piece', () => {
    let state = seedToState(7);
    for (let i = 0; i < 3; i++) state = dealPiece(state).rngState;
    expect(dealTray(seedToState(7)).rngState).toBe(state);
  });

  it('chains: consecutive deals from the returned state differ', () => {
    const first = dealTray(seedToState(3));
    const second = dealTray(first.rngState);
    expect(second.rngState).not.toBe(first.rngState);
    expect(second.tray).not.toEqual(first.tray);
  });

  it('picks shapes in proportion to their weights', () => {
    const shapes: Shape[] = [
      { ...getShape('S1'), weight: 1 },
      { ...getShape('SQ2'), weight: 3 },
    ];
    let state = seedToState(11);
    let sq2 = 0;
    for (let i = 0; i < 4000; i++) {
      const dealt = dealPiece(state, shapes);
      if (dealt.piece.shapeId === 'SQ2') sq2++;
      state = dealt.rngState;
    }
    expect(sq2 / 4000).toBeGreaterThan(0.7);
    expect(sq2 / 4000).toBeLessThan(0.8);
  });

  it('eventually deals every shape in the catalog', () => {
    const seen = new Set<string>();
    let state = seedToState(99);
    for (let i = 0; i < 2000; i++) {
      const { tray, rngState } = dealTray(state);
      tray.forEach((p) => seen.add(p!.shapeId));
      state = rngState;
    }
    expect(seen.size).toBe(37);
  });
});
