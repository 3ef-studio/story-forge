/**
 * District Modifiers Application
 *
 * Central place for applying district-specific modifiers to control and instability deltas.
 * All world update helpers should use this to ensure consistent behavior.
 */

import { getDistrictModifiers } from '@/app/data/districtModifiers';

// ============================================================
// Types
// ============================================================

export type DeltaKind =
  | 'primary'      // Primary control delta from encounter outcome
  | 'ripple'       // Ripple effect to adjacent districts
  | 'counter'      // Counter-move by opposing faction
  | 'death'        // Control loss on death
  | 'instability'; // Instability change

export interface ComputeModifiedDeltaInput {
  baseDelta: number;
  districtId: string;
  kind: DeltaKind;
}

// ============================================================
// Main Function
// ============================================================

/**
 * Compute a modified delta based on district modifiers.
 *
 * This is the single central place where district differentiation is applied.
 * All world update helpers should call this function.
 *
 * @param input - The base delta, district ID, and kind of delta
 * @returns The modified delta (integer, preserving sign)
 */
export function computeModifiedDelta(input: ComputeModifiedDeltaInput): number {
  const { baseDelta, districtId, kind } = input;

  // Get modifiers for this district (defaults to 1.0 if not specified)
  const mods = getDistrictModifiers(districtId);

  // Select the appropriate multiplier based on delta kind
  let multiplier: number;
  switch (kind) {
    case 'primary':
      multiplier = mods.controlMult;
      break;
    case 'ripple':
      multiplier = mods.rippleMult;
      break;
    case 'counter':
      multiplier = mods.counterMult;
      break;
    case 'death':
      multiplier = mods.deathControlMult;
      break;
    case 'instability':
      multiplier = mods.instabilityMult;
      break;
    default:
      multiplier = 1.0;
  }

  // Apply multiplier and round to integer, preserving sign
  const modified = baseDelta * multiplier;
  const rounded = baseDelta >= 0 ? Math.round(modified) : Math.round(modified);

  // Clamp to reasonable range (-50 to +50) to prevent extreme swings
  return Math.max(-50, Math.min(50, rounded));
}

/**
 * Apply modifiers to a control delta.
 * Convenience wrapper for control-related deltas.
 */
export function applyControlModifier(
  baseDelta: number,
  districtId: string,
  kind: 'primary' | 'ripple' | 'counter' | 'death'
): number {
  return computeModifiedDelta({ baseDelta, districtId, kind });
}

/**
 * Apply modifiers to an instability delta.
 * Convenience wrapper for instability changes.
 */
export function applyInstabilityModifier(
  baseDelta: number,
  districtId: string
): number {
  return computeModifiedDelta({ baseDelta, districtId, kind: 'instability' });
}
