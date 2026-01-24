/**
 * Character utility functions
 * Extracted from API routes to reduce duplication (Issues #7, #12, #13)
 */

import { prisma } from '@/app/lib/db';

// Types for character data from Prisma
interface CharacterAttribute {
  attributeId: string;
  currentValue: number;
}

interface FactionReputation {
  factionId: string;
  reputation: number;
}

interface ActionCooldown {
  actionId: string;
  expiresAt: Date;
}

/**
 * Build attribute map from character attributes array
 */
export function buildAttributeMap(attributes: CharacterAttribute[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const attr of attributes) {
    map[attr.attributeId] = attr.currentValue;
  }
  return map;
}

/**
 * Build faction reputation map from character faction reputations array
 */
export function buildFactionReputationMap(factionReputations: FactionReputation[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const rep of factionReputations) {
    map[rep.factionId] = rep.reputation;
  }
  return map;
}

// Alias for backward compatibility
export const buildFactionMap = buildFactionReputationMap;

/**
 * Build cooldowns map from character action cooldowns array
 */
export function buildCooldownMap(cooldowns: ActionCooldown[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cd of cooldowns) {
    map[cd.actionId] = cd.expiresAt.toISOString();
  }
  return map;
}

/**
 * Check if energy should be restored (24+ hours since last reset)
 * Returns true if energy needs restoration, false otherwise
 * This is a read-only check - use applyEnergyReset to actually reset
 */
export function shouldRestoreEnergy(lastEnergyReset: Date): boolean {
  const now = new Date();
  const hoursSinceReset = (now.getTime() - lastEnergyReset.getTime()) / (1000 * 60 * 60);
  return hoursSinceReset >= 24;
}

/**
 * Apply energy reset to character (mutates database)
 * Should only be called during POST operations, not GET
 * Returns the new energy value and reset timestamp
 */
export async function applyEnergyReset(
  characterId: string,
  maxEnergy: number
): Promise<{ currentEnergy: number; lastEnergyReset: Date }> {
  const now = new Date();
  await prisma.character.update({
    where: { id: characterId },
    data: {
      currentEnergy: maxEnergy,
      lastEnergyReset: now,
    },
  });
  return { currentEnergy: maxEnergy, lastEnergyReset: now };
}

/**
 * Fisher-Yates shuffle algorithm - unbiased random shuffle
 * Fixes Issue #4 - previous implementation used biased sort
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Pick random items from array using Fisher-Yates
 */
export function pickRandom<T>(array: T[], count: number): T[] {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}
