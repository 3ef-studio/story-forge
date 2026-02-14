// lib/game-logic/intent.ts
// Character intent system - tracks player's moral alignment on a Villain ↔ Hero axis

import type { MoralIntent } from '@/app/data/actions';

// Intent score bounds
export const INTENT_MIN = -100;
export const INTENT_MAX = 100;

// Intent bands (derived from score, not stored)
export type IntentBand = 'villain' | 'criminal' | 'neutral' | 'vigilante' | 'hero';

/**
 * Compute the intent band from an intent score.
 *
 * Bands:
 * - Villain: <= -40
 * - Criminal/Rogue: -39 to -11
 * - Neutral: -10 to +10
 * - Vigilante/Anti-hero: +11 to +40
 * - Hero: >= +41
 */
export function getIntentBand(intentScore: number): IntentBand {
  if (intentScore <= -40) return 'villain';
  if (intentScore <= -11) return 'criminal';
  if (intentScore <= 10) return 'neutral';
  if (intentScore <= 40) return 'vigilante';
  return 'hero';
}

/**
 * Get a human-readable label for an intent band.
 */
export function getIntentBandLabel(band: IntentBand): string {
  switch (band) {
    case 'villain': return 'Villain';
    case 'criminal': return 'Criminal';
    case 'neutral': return 'Neutral';
    case 'vigilante': return 'Vigilante';
    case 'hero': return 'Hero';
  }
}

/**
 * Get a color class for an intent band (for UI styling).
 */
export function getIntentBandColor(band: IntentBand): string {
  switch (band) {
    case 'villain': return 'text-red-500';
    case 'criminal': return 'text-orange-400';
    case 'neutral': return 'text-gray-400';
    case 'vigilante': return 'text-blue-400';
    case 'hero': return 'text-cyan-400';
  }
}

/**
 * Get a background color class for intent meter.
 */
export function getIntentMeterColor(band: IntentBand): string {
  switch (band) {
    case 'villain': return 'bg-red-500';
    case 'criminal': return 'bg-orange-400';
    case 'neutral': return 'bg-gray-400';
    case 'vigilante': return 'bg-blue-400';
    case 'hero': return 'bg-cyan-400';
  }
}

/**
 * Compute the intent delta for an action based on its moral intent.
 *
 * Deltas:
 * - heroic: +6 to +10 (scaled by action difficulty/impact)
 * - neutral: 0
 * - villainous: -6 to -10 (scaled by action difficulty/impact)
 */
export function computeIntentDelta(moralIntent: MoralIntent, difficulty: number = 5): number {
  // Base delta
  const baseDelta = moralIntent === 'heroic' ? 8 : moralIntent === 'villainous' ? -8 : 0;

  // Scale slightly by difficulty (1-10 → ±0 to ±2)
  const difficultyBonus = Math.floor((difficulty - 5) / 2.5);

  if (baseDelta > 0) {
    return Math.min(10, Math.max(6, baseDelta + difficultyBonus));
  } else if (baseDelta < 0) {
    return Math.max(-10, Math.min(-6, baseDelta - difficultyBonus));
  }

  return 0;
}

/**
 * Clamp an intent score to the valid range.
 */
export function clampIntentScore(score: number): number {
  return Math.max(INTENT_MIN, Math.min(INTENT_MAX, score));
}

/**
 * Apply an intent delta to a current score, with clamping.
 */
export function applyIntentDelta(currentScore: number, delta: number): number {
  return clampIntentScore(currentScore + delta);
}

// --- Context for encounter narration ---

export type PlayerRoleHint = 'initiator' | 'responder';

export interface PlayerIntentContext {
  intentScore: number;
  intentBand: IntentBand;
  playerFactionId: string | null;
  actionId: string;
  actionCategory: string;
  moralIntent: MoralIntent;
  districtId: string;
  playerRoleHint: PlayerRoleHint;
}

/**
 * Build the player intent context for encounter generation.
 * This provides the AI with clear guidance on how to frame the narrative.
 */
export function buildPlayerIntentContext(params: {
  intentScore: number;
  playerFactionId: string | null;
  actionId: string;
  actionCategory: string;
  moralIntent: MoralIntent;
  districtId: string;
}): PlayerIntentContext {
  const { intentScore, playerFactionId, actionId, actionCategory, moralIntent, districtId } = params;

  const intentBand = getIntentBand(intentScore);

  // Determine player role hint based on action type
  // Criminal/villainous actions = player is the initiator of the crime
  // Heroic actions = player is responding to prevent harm
  const playerRoleHint: PlayerRoleHint =
    moralIntent === 'villainous' || actionCategory === 'criminal'
      ? 'initiator'
      : 'responder';

  return {
    intentScore,
    intentBand,
    playerFactionId,
    actionId,
    actionCategory,
    moralIntent,
    districtId,
    playerRoleHint,
  };
}

/**
 * Generate narrative guidance for the AI based on player intent context.
 * Returns a string to inject into the system prompt.
 */
export function generateIntentNarrativeGuidance(context: PlayerIntentContext): string {
  const { intentBand, moralIntent, playerRoleHint, actionCategory } = context;

  const lines: string[] = [];

  lines.push(`PLAYER INTENT CONTEXT:`);
  lines.push(`- Intent Band: ${getIntentBandLabel(intentBand)}`);
  lines.push(`- Action Type: ${actionCategory}`);
  lines.push(`- Moral Intent: ${moralIntent}`);
  lines.push(`- Player Role: ${playerRoleHint === 'initiator' ? 'INITIATOR of the action' : 'RESPONDER to events'}`);
  lines.push('');

  // Hard rules based on intent
  lines.push(`NARRATIVE FRAMING RULES (MUST FOLLOW):`);

  if (moralIntent === 'villainous' || actionCategory === 'criminal') {
    lines.push(`1. The player IS COMMITTING the criminal/villainous act, NOT stopping it.`);
    lines.push(`2. Opposition should be police, heroes, guardians, or rival criminals - NOT "criminals the player is stopping".`);
    lines.push(`3. Describe the player attempting/executing their criminal plan.`);
    lines.push(`4. Do NOT frame the player as a hero preventing crime.`);
  } else if (moralIntent === 'heroic') {
    lines.push(`1. The player IS PREVENTING harm or stopping wrongdoing.`);
    lines.push(`2. Opposition should be criminals, villains, or dangerous situations.`);
    lines.push(`3. Describe the player intervening to help or protect.`);
  } else {
    lines.push(`1. The player is taking a neutral action - frame appropriately.`);
    lines.push(`2. Neither strongly heroic nor villainous framing.`);
  }

  // Additional context based on intent band
  if (intentBand === 'villain' || intentBand === 'criminal') {
    lines.push('');
    lines.push(`PLAYER ALIGNMENT: The player has a ${intentBand} reputation. NPCs and factions should react accordingly.`);
    lines.push(`- Law enforcement may recognize and pursue them.`);
    lines.push(`- Civilians may fear them.`);
    lines.push(`- Criminal contacts may be more welcoming.`);
  } else if (intentBand === 'hero' || intentBand === 'vigilante') {
    lines.push('');
    lines.push(`PLAYER ALIGNMENT: The player has a ${intentBand} reputation. NPCs and factions should react accordingly.`);
    lines.push(`- Law enforcement may cooperate or at least tolerate them.`);
    lines.push(`- Civilians may recognize and appreciate them.`);
    lines.push(`- Criminal elements may be hostile or wary.`);
  }

  return lines.join('\n');
}
