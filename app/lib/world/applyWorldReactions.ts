/**
 * World Reactions System
 *
 * After each encounter resolution, applies:
 * 1) Ripple: a small control shift in ONE adjacent district
 * 2) Counter-move: a small control shift in ONE other district elsewhere
 *
 * This is a post-resolution world reaction step. It does NOT change
 * encounter/combat selection or resolution math.
 */

import { prisma } from '@/app/lib/db';
import { districts, getDistrictById, getAdjacentDistrictIds, type DistrictId } from '@/app/data/districts';
import { controllableFactions, getFactionById, type Faction } from '@/app/data/factions';
import { getDistrictStates, canFactionControlDistrict, type EncounterOutcome } from '@/app/lib/game-logic/district-state';

// ============================================================
// Types
// ============================================================

export type WorldUpdateReason = 'primary' | 'ripple' | 'counter';

export interface WorldReactionUpdate {
  districtId: string;
  districtName: string;
  delta: number;
  previousControlValue: number;
  newControlValue: number;
  previousControllingFactionId: string | null;
  controllingFactionId: string | null;
  controllingFactionName: string | null;
  reason: WorldUpdateReason;
  factionId: string;
  factionName: string;
}

export interface WorldReactionsResult {
  rippleUpdate: WorldReactionUpdate | null;
  counterUpdate: WorldReactionUpdate | null;
}

export interface ApplyWorldReactionsInput {
  characterId: string;
  encounterDistrictId: string;
  playerFactionId: string | null;
  outcome: EncounterOutcome;
}

// ============================================================
// Constants
// ============================================================

const RIPPLE_DELTA_SUCCESS = 3;
const RIPPLE_DELTA_FAILURE = -3;
const COUNTER_DELTA = 5;

// Control thresholds (same as primary update logic)
const CONTROL_THRESHOLD_HIGH = 60;
const CONTROL_THRESHOLD_LOW = 40;

// ============================================================
// Helpers
// ============================================================

/**
 * Determine controlling faction based on control value thresholds.
 * >= 60: faction controls, <= 40: contested (null), otherwise unchanged
 */
function computeControllingFaction(
  controlValue: number,
  pushingFactionId: string,
  currentControllingFactionId: string | null
): string | null {
  if (controlValue >= CONTROL_THRESHOLD_HIGH) {
    return pushingFactionId;
  }
  if (controlValue <= CONTROL_THRESHOLD_LOW) {
    return null; // Contested
  }
  // In the middle zone (41-59), keep current controlling faction
  return currentControllingFactionId;
}

/**
 * Clamp a value to [0, 100]
 */
