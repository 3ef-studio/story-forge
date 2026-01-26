/**
 * Power Progression Module
 * Handles power selection, XP awards, and leveling during encounter resolution
 */

import {
  getPowerById,
  calculateCombatPower,
  calculateXPForLevel,
  type Power,
  type PowerCategory,
} from '@/app/data/powers';
import type { Approach } from './combat/types';

// Approach to power category mapping
const APPROACH_POWER_CATEGORIES: Record<Approach, PowerCategory[]> = {
  direct: ['physical', 'energy'],
  subtle: ['utility'],
  diplomatic: ['mental'],
  tactical: ['defensive', 'mental', 'utility'],
};

// Character power from DB
export type CharacterPower = {
  powerId: string;
  currentLevel: number;
  currentXp: number;
  timesUsed: number;
};

// Power progression result
export type PowerProgressionResult = {
  powerId: string;
  powerName: string;
  powerCategory: PowerCategory;
  levelBefore: number;
  xpBefore: number;
  levelAfter: number;
  xpAfter: number;
  xpGained: number;
  leveledUp: boolean;
  powerBonus: number;
  xpToNextLevel: number;
};

/**
 * Select the power to use based on approach and character's owned powers
 */
export function selectPowerForApproach(
  approach: Approach,
  characterPowers: CharacterPower[]
): { power: Power; characterPower: CharacterPower } | null {
  if (characterPowers.length === 0) return null;

  // Get preferred categories for this approach
  const preferredCategories = APPROACH_POWER_CATEGORIES[approach];

  // Build list of owned powers with their definitions and combat power
  const ownedPowersWithDef = characterPowers
    .map((cp) => {
      const powerDef = getPowerById(cp.powerId);
      if (!powerDef) return null;
      return {
        characterPower: cp,
        powerDef,
        combatPower: calculateCombatPower(powerDef, cp.currentLevel),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (ownedPowersWithDef.length === 0) return null;

  // Find powers matching preferred categories
  const matchingPowers = ownedPowersWithDef.filter((p) =>
    preferredCategories.includes(p.powerDef.category)
  );

  // If we have matching powers, pick the one with highest combat power
  if (matchingPowers.length > 0) {
    const best = matchingPowers.reduce((a, b) =>
      b.combatPower > a.combatPower ? b : a
    );
    return { power: best.powerDef, characterPower: best.characterPower };
  }

  // No match - pick the owned power with highest combat power
  const best = ownedPowersWithDef.reduce((a, b) =>
    b.combatPower > a.combatPower ? b : a
  );
  return { power: best.powerDef, characterPower: best.characterPower };
}

/**
 * Calculate power XP to award based on difficulty and outcome
 */
export function calculatePowerXpGain(
  difficulty: number,
  success: boolean
): number {
  const basePowerXP = 8 + difficulty * 4;
  const outcomeBonus = success ? 6 : 2;
  return basePowerXP + outcomeBonus;
}

/**
 * Calculate power bonus modifier for encounter resolution
 * Returns a bounded value to avoid rebalancing combat
 */
export function calculatePowerBonus(power: Power, currentLevel: number): number {
  const powerEffect = calculateCombatPower(power, currentLevel);
  return Math.floor(powerEffect / 12);
}

/**
 * Process power progression after encounter resolution
 * Returns the progression result with before/after state
 */
export function processPowerProgression(
  power: Power,
  characterPower: CharacterPower,
  xpGained: number
): PowerProgressionResult {
  const levelBefore = characterPower.currentLevel;
  const xpBefore = characterPower.currentXp;

  // Calculate new XP
  let newXp = xpBefore + xpGained;
  let newLevel = levelBefore;
  let leveledUp = false;

  // Check for level up
  const xpNeeded = calculateXPForLevel(power, levelBefore + 1);
  if (newXp >= xpNeeded && levelBefore < power.maxLevel) {
    newLevel = levelBefore + 1;
    newXp = newXp - xpNeeded;
    leveledUp = true;
  }

  // Calculate XP needed for next level (after potential level up)
  const xpToNextLevel = calculateXPForLevel(power, newLevel + 1);

  return {
    powerId: power.id,
    powerName: power.name,
    powerCategory: power.category,
    levelBefore,
    xpBefore,
    levelAfter: newLevel,
    xpAfter: newXp,
    xpGained,
    leveledUp,
    powerBonus: calculatePowerBonus(power, levelBefore), // Use pre-level bonus for this encounter
    xpToNextLevel,
  };
}
