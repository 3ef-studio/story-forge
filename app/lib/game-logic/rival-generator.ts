/**
 * Deterministic rival generation.
 * Uses seeded RNG so the same character always produces the same rival.
 */

import { hashStringToSeed, createSeededRng, seededPick, seededInt } from '@/app/lib/utils/rng';
import {
  type RivalRole,
  type RivalPersonality,
  RIVAL_PERSONALITIES,
  heroNames,
  villainNames,
  nameSuffixes,
  SUFFIX_PROBABILITY,
  POWER_COUNTERS,
  LAWFUL_FACTION_IDS,
  CRIMINAL_FACTION_IDS,
} from '@/app/data/rivals';
import { getPowerById } from '@/app/data/powers';

// --- Input types ---

interface CharacterPowerInput {
  powerId: string;
  currentLevel: number;
  currentXp: number;
  timesUsed: number;
}

interface GenerateRivalInput {
  characterId: string;
  characterLevel: number;
  attributes: Record<string, number>;
  powers: CharacterPowerInput[];
  factionReputations: Record<string, number>;
}

// --- Output type (matches Prisma create shape) ---

export interface RivalCreateInput {
  characterId: string;
  name: string;
  role: RivalRole;
  personality: RivalPersonality;
  level: number;
  attributes: Record<string, number>;
  powers: RivalPowerEntry[];
  hostility: number;
  notoriety: number;
}

interface RivalPowerEntry {
  powerId: string;
  currentLevel: number;
  currentXp: number;
  timesUsed: number;
}

// --- Role decision ---

function determineRole(factionReputations: Record<string, number>): RivalRole {
  let lawfulScore = 0;
  let criminalScore = 0;

  for (const factionId of LAWFUL_FACTION_IDS) {
    lawfulScore += factionReputations[factionId] ?? 0;
  }
  for (const factionId of CRIMINAL_FACTION_IDS) {
    criminalScore += factionReputations[factionId] ?? 0;
  }

  // Player is villain-coded if criminal rep is significantly higher OR lawful rep is deeply negative
  if (criminalScore > lawfulScore + 20 || lawfulScore < -30) {
    return 'hero'; // spawn hero rival to oppose villain player
  }
  return 'villain'; // spawn villain rival to oppose hero player
}

// --- Name generation ---

function generateName(role: RivalRole, rng: () => number): string {
  const nameList = role === 'hero' ? heroNames : villainNames;
  let name = seededPick(nameList, rng);

  if (rng() < SUFFIX_PROBABILITY) {
    name = `${name} ${seededPick(nameSuffixes, rng)}`;
  }

  return name;
}

// --- Attribute generation ---

function generateAttributes(
  playerAttributes: Record<string, number>,
  rng: () => number,
): Record<string, number> {
  const rivalAttributes: Record<string, number> = {};

  for (const [attrId, value] of Object.entries(playerAttributes)) {
    const variation = seededInt(-3, 3, rng);
    rivalAttributes[attrId] = Math.max(1, value + variation);
  }

  return rivalAttributes;
}

// --- Power generation ---

function generatePowers(
  playerPowers: CharacterPowerInput[],
  rng: () => number,
): RivalPowerEntry[] {
  if (playerPowers.length === 0) {
    // Give rival at least 1 default power
    return [{
      powerId: 'super_strength',
      currentLevel: 1,
      currentXp: 0,
      timesUsed: 0,
    }];
  }

  const rivalPowers: RivalPowerEntry[] = [];
  const usedPowerIds = new Set<string>();
  let hasCounter = false;

  for (const playerPower of playerPowers) {
    const counterPowerId = POWER_COUNTERS[playerPower.powerId];

    // Try to add one counter power
    if (!hasCounter && counterPowerId && !usedPowerIds.has(counterPowerId)) {
      const counterPower = getPowerById(counterPowerId);
      if (counterPower) {
        rivalPowers.push({
          powerId: counterPowerId,
          currentLevel: Math.max(1, playerPower.currentLevel + seededInt(-1, 1, rng)),
          currentXp: 0,
          timesUsed: 0,
        });
        usedPowerIds.add(counterPowerId);
        hasCounter = true;
        continue;
      }
    }

    // Mirror the player's power
    if (!usedPowerIds.has(playerPower.powerId)) {
      rivalPowers.push({
        powerId: playerPower.powerId,
        currentLevel: Math.max(1, playerPower.currentLevel + seededInt(-1, 1, rng)),
        currentXp: 0,
        timesUsed: 0,
      });
      usedPowerIds.add(playerPower.powerId);
    }
  }

  return rivalPowers;
}

// --- Main generator ---

export function generateRivalForCharacter(input: GenerateRivalInput): RivalCreateInput {
  const seed = hashStringToSeed(input.characterId);
  const rng = createSeededRng(seed);

  const role = determineRole(input.factionReputations);
  const name = generateName(role, rng);
  const personality = seededPick(RIVAL_PERSONALITIES, rng);
  const attributes = generateAttributes(input.attributes, rng);
  const powers = generatePowers(input.powers, rng);

  return {
    characterId: input.characterId,
    name,
    role,
    personality,
    level: input.characterLevel,
    attributes,
    powers,
    hostility: seededInt(10, 30, rng),
    notoriety: seededInt(5, 20, rng),
  };
}
