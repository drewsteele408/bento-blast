import { next, nextInt, nextWeightedIndex, seedToState } from '../rng';

function sequence(seed: number, count: number): number[] {
  const values: number[] = [];
  let state = seedToState(seed);
  for (let i = 0; i < count; i++) {
    const r = next(state);
    values.push(r.value);
    state = r.state;
  }
  return values;
}

describe('rng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(sequence(42, 100)).toEqual(sequence(42, 100));
  });

  it('gives different sequences for different seeds', () => {
    expect(sequence(1, 10)).not.toEqual(sequence(2, 10));
  });

  it('matches known mulberry32 output (guards against accidental algorithm changes)', () => {
    expect(sequence(1, 3)).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
  });

  it('keeps values in [0, 1)', () => {
    for (const v of sequence(123456, 10_000)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is pure: the same input state always gives the same result', () => {
    const state = seedToState(7);
    const a = next(state);
    const b = next(state);
    expect(a).toEqual(b);
    expect(state).toBe(7);
    expect(a.state).not.toBe(state);
  });

  it('seedToState normalizes to a 32-bit unsigned integer', () => {
    expect(seedToState(-1)).toBe(4294967295);
    expect(seedToState(2 ** 32 + 5)).toBe(5);
    expect(seedToState(3.9)).toBe(3);
  });

  it('nextInt stays in [0, max) and covers every value', () => {
    const seen = new Set<number>();
    let state = seedToState(99);
    for (let i = 0; i < 1000; i++) {
      const r = nextInt(state, 7);
      expect(Number.isInteger(r.value)).toBe(true);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(7);
      seen.add(r.value);
      state = r.state;
    }
    expect(seen.size).toBe(7);
  });

  it('nextWeightedIndex never picks a zero weight and follows the weights roughly', () => {
    const weights = [1, 0, 3];
    const counts = [0, 0, 0];
    let state = seedToState(5);
    for (let i = 0; i < 4000; i++) {
      const r = nextWeightedIndex(state, weights);
      counts[r.value]++;
      state = r.state;
    }
    expect(counts[1]).toBe(0);
    // Expected ~1000 vs ~3000.
    expect(counts[0]).toBeGreaterThan(800);
    expect(counts[0]).toBeLessThan(1200);
    expect(counts[2]).toBeGreaterThan(2800);
  });
});
