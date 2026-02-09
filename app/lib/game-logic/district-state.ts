/**
 * District State Manager
 *
 * Handles persistence and initialization of per-character district control state.
 * This is a minimal, additive system that does NOT modify encounter/combat logic.
 */

import { prisma } from '@/app/lib/db';
import { districts, type DistrictId } from '@/app/data/districts';
import { controllableFactions, getFactionById } from '@/app/data/factions';

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
