/**
 * District Modifiers
 *
 * Each district has modifiers that affect control swing and instability magnitudes.
 * If a modifier is not specified, the default value of 1.0 is used (no change).
 *
 * Modifiers:
 * - controlMult: Affects primary control delta (how much controlValue changes from encounter outcomes)
 * - rippleMult: Affects ripple delta (pressure spreading to adjacent districts)
 * - counterMult: Affects counter-move delta (enemy faction reactions)
 * - deathControlMult: Affects control loss on character death
 * - instabilityMult: Affects instability changes (death, losses)
 */

import type { DistrictId } from './districts';

export interface DistrictModifiers {
  controlMult?: number;       // Default 1.0 - affects primary control deltas
  rippleMult?: number;        // Default 1.0 - affects ripple spread deltas
  counterMult?: number;       // Default 1.0 - affects counter-move deltas
  deathControlMult?: number;  // Default 1.0 - affects death control loss
  instabilityMult?: number;   // Default 1.0 - affects instability gains
}

/**
 * District modifier data keyed by districtId.
 * Districts not listed here use default multipliers (1.0).
 */
export const districtModifiers: Record<DistrictId, DistrictModifiers> = {
  // Downtown (civic/high visibility): harder to swing, more stable
  downtown: {
    controlMult: 0.8,       // Harder to swing - institutions resist change
    rippleMult: 0.8,        // Less spillover
    counterMult: 1.1,       // Institutions react strongly
    deathControlMult: 1.0,
    instabilityMult: 0.7,   // More stable - better infrastructure
  },

  // Industrial: bigger swings, industrial unrest spreads
  industrial: {
    controlMult: 1.2,       // Bigger swings - less established control
    rippleMult: 1.1,        // Some spillover through supply chains
    counterMult: 1.0,
    deathControlMult: 1.0,
    instabilityMult: 1.0,
  },

  // Waterfront: smuggling routes spread pressure
  waterfront: {
    controlMult: 1.1,
    rippleMult: 1.3,        // Pressure spreads along shipping routes
    counterMult: 1.0,
    deathControlMult: 1.0,
    instabilityMult: 1.0,
  },

  // Slums: highly volatile, unrest spikes easily
  slums: {
    controlMult: 1.3,       // Very volatile - frequent power shifts
    rippleMult: 1.0,
    counterMult: 1.0,
    deathControlMult: 1.2,  // Death hits harder in neglected areas
    instabilityMult: 1.4,   // Unrest spikes easily
  },

  // Midtown (residential): slower swings but panic spreads
  midtown: {
    controlMult: 0.9,       // Slower swings - community resistance
    rippleMult: 1.0,
    counterMult: 1.0,
    deathControlMult: 1.0,
    instabilityMult: 1.1,   // Panic spreads if violence happens
  },
};

/**
 * Get modifiers for a district, with defaults for missing values.
 */
export function getDistrictModifiers(districtId: string): Required<DistrictModifiers> {
  const mods = districtModifiers[districtId as DistrictId] ?? {};

  return {
    controlMult: mods.controlMult ?? 1.0,
    rippleMult: mods.rippleMult ?? 1.0,
    counterMult: mods.counterMult ?? 1.0,
    deathControlMult: mods.deathControlMult ?? 1.0,
    instabilityMult: mods.instabilityMult ?? 1.0,
  };
}

/**
 * Get a human-readable trait description for a district.
 * Used for map display.
 */
export function getDistrictTraits(districtId: string): string[] {
  const mods = getDistrictModifiers(districtId);
  const traits: string[] = [];

  // Control swing traits
  if (mods.controlMult < 0.9) {
    traits.push(`Stable (${mods.controlMult}x control)`);
  } else if (mods.controlMult > 1.1) {
    traits.push(`Volatile (${mods.controlMult}x control)`);
  }

  // Instability traits
  if (mods.instabilityMult < 0.9) {
    traits.push(`Calm (${mods.instabilityMult}x instability)`);
  } else if (mods.instabilityMult > 1.1) {
    traits.push(`Restless (${mods.instabilityMult}x instability)`);
  }

  // Ripple traits
  if (mods.rippleMult > 1.1) {
    traits.push(`Connected (${mods.rippleMult}x ripple)`);
  }

  // Counter traits
  if (mods.counterMult > 1.0) {
    traits.push(`Contested (${mods.counterMult}x counter)`);
  }

  return traits;
}
