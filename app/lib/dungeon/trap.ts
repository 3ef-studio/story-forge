/**
 * Dungeon Trap System
 *
 * Handles trap encounters:
 * - Perception-based detection check
 * - Intelligence + Agility disarm attempts
 * - HP damage application on failure or undetected trigger
 * - Retreat to previous node
 */

import { prisma } from '@/app/lib/db';

// ============================================================
// Constants
// ============================================================

export type TrapDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export const TRAP_DIFFICULTY_VALUES: Record<TrapDifficulty, number> = {
  EASY: 25,
  NORMAL: 50,
  HARD: 75,
};

export const TRAP_DAMAGE: Record<TrapDifficulty, number> = {
  EASY: 10,
  NORMAL: 25,
  HARD: 50,
};

// Random roll range: 1-25
// Combined with 0-100 attributes, this gives meaningful variance
// vs difficulties of 25/50/75.
const ROLL_MAX = 25;

// ============================================================
// Roll Helpers
// ============================================================

function trapRoll(): number {
  return Math.floor(Math.random() * ROLL_MAX) + 1;
}

export interface TrapCheckResult {
  success: boolean;
  roll: number;
  attributeValue: number;
  total: number;
  difficulty: number;
}

// ============================================================
// Difficulty Determination
// ============================================================

/**
 * Determine trap difficulty from dungeon floor depth.
 * Depth 1 → Easy, 2-3 → Normal, 4+ → Hard
 */
export function getTrapDifficulty(depth: number): TrapDifficulty {
  if (depth <= 1) return 'EASY';
  if (depth <= 3) return 'NORMAL';
  return 'HARD';
}

// ============================================================
// Skill Checks
// ============================================================

/**
 * Perception check to detect a trap before triggering it.
 * Formula: perception + roll(1..25) > difficulty
 */
export function perceptionCheck(
  perception: number,
  difficulty: TrapDifficulty
): TrapCheckResult {
  const dc = TRAP_DIFFICULTY_VALUES[difficulty];
  const r = trapRoll();
  const total = perception + r;
  return { success: total > dc, roll: r, attributeValue: perception, total, difficulty: dc };
}

/**
 * Disarm check using average of intelligence and agility.
 * Formula: (intelligence + agility) / 2 + roll(1..25) > difficulty
 */
export function disarmCheck(
  intelligence: number,
  agility: number,
  difficulty: TrapDifficulty
): TrapCheckResult {
  const dc = TRAP_DIFFICULTY_VALUES[difficulty];
  const avg = Math.round((intelligence + agility) / 2);
  const r = trapRoll();
  const total = avg + r;
  return { success: total > dc, roll: r, attributeValue: avg, total, difficulty: dc };
}

// ============================================================
// Action Results
// ============================================================

export interface TrapActionResult {
  success: boolean;
  error?: string;
  action: 'trigger' | 'disarm' | 'retreat';
  disarmSuccess?: boolean;
  damageTaken?: number;
  newHp?: number;
  difficulty: TrapDifficulty;
  check?: TrapCheckResult;
}

// ============================================================
// Trap Actions
// ============================================================

/**
 * Apply trap damage to the character and mark the node cleared.
 * Used when the trap triggers (undetected or failed disarm).
 */
export async function triggerTrap(
  characterId: string,
  sessionId: string,
  nodeId: string,
  difficulty: TrapDifficulty
): Promise<TrapActionResult> {
  const damage = TRAP_DAMAGE[difficulty];

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { currentHp: true },
  });

  if (!character) {
    return { success: false, error: 'Character not found', action: 'trigger', difficulty };
  }

  const newHp = Math.max(0, character.currentHp - damage);

  await Promise.all([
    prisma.character.update({
      where: { id: characterId },
      data: { currentHp: newHp },
    }),
    markTrapNodeCleared(sessionId, nodeId),
  ]);

  return { success: true, action: 'trigger', damageTaken: damage, newHp, difficulty };
}

/**
 * Attempt to disarm a trap.
 * Success → node cleared, no damage.
 * Failure → trap triggers, take damage.
 */
export async function disarmTrap(
  characterId: string,
  sessionId: string,
  nodeId: string,
  difficulty: TrapDifficulty,
  intelligence: number,
  agility: number
): Promise<TrapActionResult> {
  const check = disarmCheck(intelligence, agility, difficulty);

  if (check.success) {
    await markTrapNodeCleared(sessionId, nodeId);
    return { success: true, action: 'disarm', disarmSuccess: true, damageTaken: 0, difficulty, check };
  }

  // Failed — trap triggers
  const triggerResult = await triggerTrap(characterId, sessionId, nodeId, difficulty);
  return { ...triggerResult, action: 'disarm', disarmSuccess: false, check };
}

/**
 * Retreat from the trap room — move character back to the previous node.
 * The trap node is NOT cleared (it can be attempted again later).
 */
export async function retreatFromTrap(
  sessionId: string,
  previousNodeId: string
): Promise<TrapActionResult> {
  await prisma.dungeonSession.update({
    where: { id: sessionId },
    data: { currentNodeId: previousNodeId },
  });

  return { success: true, action: 'retreat', damageTaken: 0, difficulty: 'EASY' };
}

// ============================================================
// Internal Helpers
// ============================================================

async function markTrapNodeCleared(sessionId: string, nodeId: string): Promise<void> {
  const session = await prisma.dungeonSession.findUnique({ where: { id: sessionId } });
  if (session && !session.clearedNodeIds.includes(nodeId)) {
    await prisma.dungeonSession.update({
      where: { id: sessionId },
      data: { clearedNodeIds: [...session.clearedNodeIds, nodeId] },
    });
  }
}
