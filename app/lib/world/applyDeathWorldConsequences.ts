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
import { getDistrictStates, canFactionControlDistrict, type DistrictShares, type DistrictLeader } from '@/app/lib/game-logic/district-state';
import { applyControlModifier, applyInstabilityModifier } from './applyDistrictModifiers';
import { applyControlLoss, getOrInitDistrictShares } from './districtControlShares';

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
  controlDeltaApplied: number;
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
  sharesAfter: DistrictShares;
  leaderAfter: DistrictLeader;
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

// ============================================================
// Main Function
// ============================================================

/**
 * Apply world consequences when a character dies.
 *
 * Effects:
 * - District control hit: -15 in the encounter's district (using share-based system)
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

  // Get current shares and instability
  const { shares: sharesBefore, leader: leaderBefore } = await getOrInitDistrictShares(characterId, encounterDistrictId);

  const districtState = await prisma.districtState.findUnique({
    where: {
      characterId_districtId: { characterId, districtId: encounterDistrictId },
    },
  });

  if (!districtState) {
    console.error(`[DeathWorld] District state not found for ${encounterDistrictId}`);
    return result;
  }

  const previousInstability = districtState.instability;

  // Apply district-specific modifiers to the death deltas
  const controlDelta = applyControlModifier(DEATH_CONTROL_DELTA, encounterDistrictId, 'death');
  const instabilityDelta = applyInstabilityModifier(DEATH_INSTABILITY_DELTA, encounterDistrictId);

  // Apply control loss using share-based system
  const shareResult = await applyControlLoss(characterId, encounterDistrictId, playerFactionId, Math.abs(controlDelta), 'death');

  // Apply instability spike (separate from share system)
  const newInstability = clamp(previousInstability + instabilityDelta);
  await prisma.districtState.update({
    where: {
      characterId_districtId: { characterId, districtId: encounterDistrictId },
    },
    data: {
      instability: newInstability,
    },
  });

  // Get display names
  const district = getDistrictById(encounterDistrictId);
  const faction = getFactionById(playerFactionId);
  const controllingFaction = shareResult.leaderAfter.leaderFactionId
    ? getFactionById(shareResult.leaderAfter.leaderFactionId)
    : null;

  console.log(
    `[DeathWorld] Death consequences in ${district?.name ?? encounterDistrictId}: ` +
    `Control ${leaderBefore.leaderShare}% → ${shareResult.leaderAfter.leaderShare}% (${shareResult.deltaApplied}), ` +
    `Instability ${previousInstability} → ${newInstability} (+${instabilityDelta})`
  );

  result.deathUpdate = {
    districtId: encounterDistrictId,
    districtName: district?.name ?? encounterDistrictId,
    controlDelta,
    controlDeltaApplied: shareResult.deltaApplied,
    previousControlValue: leaderBefore.leaderShare,
    newControlValue: shareResult.leaderAfter.leaderShare,
    previousControllingFactionId: leaderBefore.leaderFactionId,
    controllingFactionId: shareResult.leaderAfter.leaderFactionId,
    controllingFactionName: controllingFaction?.name ?? null,
    instabilityDelta,
    previousInstability,
    newInstability,
    reason: 'death',
    factionId: playerFactionId,
    factionName: faction?.name ?? playerFactionId,
    sharesAfter: shareResult.sharesAfter,
    leaderAfter: shareResult.leaderAfter,
  };

  return result;
}
