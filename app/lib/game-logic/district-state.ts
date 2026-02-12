/**
 * District State Manager
 *
 * Handles persistence and initialization of per-character district control state.
 * This is a minimal, additive system that does NOT modify encounter/combat logic.
 */

import { prisma } from '@/app/lib/db';
import { districts, type DistrictId } from '@/app/data/districts';
import { controllableFactions, getFactionById } from '@/app/data/factions';
import { applyControlModifier } from '@/app/lib/world/applyDistrictModifiers';

// Types for district state
export interface DistrictStateRecord {
  id: string;
  characterId: string;
  districtId: string;
  controllingFactionId: string | null;
  controlValue: number;
  instability: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DistrictStateWithMetadata extends DistrictStateRecord {
  districtName: string;
  districtIcon: string;
  controllingFactionName: string | null;
  controllingFactionShortName: string | null;
}

// Default initial state for each district
const DEFAULT_DISTRICT_STATES: Record<DistrictId, { factionId: string | null; controlValue: number; instability: number }> = {
  downtown: { factionId: 'guardian_initiative', controlValue: 60, instability: 10 },
  industrial: { factionId: 'syndicate', controlValue: 55, instability: 20 },
  waterfront: { factionId: 'syndicate', controlValue: 50, instability: 25 },
  slums: { factionId: null, controlValue: 30, instability: 40 }, // Contested
  midtown: { factionId: 'vigilante_network', controlValue: 45, instability: 15 },
};

/**
 * Get all district states for a character, initializing if necessary.
 * This is the main entry point for the map screen.
 */
export async function getDistrictStates(characterId: string): Promise<DistrictStateWithMetadata[]> {
  // Check if states exist
  const existingStates = await prisma.districtState.findMany({
    where: { characterId },
  });

  // Initialize if no states exist
  if (existingStates.length === 0) {
    await initializeDistrictStates(characterId);
    return getDistrictStates(characterId); // Recurse to fetch the newly created states
  }

  // If partial states exist (shouldn't happen, but handle gracefully)
  if (existingStates.length < districts.length) {
    const existingIds = new Set(existingStates.map((s: DistrictStateRecord) => s.districtId));
    const missingDistricts = districts.filter(d => !existingIds.has(d.id));

    for (const district of missingDistricts) {
      const defaults = DEFAULT_DISTRICT_STATES[district.id as DistrictId];
      await prisma.districtState.create({
        data: {
          characterId,
          districtId: district.id,
          controllingFactionId: defaults.factionId,
          controlValue: defaults.controlValue,
          instability: defaults.instability,
        },
      });
    }

    return getDistrictStates(characterId);
  }

  // Enrich with metadata
  return existingStates.map((state: DistrictStateRecord) => enrichDistrictState(state));
}

/**
 * Initialize district states for a new character.
 */
async function initializeDistrictStates(characterId: string): Promise<void> {
  const createData = districts.map(district => {
    const defaults = DEFAULT_DISTRICT_STATES[district.id as DistrictId];
    return {
      characterId,
      districtId: district.id,
      controllingFactionId: defaults.factionId,
      controlValue: defaults.controlValue,
      instability: defaults.instability,
    };
  });

  await prisma.districtState.createMany({
    data: createData,
    skipDuplicates: true,
  });

  console.log(`[DistrictState] Initialized ${districts.length} district states for character ${characterId}`);
}

/**
 * Get a single district state by ID.
 */
export async function getDistrictState(
  characterId: string,
  districtId: string
): Promise<DistrictStateWithMetadata | null> {
  const state = await prisma.districtState.findUnique({
    where: {
      characterId_districtId: { characterId, districtId },
    },
  });

  if (!state) return null;
  return enrichDistrictState(state);
}

/**
 * Enrich a raw district state record with metadata from static data.
 */
function enrichDistrictState(state: DistrictStateRecord): DistrictStateWithMetadata {
  const district = districts.find(d => d.id === state.districtId);
  const faction = state.controllingFactionId ? getFactionById(state.controllingFactionId) : null;

  return {
    ...state,
    districtName: district?.name ?? state.districtId,
    districtIcon: district?.icon ?? '?',
    controllingFactionName: faction?.name ?? null,
    controllingFactionShortName: faction?.shortName ?? null,
  };
}

/**
 * Validate that a faction can control districts.
 */
export function canFactionControlDistrict(factionId: string): boolean {
  return controllableFactions.some(f => f.id === factionId);
}

/**
 * Get the controllable faction IDs for reference.
 */
export function getControllableFactionIds(): string[] {
  return controllableFactions.map(f => f.id);
}

// ============================================================
// World State Updates from Encounters
// ============================================================

export type EncounterOutcome = 'success' | 'partial' | 'failure';

export interface WorldUpdateResult {
  districtId: string;
  districtName: string;
  factionId: string;
  factionName: string;
  delta: number;
  previousControlValue: number;
  newControlValue: number;
  previousControllingFactionId: string | null;
  controllingFactionId: string | null;
  controllingFactionName: string | null;
}

/**
 * Compute the control delta based on encounter outcome.
 * Success: +10, Partial: +5, Failure: -10
 */
function getControlDelta(outcome: EncounterOutcome): number {
  switch (outcome) {
    case 'success':
      return 10;
    case 'partial':
      return 5;
    case 'failure':
      return -10;
  }
}

/**
 * Determine controlling faction based on control value thresholds.
 * >= 60: faction controls, <= 40: contested (null), otherwise unchanged
 */
function computeControllingFaction(
  controlValue: number,
  factionId: string,
  currentControllingFactionId: string | null
): string | null {
  if (controlValue >= 60) {
    return factionId;
  }
  if (controlValue <= 40) {
    return null; // Contested
  }
  // In the middle zone (41-59), keep current controlling faction
  return currentControllingFactionId;
}

/**
 * Update district state after an encounter resolves.
 *
 * Called once after encounter resolution to update world state based on outcome.
 *
 * @param characterId - The character's ID (scope for district state)
 * @param districtId - The district where the encounter took place
 * @param factionId - The character's faction (null means no update)
 * @param outcome - 'success', 'partial', or 'failure'
 * @returns WorldUpdateResult or null if no update was made
 */
export async function updateDistrictStateFromEncounter(
  characterId: string,
  districtId: string,
  factionId: string | null,
  outcome: EncounterOutcome
): Promise<WorldUpdateResult | null> {
  // If character is not in a faction, no district control update
  if (!factionId) {
    return null;
  }

  // Validate faction can control districts
  if (!canFactionControlDistrict(factionId)) {
    console.warn(`[DistrictState] Faction ${factionId} cannot control districts`);
    return null;
  }

  // Ensure district state exists (lazy init if needed)
  let districtState = await prisma.districtState.findUnique({
    where: {
      characterId_districtId: { characterId, districtId },
    },
  });

  // If no state exists, initialize all district states for this character
  if (!districtState) {
    await getDistrictStates(characterId); // This initializes if needed
    districtState = await prisma.districtState.findUnique({
      where: {
        characterId_districtId: { characterId, districtId },
      },
    });
  }

  // If still no state (shouldn't happen), bail
  if (!districtState) {
    console.error(`[DistrictState] Failed to find/create state for district ${districtId}`);
    return null;
  }

  // Calculate delta and new control value
  // Apply district-specific modifier to the base delta
  const baseDelta = getControlDelta(outcome);
  const delta = applyControlModifier(baseDelta, districtId, 'primary');
  const previousControlValue = districtState.controlValue;
  const newControlValue = Math.max(0, Math.min(100, previousControlValue + delta));

  // Determine new controlling faction
  const previousControllingFactionId = districtState.controllingFactionId;
  const newControllingFactionId = computeControllingFaction(
    newControlValue,
    factionId,
    previousControllingFactionId
  );

  // Update the database
  await prisma.districtState.update({
    where: {
      characterId_districtId: { characterId, districtId },
    },
    data: {
      controlValue: newControlValue,
      controllingFactionId: newControllingFactionId,
    },
  });

  // Get display names for the response
  const district = districts.find(d => d.id === districtId);
  const faction = getFactionById(factionId);
  const controllingFaction = newControllingFactionId ? getFactionById(newControllingFactionId) : null;

  console.log(
    `[DistrictState] ${district?.name ?? districtId}: ${previousControlValue}% → ${newControlValue}% (${delta > 0 ? '+' : ''}${delta}) | ` +
    `Control: ${previousControllingFactionId ?? 'contested'} → ${newControllingFactionId ?? 'contested'}`
  );

  return {
    districtId,
    districtName: district?.name ?? districtId,
    factionId,
    factionName: faction?.name ?? factionId,
    delta,
    previousControlValue,
    newControlValue,
    previousControllingFactionId,
    controllingFactionId: newControllingFactionId,
    controllingFactionName: controllingFaction?.name ?? null,
  };
}
