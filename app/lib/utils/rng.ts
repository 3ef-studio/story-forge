/**
 * Deterministic RNG using Mulberry32 algorithm.
 * Given a stable seed, always produces the same sequence.
 */

/** Convert a string (e.g. UUID) to a 32-bit integer seed */
export function hashStringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash >>> 0; // ensure unsigned 32-bit
}

/** Create a seeded RNG that returns floats in [0, 1) */
export function createSeededRng(seed: number): () => number {
  let state = seed | 0;
  return function mulberry32(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a random element from an array using a seeded RNG */
export function seededPick<T>(array: readonly T[], rng: () => number): T {
  return array[Math.floor(rng() * array.length)];
}

/** Pick a random integer in [min, max] inclusive */
export function seededInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
