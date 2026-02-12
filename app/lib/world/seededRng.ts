/**
 * Seeded RNG for deterministic world reactions.
 *
 * Uses a simple hash-based approach to generate reproducible random numbers
 * from a seed string. This ensures the same inputs produce the same outputs
 * for debugging and reproducibility.
 */

/**
 * Simple string hash function (djb2 algorithm).
 * Converts a seed string to a numeric hash.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Ensure positive 32-bit integer
}

/**
 * Simple linear congruential generator (LCG) for seeded random numbers.
 * Uses the same parameters as MINSTD.
 */
function lcg(seed: number): number {
  const a = 48271;
  const m = 2147483647; // 2^31 - 1
  return (seed * a) % m;
}

/**
 * Create a seeded random number generator.
 *
 * @param seed - A string seed (e.g., scopeId + worldTurn + suffix)
 * @returns A function that returns the next random number in [0, 1)
 */
export function createSeededRng(seed: string): () => number {
  let state = hashString(seed) || 1; // Ensure non-zero

  return () => {
    state = lcg(state);
    return state / 2147483647;
  };
}

/**
 * Deterministically select an item from an array based on weights.
 *
 * Uses the seeded RNG to pick an item proportional to its weight.
 * If all weights are <= 0, returns the first item (fallback).
 *
 * @param items - Array of items to select from
 * @param weights - Array of weights (same length as items)
 * @param rng - A seeded RNG function
 * @returns The selected item
 */
export function weightedSelect<T>(
  items: T[],
  weights: number[],
  rng: () => number
): T | null {
  if (items.length === 0) return null;
  if (items.length !== weights.length) {
    throw new Error('Items and weights arrays must have the same length');
  }

  // Ensure all weights are non-negative
  const safeWeights = weights.map(w => Math.max(0, w));
  const totalWeight = safeWeights.reduce((sum, w) => sum + w, 0);

  // If all weights are 0, return first item
  if (totalWeight <= 0) {
    return items[0];
  }

  // Pick a random value in [0, totalWeight)
  const target = rng() * totalWeight;

  // Find the item corresponding to this value
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += safeWeights[i];
    if (target < cumulative) {
      return items[i];
    }
  }

  // Fallback (shouldn't happen due to floating point, but be safe)
  return items[items.length - 1];
}

/**
 * Deterministically select based on a threshold (e.g., 30% chance).
 *
 * @param threshold - A value in [0, 1] representing the probability
 * @param rng - A seeded RNG function
 * @returns true if the random value is below the threshold
 */
export function checkProbability(threshold: number, rng: () => number): boolean {
  return rng() < threshold;
}
