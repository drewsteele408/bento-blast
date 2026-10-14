// Seeded PRNG (mulberry32) written as pure functions: the state is a plain number
// that callers thread through, so it can be saved with the game and resumed exactly.

export type RngResult = { value: number; state: number };

/** Turns any number into a valid 32-bit unsigned RNG state. */
export function seedToState(seed: number): number {
  return Math.trunc(seed) >>> 0;
}

/** Returns a float in [0, 1) and the next state. */
export function next(state: number): RngResult {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: nextState };
}

/** Returns an integer in [0, max) and the next state. */
export function nextInt(state: number, max: number): RngResult {
  const r = next(state);
  return { value: Math.floor(r.value * max), state: r.state };
}

/** Picks an index into `weights`, with chances proportional to each weight. */
export function nextWeightedIndex(state: number, weights: readonly number[]): RngResult {
  const total = weights.reduce((sum, w) => sum + w, 0);
  const r = next(state);
  let target = r.value * total;
  for (let i = 0; i < weights.length; i++) {
    target -= weights[i];
    if (target < 0) return { value: i, state: r.state };
  }
  // Floating-point rounding can leave target at ~0; fall back to the last positive weight.
  let last = weights.length - 1;
  while (last > 0 && weights[last] <= 0) last--;
  return { value: last, state: r.state };
}
