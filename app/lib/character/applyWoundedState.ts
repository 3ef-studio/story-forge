/**
 * Wounded State Manager
 *
 * Handles applying and clearing the wounded state when a character dies (hits 0 HP).
 * Wounded state adds difficulty (+2 heat) and lasts for 6 encounters.
 */

import { prisma } from '@/app/lib/db';

// ============================================================
// Constants
// ============================================================

export const WOUNDED_ENCOUNTERS_DURATION = 6;
export const WOUNDED_HEAT_PENALTY = 2;

// ============================================================
// Types
// ============================================================

export interface WoundedStateResult {
  isWounded: boolean;
  heatDelta: number;
  durationType: 'encounters';
  encountersRemaining: number;
  wasAlreadyWounded: boolean;
}

export interface CharacterWoundedState {
  isWounded: boolean;
  woundedEncountersRemaining: number;
  heat: number;
}

// ============================================================
// Apply Wounded State (on death)
// ============================================================

/**
 * Apply wounded state to a character after death.
 * If already wounded, refresh the duration.
 *
 * @param characterId - The character's ID
 * @param currentActionCounter - The current action counter
 * @param currentHeat - The current heat value
 * @returns WoundedStateResult with details of the wounded state
 */
export async function applyWoundedState(
  characterId: string,
  currentActionCounter: number,
  currentHeat: number
): Promise<WoundedStateResult> {
  // Check if character is already wounded
  // Note: Using type assertion for new schema fields until migration is run
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  }) as { isWounded?: boolean; woundedEncountersRemaining?: number } | null;

  const wasAlreadyWounded = character?.isWounded ?? false;

  // Apply wounded state with heat penalty
  const newHeat = Math.min(100, currentHeat + WOUNDED_HEAT_PENALTY);

  // Note: Using type assertion for new schema fields until migration is run
  await prisma.character.update({
    where: { id: characterId },
    data: {
      isWounded: true,
      woundedEncountersRemaining: WOUNDED_ENCOUNTERS_DURATION,
      woundedAtActionCounter: currentActionCounter,
      heat: newHeat,
      // Restore HP to a minimal amount so the character can continue
      currentHp: 10, // Revive with 10 HP
    } as Record<string, unknown>,
  });

  console.log(
    `[WoundedState] Character ${characterId} is now wounded. ` +
    `Heat: +${WOUNDED_HEAT_PENALTY} (now ${newHeat}). ` +
    `Duration: ${WOUNDED_ENCOUNTERS_DURATION} encounters.`
  );

  return {
    isWounded: true,
    heatDelta: WOUNDED_HEAT_PENALTY,
    durationType: 'encounters',
    encountersRemaining: WOUNDED_ENCOUNTERS_DURATION,
    wasAlreadyWounded,
  };
}

// ============================================================
// Decrement Wounded Counter (after each encounter)
// ============================================================

/**
 * Decrement the wounded encounter counter after an encounter resolves.
 * Call this at the end of every encounter resolution (before death check).
 *
 * @param characterId - The character's ID
 * @returns The updated wounded state, or null if not wounded
 */
export async function decrementWoundedCounter(
  characterId: string
): Promise<CharacterWoundedState | null> {
  // Note: Using type assertion for new schema fields until migration is run
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  }) as { isWounded?: boolean; woundedEncountersRemaining?: number; heat?: number } | null;

  if (!character || !character.isWounded) {
    return null;
  }

  const newRemaining = Math.max(0, (character.woundedEncountersRemaining ?? 0) - 1);
  const shouldClearWounded = newRemaining === 0;

  if (shouldClearWounded) {
    // Clear wounded state
    // Note: Using type assertion for new schema fields until migration is run
    await prisma.character.update({
      where: { id: characterId },
      data: {
        isWounded: false,
        woundedEncountersRemaining: 0,
        woundedAtActionCounter: null,
      } as Record<string, unknown>,
    });

    console.log(`[WoundedState] Character ${characterId} has recovered from wounded state.`);

    return {
      isWounded: false,
      woundedEncountersRemaining: 0,
      heat: character.heat ?? 0,
    };
  } else {
    // Decrement counter
    // Note: Using type assertion for new schema fields until migration is run
    await prisma.character.update({
      where: { id: characterId },
      data: {
        woundedEncountersRemaining: newRemaining,
      } as Record<string, unknown>,
    });

    console.log(
      `[WoundedState] Character ${characterId} wounded encounters remaining: ${newRemaining}`
    );

    return {
      isWounded: true,
      woundedEncountersRemaining: newRemaining,
      heat: character.heat ?? 0,
    };
  }
}

// ============================================================
// Check Wounded Status (for difficulty modifier)
// ============================================================

/**
 * Check if a character is currently wounded.
 * Used by encounter resolution to apply difficulty modifiers.
 *
 * @param characterId - The character's ID
 * @returns CharacterWoundedState or null
 */
export async function getWoundedState(
  characterId: string
): Promise<CharacterWoundedState | null> {
  // Note: Using type assertion for new schema fields until migration is run
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  }) as { isWounded?: boolean; woundedEncountersRemaining?: number; heat?: number } | null;

  if (!character) {
    return null;
  }

  return {
    isWounded: character.isWounded ?? false,
    woundedEncountersRemaining: character.woundedEncountersRemaining ?? 0,
    heat: character.heat ?? 0,
  };
}

/**
 * Get the difficulty modifier for a wounded character.
 * Returns the heat penalty that should be applied to encounters.
 *
 * @param isWounded - Whether the character is wounded
 * @returns The heat/difficulty modifier (0 if not wounded)
 */
export function getWoundedDifficultyModifier(isWounded: boolean): number {
  return isWounded ? WOUNDED_HEAT_PENALTY : 0;
}
