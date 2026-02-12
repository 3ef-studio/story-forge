/**
 * Death World Consequences
 *
 * When a character dies (hits 0 HP), apply world consequences:
 * 1) District control hit: -15 in the encounter's district
 * 2) Instability spike: +10 in that district
 */

import { prisma } from '@/app/lib/db';
import { getDistrictById } from '@/app/data/districts';
import { getFactionById } from '@/app/data/factions';
import { getDistrictStates, canFactionControlDistrict } from '@/app/lib/game-logic/district-state';
import { applyControlModifier, applyInstabilityModifier } from './applyDistrictModifiers';

// ============================================================
// Constants
// ============================================================

export const DEATH_CONTROL_DELTA = -15;
export const DEATH_INSTABILITY_DELTA = 10;

// Control thresholds (same as primary update logic)
const CONTROL_THRESHOLD_HIGH = 60;
const CONTROL_THRESHOLD_LOW = 40;

// ============================================================
// Types
// ============================================================

export interface DeathWorldUpdate {
  districtId: string;
  districtName: string;
  controlDelta: number;
  previousControlValue: number;
  newControlValue: number;
  previousControllingFactionId: string | null;
  controllingFactionId: string | null;
  controllingFactionName: string | null;
  instabilityDelta: number;
  previousInstability: number;
  newInstability: number;
  reason: 'death';
  factionId: string;
  factionName: string;
}

export interface DeathWorldConsequencesResult {
  deathUpdate: DeathWorldUpdate | null;
}

export interface ApplyDeathWorldConsequencesInput {
  characterId: string;
  encounterDistrictId: string;
  playerFactionId: string | null;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Clamp a value to [min, max]
 */
function clamp(value: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, value));
}

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

// ============================================================
// Main Function
// ============================================================

/**
 * Apply world consequences when a character dies.
 *
 * Effects:
 * - District control hit: -15 in the encounter's district
 * - Instability spike: +10 in that district
 *
 * @param input - The death context
 * @returns DeathWorldConsequencesResult with the death update (if any)
 */
export async function applyDeathWorldConsequences(
  input: ApplyDeathWorldConsequencesInput
): Promise<DeathWorldConsequencesResult> {
  const { characterId, encounterDistrictId, playerFactionId } = input;

  const result: DeathWorldConsequencesResult = {
    deathUpdate: null,
  };

  // If character has no faction, skip world consequences
  if (!playerFactionId) {
    console.log('[DeathWorld] No faction - skipping world consequences');
    return result;
  }

  // Validate faction can control districts
  if (!canFactionControlDistrict(playerFactionId)) {
    console.log(`[DeathWorld] Faction ${playerFactionId} cannot control districts - skipping`);
    return result;
  }

  // Ensure all district states exist for this character
  await getDistrictStates(characterId);

  // Get the current district state
  const districtState = await prisma.districtState.findUnique({
    where: {
      characterId_districtId: { characterId, districtId: encounterDistrictId },
    },
  });

  if (!districtState) {
    console.error(`[DeathWorld] District state not found for ${encounterDistrictId}`);
    return result;
  }

  // Calculate new values
  const previousControlValue = districtState.controlValue;
  const previousInstability = districtState.instability;
  const previousControllingFactionId = districtState.controllingFactionId;

  // Apply district-specific modifiers to the death deltas
  const controlDelta = applyControlModifier(DEATH_CONTROL_DELTA, encounterDistrictId, 'death');
  const instabilityDelta = applyInstabilityModifier(DEATH_INSTABILITY_DELTA, encounterDistrictId);

  // Apply control hit (negative delta)
  const newControlValue = clamp(previousControlValue + controlDelta);

  // Apply instability spike
  const newInstability = clamp(previousInstability + instabilityDelta);

  // Determine new controlling faction
  // Note: For death, we're reducing control, so the current faction may lose control
  // We use the player's faction as the "pushing" faction, but since delta is negative,
  // control will decrease. If it drops below 40, it becomes contested.
  const newControllingFactionId = computeControllingFaction(
    newControlValue,
    playerFactionId,
    previousControllingFactionId
  );

  // Update the database
  await prisma.districtState.update({
    where: {
      characterId_districtId: { characterId, districtId: encounterDistrictId },
    },
    data: {
      controlValue: newControlValue,
      controllingFactionId: newControllingFactionId,
      instability: newInstability,
    },
  });

  // Get display names
  const district = getDistrictById(encounterDistrictId);
  const faction = getFactionById(playerFactionId);
  const controllingFaction = newControllingFactionId ? getFactionById(newControllingFactionId) : null;

  console.log(
    `[DeathWorld] Death consequences in ${district?.name ?? encounterDistrictId}: ` +
    `Control ${previousControlValue}% → ${newControlValue}% (${controlDelta}), ` +
    `Instability ${previousInstability} → ${newInstability} (+${instabilityDelta})`
  );

  result.deathUpdate = {
    districtId: encounterDistrictId,
    districtName: district?.name ?? encounterDistrictId,
    controlDelta,
    previousControlValue,
    newControlValue,
    previousControllingFactionId,
    controllingFactionId: newControllingFactionId,
    controllingFactionName: controllingFaction?.name ?? null,
    instabilityDelta,
    previousInstability,
    newInstability,
    reason: 'death',
    factionId: playerFactionId,
    factionName: faction?.name ?? playerFactionId,
  };

  return result;
}