function clamp(value: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get player faction's enemies that can control districts
 */
function getControllableEnemies(playerFactionId: string): Faction[] {
  const playerFaction = getFactionById(playerFactionId);
  if (!playerFaction) return [];

  const enemyIds = playerFaction.enemies ?? [];
  const controllableEnemies = enemyIds
    .map(id => getFactionById(id))
    .filter((f): f is Faction => f !== undefined && f.canControlDistricts);

  return controllableEnemies;
}

/**
 * Get any controllable faction that is NOT the player faction
 * (fallback if no enemies are controllable)
 */
function getAnyOtherControllableFaction(playerFactionId: string): Faction | null {
  const otherFactions = controllableFactions.filter(f => f.id !== playerFactionId);
  return otherFactions.length > 0 ? otherFactions[0] : null;
}

// ============================================================
// Main Function
// ============================================================

/**
 * Apply world reactions after an encounter resolves.
 *
 * This should be called exactly once per encounter resolution,
 * immediately after the PRIMARY district update.
 *
 * @returns WorldReactionsResult with ripple and counter updates (if any)
 */
export async function applyWorldReactions(
  input: ApplyWorldReactionsInput
): Promise<WorldReactionsResult> {
  const { characterId, encounterDistrictId, playerFactionId, outcome } = input;

  const result: WorldReactionsResult = {
    rippleUpdate: null,
    counterUpdate: null,
  };

  // If character is not in a faction, no world reactions
  if (!playerFactionId) {
    return result;
  }

  // Validate faction can control districts
  if (!canFactionControlDistrict(playerFactionId)) {
    return result;
  }

  // Ensure all district states exist for this character
  await getDistrictStates(characterId);

  // Load all district states for this character
  const allDistrictStates = await prisma.districtState.findMany({
    where: { characterId },
  });

  // Create a map for quick lookup
  const stateByDistrict = new Map(
    allDistrictStates.map(s => [s.districtId, s])
  );

  // Track which district was used for ripple (to avoid using same for counter)
  let rippleDistrictId: string | null = null;

  // ============================================================
  // A) Ripple Effect (adjacent district pressure)
  // ============================================================

  const adjacentIds = getAdjacentDistrictIds(encounterDistrictId as DistrictId);

  if (adjacentIds.length > 0) {
    // Calculate ripple delta based on outcome
    const rippleDelta = outcome === 'success' || outcome === 'partial'
      ? RIPPLE_DELTA_SUCCESS
      : RIPPLE_DELTA_FAILURE;

    // Pick the best adjacent district
    const targetAdjacentId = pickRippleTarget(adjacentIds, stateByDistrict, rippleDelta);

    if (targetAdjacentId) {
      rippleDistrictId = targetAdjacentId;
      const state = stateByDistrict.get(targetAdjacentId);

      if (state) {
        const previousControlValue = state.controlValue;
        const previousControllingFactionId = state.controllingFactionId;

        // Apply delta: for success, push toward player faction
        // For failure, reduce control (or we could push toward opposing faction if tracked)
        // Since we're single-track, we just adjust the value
        let newControlValue: number;
        let pushingFaction: string;

        if (rippleDelta > 0) {
          // Success: push toward player faction
          newControlValue = clamp(previousControlValue + rippleDelta);
          pushingFaction = playerFactionId;
        } else {
          // Failure: reduce control (toward contested)
          // If player faction controls, reduce. Otherwise, we can skip or reduce anyway.
          // Simple approach: just reduce the value toward contested state
          newControlValue = clamp(previousControlValue + rippleDelta);
          pushingFaction = playerFactionId; // Still player's action, just negative
        }

        const newControllingFactionId = computeControllingFaction(
          newControlValue,
          playerFactionId,
          previousControllingFactionId
        );

        // Update database
        await prisma.districtState.update({
          where: {
            characterId_districtId: { characterId, districtId: targetAdjacentId },
          },
          data: {
            controlValue: newControlValue,
            controllingFactionId: newControllingFactionId,
          },
        });

        // Get display names
        const district = getDistrictById(targetAdjacentId);
        const faction = getFactionById(playerFactionId);
        const controllingFaction = newControllingFactionId ? getFactionById(newControllingFactionId) : null;

        result.rippleUpdate = {
          districtId: targetAdjacentId,
          districtName: district?.name ?? targetAdjacentId,
          delta: rippleDelta,
          previousControlValue,
          newControlValue,
          previousControllingFactionId,
          controllingFactionId: newControllingFactionId,
          controllingFactionName: controllingFaction?.name ?? null,
          reason: 'ripple',
          factionId: pushingFaction,
          factionName: faction?.name ?? pushingFaction,
        };

        console.log(
          `[WorldReactions] Ripple: ${district?.name ?? targetAdjacentId}: ` +
          `${previousControlValue}% → ${newControlValue}% (${rippleDelta > 0 ? '+' : ''}${rippleDelta})`
        );
      }
    }
  }

  // ============================================================
  // B) Counter-Move (city reacts elsewhere)
  // ============================================================

  // Pick an opposing controllable faction
  const controllableEnemies = getControllableEnemies(playerFactionId);
  let counterFaction: Faction | null = controllableEnemies.length > 0
    ? controllableEnemies[0] // Deterministic: first enemy
    : getAnyOtherControllableFaction(playerFactionId);

  if (counterFaction) {
    // Pick a target district for the counter-move
    const counterTarget = pickCounterTarget(
      encounterDistrictId,
      rippleDistrictId,
      counterFaction.id,
      stateByDistrict
    );

    if (counterTarget) {
      const state = stateByDistrict.get(counterTarget);

      if (state) {
        const previousControlValue = state.controlValue;
        const previousControllingFactionId = state.controllingFactionId;

        // Apply +5 toward the counter faction
        const newControlValue = clamp(previousControlValue + COUNTER_DELTA);
        const newControllingFactionId = computeControllingFaction(
          newControlValue,
          counterFaction.id,
          previousControllingFactionId
        );

        // Update database
        await prisma.districtState.update({
          where: {
            characterId_districtId: { characterId, districtId: counterTarget },
          },
          data: {
            controlValue: newControlValue,
            controllingFactionId: newControllingFactionId,
          },
        });

        // Get display names
        const district = getDistrictById(counterTarget);
        const controllingFaction = newControllingFactionId ? getFactionById(newControllingFactionId) : null;

        result.counterUpdate = {
          districtId: counterTarget,
          districtName: district?.name ?? counterTarget,
          delta: COUNTER_DELTA,
          previousControlValue,
          newControlValue,
          previousControllingFactionId,
          controllingFactionId: newControllingFactionId,
          controllingFactionName: controllingFaction?.name ?? null,
          reason: 'counter',
          factionId: counterFaction.id,
          factionName: counterFaction.name,
        };

        console.log(
          `[WorldReactions] Counter: ${counterFaction.shortName} +${COUNTER_DELTA} in ${district?.name ?? counterTarget}: ` +
          `${previousControlValue}% → ${newControlValue}%`
        );
      }
    }
  }

  return result;
}

// ============================================================
// Target Selection Logic
// ============================================================

/**
 * Pick which adjacent district to apply the ripple effect to.
 *
 * Priority:
 * 1. Prefer contested/neutral districts (controllingFactionId == null)
 * 2. Else pick the one closest to takeover threshold
 * 3. Deterministic tie-breaker (first in stable order)
 */
function pickRippleTarget(
  adjacentIds: DistrictId[],
  stateByDistrict: Map<string, { controlValue: number; controllingFactionId: string | null }>,
  rippleDelta: number
): string | null {
  if (adjacentIds.length === 0) return null;

  // Get states for adjacent districts
  const candidates = adjacentIds
    .map(id => {
      const state = stateByDistrict.get(id);
      return state ? { id, state } : null;
    })
    .filter((c): c is { id: DistrictId; state: { controlValue: number; controllingFactionId: string | null } } => c !== null);

  if (candidates.length === 0) return null;

  // Separate contested vs controlled
  const contested = candidates.filter(c => c.state.controllingFactionId === null);
  const controlled = candidates.filter(c => c.state.controllingFactionId !== null);

  // Prefer contested districts
  if (contested.length > 0) {
    // Among contested, pick the one closest to threshold
    // If rippleDelta > 0, we want to push toward 60 (control)
    // If rippleDelta < 0, we want to push toward 40 (contested stays contested)
    const target = rippleDelta > 0
      ? contested.reduce((best, c) => {
          const distToThreshold = CONTROL_THRESHOLD_HIGH - c.state.controlValue;
          const bestDist = CONTROL_THRESHOLD_HIGH - best.state.controlValue;
          return distToThreshold < bestDist ? c : best;
        })
      : contested[0]; // For negative delta, just pick first contested

    return target.id;
  }

  // No contested districts, pick controlled one closest to threshold
  if (controlled.length > 0) {
    const target = rippleDelta > 0
      ? controlled.reduce((best, c) => {
          const distToThreshold = CONTROL_THRESHOLD_HIGH - c.state.controlValue;
          const bestDist = CONTROL_THRESHOLD_HIGH - best.state.controlValue;
          return distToThreshold < bestDist ? c : best;
        })
      : controlled.reduce((best, c) => {
          const distToThreshold = c.state.controlValue - CONTROL_THRESHOLD_LOW;
          const bestDist = best.state.controlValue - CONTROL_THRESHOLD_LOW;
          return distToThreshold < bestDist ? c : best;
        });

    return target.id;
  }

  return null;
}

/**
 * Pick which district the counter faction should target.
 *
 * Constraints:
 * - Must NOT be the encounter's district
 * - Avoid the ripple district if possible
 *
 * Priority:
 * 1. Districts where controllingFactionId is null (contested)
 * 2. Districts already controlled by the counter faction (consolidation)
 * 3. Deterministic tie-breaker
 */
function pickCounterTarget(
  encounterDistrictId: string,
  rippleDistrictId: string | null,
  counterFactionId: string,
  stateByDistrict: Map<string, { controlValue: number; controllingFactionId: string | null }>
): string | null {
  // Get all district IDs from the data
  const allDistrictIds = districts.map(d => d.id);

  // Filter out encounter district and (if possible) ripple district
  let candidates = allDistrictIds.filter(id => id !== encounterDistrictId);

  // Get states for candidates
  const candidatesWithState = candidates
    .map(id => {
      const state = stateByDistrict.get(id);
      return state ? { id: id as string, state } : null;
    })
    .filter((c): c is { id: string; state: { controlValue: number; controllingFactionId: string | null } } => c !== null);

  if (candidatesWithState.length === 0) return null;

  // Separate by priority
  const contested = candidatesWithState.filter(c => c.state.controllingFactionId === null);
  const ownedByCounter = candidatesWithState.filter(c => c.state.controllingFactionId === counterFactionId);
  const otherControlled = candidatesWithState.filter(
    c => c.state.controllingFactionId !== null && c.state.controllingFactionId !== counterFactionId
  );

  // Helper to pick best from a list, avoiding ripple district if possible
  function pickBest(list: { id: string; state: { controlValue: number } }[]): string | null {
    if (list.length === 0) return null;

    // Try to avoid ripple district
    const filtered = rippleDistrictId ? list.filter(c => c.id !== rippleDistrictId) : list;
    const pool = filtered.length > 0 ? filtered : list;

    // Pick the one with lowest control value (easiest to push toward takeover)
    const best = pool.reduce((a, b) => a.state.controlValue < b.state.controlValue ? a : b);
    return best.id;
  }

  // Priority order: contested > owned by counter > other
  let result = pickBest(contested);
  if (result) return result;

  result = pickBest(ownedByCounter);
  if (result) return result;

  result = pickBest(otherControlled);
  return result;
}
