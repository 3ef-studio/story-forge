/**
 * Fight Club Combat Simulator
 *
 * Runs a simulated fight between two player snapshots using the existing conflict engine.
 * - Uses AI to control the defender
 * - No state changes persist (simulation only)
 * - Returns the full combat transcript
 */

import {
  initConflict,
  executeTurn,
  evaluateOutcome,
  getPlayerMoves,
} from '../conflict/engine';
import { selectOpponentMove } from '../conflict/ai';
import type { ConflictState, ConflictResult, MoveId } from '../conflict/types';
import type { CombatantSnapshot } from './types';

// ============================================================
// Combat Simulator
// ============================================================

/**
 * Run a simulated PvP combat between attacker and defender.
 * Uses AI to control both sides (attacker AI simulates optimal play).
 * Returns the full combat result for transcript storage.
 */
export function runPvpCombat(
  attacker: CombatantSnapshot,
  defender: CombatantSnapshot
): ConflictResult {
  // Initialize conflict with attacker as player, defender as opponent
  // Use a difficulty based on defender's level
  const difficulty = Math.min(10, Math.max(1, defender.level));

  // Derive NPC tags from defender's build to influence AI behavior
  const defenderTags = deriveTagsFromBuild(defender);

  let state = initConflict({
    encounterCategory: 'combat',
    encounterDifficulty: difficulty,
    npcTags: defenderTags,
    playerLabel: attacker.characterName,
    opponentLabel: defender.characterName,
    playerBuild: attacker.build,
    // Defender's build affects opponent starting resources via identity
    opponentIdentity: {
      id: defender.characterId,
      kind: 'npc' as const,
      name: defender.characterName,
      archetype: deriveArchetypeFromBuild(defender),
      threatTier: Math.ceil(defender.level / 3),
      mechanics: {
        startingResourceBonus: deriveStartingBonusFromBuild(defender),
        moveBonuses: {},
      },
    },
    leverage: { control: 0, stability: 0, position: 0 },
    heat: 0, // PvP doesn't use heat
  });

  // Run the combat using AI for both sides
  while (!state.ended) {
    const playerMove = selectBestMove(state);
    state = executeTurn(state, playerMove);
  }

  return evaluateOutcome(state);
}

/**
 * Select the best move for the player using simple heuristics.
 * This simulates optimal play for the attacker.
 */
function selectBestMove(state: ConflictState): MoveId {
  const availableMoves = getPlayerMoves(state);

  if (availableMoves.length === 0) {
    return 'withdraw'; // Fallback
  }

  // Simple heuristic: evaluate moves based on expected outcome
  const playerResources = state.player.resources;
  const opponentResources = state.opponent.resources;

  // Priority based on game state
  // If opponent has low resource, go aggressive
  const opponentLowest = Math.min(
    opponentResources.control,
    opponentResources.stability,
    opponentResources.position
  );

  if (opponentLowest <= 1 && availableMoves.includes('pressure')) {
    return 'pressure';
  }

  if (opponentLowest <= 1 && availableMoves.includes('seize_control')) {
    return 'seize_control';
  }

  // If we have low stability, stabilize
  if (playerResources.stability <= 2 && availableMoves.includes('stabilize')) {
    return 'stabilize';
  }

  // If we have low position, reposition
  if (playerResources.position <= 2 && availableMoves.includes('reposition')) {
    return 'reposition';
  }

  // Default to pressure if available, otherwise first available move
  if (availableMoves.includes('pressure')) {
    return 'pressure';
  }

  return availableMoves[0];
}

/**
 * Derive combat tags from a player's build to influence AI behavior.
 */
function deriveTagsFromBuild(snapshot: CombatantSnapshot): string[] {
  const tags: string[] = [];
  const attrs = snapshot.build.attributes;

  // Add tags based on strongest attribute
  const attrEntries = Object.entries(attrs);
  if (attrEntries.length > 0) {
    const [strongestAttr] = attrEntries.sort((a, b) => b[1] - a[1])[0];
    if (strongestAttr === 'strength' || strongestAttr === 'power') {
      tags.push('aggressive');
    } else if (strongestAttr === 'intelligence' || strongestAttr === 'cunning') {
      tags.push('cunning');
    } else if (strongestAttr === 'endurance' || strongestAttr === 'resilience') {
      tags.push('defensive');
    }
  }

  // Add power-based tags
  const powers = snapshot.build.powers;
  if (powers.length > 0) {
    tags.push('powered');
  }
  if (powers.length >= 3) {
    tags.push('versatile');
  }

  return tags;
}

/**
 * Derive opponent archetype from defender's build.
 */
function deriveArchetypeFromBuild(
  snapshot: CombatantSnapshot
): 'brute' | 'controller' | 'infiltrator' | 'schemer' | 'enforcer' | 'wildcard' {
  const attrs = snapshot.build.attributes;
  const attrEntries = Object.entries(attrs);

  if (attrEntries.length === 0) {
    return 'brute';
  }

  const [strongestAttr] = attrEntries.sort((a, b) => b[1] - a[1])[0];

  switch (strongestAttr) {
    case 'strength':
    case 'power':
      return 'brute';
    case 'intelligence':
    case 'cunning':
      return 'schemer';
    case 'agility':
    case 'reflexes':
      return 'infiltrator';
    case 'endurance':
    case 'resilience':
      return 'enforcer';
    case 'charisma':
    case 'presence':
      return 'controller';
    default:
      return 'brute';
  }
}

/**
 * Derive starting resource bonus from defender's build.
 */
function deriveStartingBonusFromBuild(
  snapshot: CombatantSnapshot
): { control?: number; stability?: number; position?: number } {
  const level = snapshot.level;
  const bonus: { control?: number; stability?: number; position?: number } = {};

  // Higher level defenders get small bonuses
  if (level >= 10) {
    bonus.stability = 1;
  }
  if (level >= 15) {
    bonus.control = 1;
  }

  return bonus;
}
