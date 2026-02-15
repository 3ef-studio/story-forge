/**
 * District State Manager
 *
 * Handles persistence and initialization of per-character district control state.
 * Uses share-based multi-faction control system where sum of all shares = 100%.
 */

import { prisma } from '@/app/lib/db';
import { districts, type DistrictId } from '@/app/data/districts';
import { controllableFactions, getFactionById } from '@/app/data/factions';
import { applyControlModifier } from '@/app/lib/world/applyDistrictModifiers';
import {
  applyControlGain,
  applyControlLoss,
  getOrInitDistrictShares,
  computeDistrictLeader,
  type DistrictShares,
  type DistrictLeader,
  type ShareUpdateResult,
} from '@/app/lib/world/districtControlShares';

// Re-export share types for external use
export type { DistrictShares, DistrictLeader, ShareUpdateResult };

// Types for district state
export interface DistrictStateRecord {
  id: string;
  characterId: string;
  districtId: string;
  controllingFactionId: string | null;
  controlValue: number;
  instability: number;
  shares?: DistrictShares | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DistrictStateWithMetadata extends DistrictStateRecord {
  districtName: string;
  districtIcon: string;
  controllingFactionName: string | null;
  controllingFactionShortName: string | null;
  shares: DistrictShares;
  leader: DistrictLeader;
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
 * Handles lazy migration from old single-track format to new share-based format.
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
    const existingIds = new Set(existingStates.map((s) => s.districtId));
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

  // Enrich with metadata and handle lazy migration to share format
  const enrichedStates: DistrictStateWithMetadata[] = [];

  for (const state of existingStates) {
    const enriched = await enrichDistrictStateWithShares(characterId, state);
    enrichedStates.push(enriched);
  }

  return enrichedStates;
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
  return enrichDistrictStateWithShares(characterId, state);
}

/**
 * Enrich a raw district state record with metadata and ensure shares are initialized.
 * Handles lazy migration from old format to new share-based format.
 */
async function enrichDistrictStateWithShares(
  characterId: string,
  state: { id: string; characterId: string; districtId: string; controllingFactionId: string | null; controlValue: number; instability: number; shares: unknown; createdAt: Date; updatedAt: Date }
): Promise<DistrictStateWithMetadata> {
  const district = districts.find(d => d.id === state.districtId);

  // Get or initialize shares (handles lazy migration)
  const { shares, leader } = await getOrInitDistrictShares(characterId, state.districtId);

  const faction = leader.leaderFactionId ? getFactionById(leader.leaderFactionId) : null;

  return {
    id: state.id,
    characterId: state.characterId,
    districtId: state.districtId,
    controllingFactionId: leader.leaderFactionId,
    controlValue: leader.leaderShare,
    instability: state.instability,
    shares,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    districtName: district?.name ?? state.districtId,
    districtIcon: district?.icon ?? '?',
    controllingFactionName: faction?.name ?? null,
    controllingFactionShortName: faction?.shortName ?? null,
    leader,
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
  deltaApplied: number;
  previousControlValue: number;
  newControlValue: number;
  previousControllingFactionId: string | null;
  controllingFactionId: string | null;
  controllingFactionName: string | null;
  reason: 'primary' | 'ripple' | 'counter' | 'death';
  sharesAfter: DistrictShares;
  leaderAfter: DistrictLeader;
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
 * Update district state after an encounter resolves.
 * Uses share-based multi-faction control system.
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

  // Ensure district states exist (lazy init if needed)
  await getDistrictStates(characterId);

  // Get current shares for comparison
  const { shares: sharesBefore, leader: leaderBefore } = await getOrInitDistrictShares(characterId, districtId);

  // Calculate delta with district-specific modifier
  const baseDelta = getControlDelta(outcome);
  const delta = applyControlModifier(baseDelta, districtId, 'primary');

  // Apply gain or loss based on delta sign
  let result: ShareUpdateResult;
  if (delta > 0) {
    // Success/partial: faction gains control
    result = await applyControlGain(characterId, districtId, factionId, delta, 'primary');
  } else {
    // Failure: faction loses control
    result = await applyControlLoss(characterId, districtId, factionId, Math.abs(delta), 'primary');
  }

  // Get display names for the response
  const faction = getFactionById(factionId);
  const controllingFaction = result.leaderAfter.leaderFactionId
    ? getFactionById(result.leaderAfter.leaderFactionId)
    : null;

  return {
    districtId,
    districtName: result.districtName,
    factionId,
    factionName: faction?.name ?? factionId,
    delta,
    deltaApplied: result.deltaApplied,
    previousControlValue: leaderBefore.leaderShare,
    newControlValue: result.leaderAfter.leaderShare,
    previousControllingFactionId: leaderBefore.leaderFactionId,
    controllingFactionId: result.leaderAfter.leaderFactionId,
    controllingFactionName: controllingFaction?.name ?? null,
    reason: 'primary',
    sharesAfter: result.sharesAfter,
    leaderAfter: result.leaderAfter,
  };
}
