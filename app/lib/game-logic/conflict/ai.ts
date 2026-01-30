import type { AIContext, MoveId, OpponentProfile } from './types';
import { CONFLICT_MOVES, getAvailableMoves } from './moves';

const AGGRESSIVE_TAGS = ['criminal', 'enforcer', 'gang', 'violent', 'thug', 'raider'];
const DEFENSIVE_TAGS = ['law_enforcement', 'patrol', 'guardian', 'security', 'protector'];
const CUNNING_TAGS = ['broker', 'informant', 'tech', 'stealth', 'hacker', 'spy'];

const CATEGORY_PROFILE_MAP: Record<string, OpponentProfile> = {
  combat: 'aggressive',
  crime: 'cunning',
  social: 'balanced',
  stealth: 'cunning',
  exploration: 'balanced',
  investigation: 'cunning',
  enforcement: 'defensive',
  diplomacy: 'defensive',
};

/** Map NPC tags + encounter category to an opponent profile */
export function resolveProfile(npcTags: string[], encounterCategory: string): OpponentProfile {
  // Tag-based: first match wins
  for (const tag of npcTags) {
    const lower = tag.toLowerCase();
    if (AGGRESSIVE_TAGS.some((t) => lower.includes(t))) return 'aggressive';
    if (DEFENSIVE_TAGS.some((t) => lower.includes(t))) return 'defensive';
    if (CUNNING_TAGS.some((t) => lower.includes(t))) return 'cunning';
  }

  // Category-based fallback
  const catLower = encounterCategory.toLowerCase();
  if (CATEGORY_PROFILE_MAP[catLower]) return CATEGORY_PROFILE_MAP[catLower];

  return 'balanced';
}

/** Base weight tables per profile */
const PROFILE_WEIGHTS: Record<OpponentProfile, Record<MoveId, number>> = {
  aggressive: {
    pressure: 5,
    seize_control: 4,
    feint: 2,
    reposition: 1,
    stabilize: 1,
    withdraw: 0,
  },
  defensive: {
    pressure: 1,
    seize_control: 2,
    feint: 1,
    reposition: 3,
    stabilize: 5,
    withdraw: 4,
  },
  cunning: {
    pressure: 2,
    seize_control: 3,
    feint: 5,
    reposition: 4,
    stabilize: 2,
    withdraw: 1,
  },
  balanced: {
    pressure: 3,
    seize_control: 3,
    feint: 3,
    reposition: 3,
    stabilize: 3,
    withdraw: 2,
  },
};

function resourceTotal(r: { control: number; stability: number; position: number }): number {
  return r.control + r.stability + r.position;
}

/**
 * Deterministic opponent move selection.
 * Uses a hash of the turn + resource totals to pick from weighted available moves.
 */
export function selectOpponentMove(ctx: AIContext, profile: OpponentProfile): MoveId {
  const available = getAvailableMoves(ctx.resources);
  if (available.length === 0) {
    // Fallback: stabilize and withdraw always have no requirements
    return 'stabilize';
  }

  if (available.length === 1) return available[0];

  // Start from base weights
  const weights: Record<string, number> = {};
  for (const moveId of available) {
    weights[moveId] = PROFILE_WEIGHTS[profile][moveId] ?? 1;
  }

  // Situational adjustments
  const self = ctx.resources;
  const playerTotal = resourceTotal(ctx.playerResources);
  const selfTotal = resourceTotal(self);

  // Low stability → favor stabilize / withdraw
  if (self.stability <= 1) {
    if (weights['stabilize'] !== undefined) weights['stabilize'] += 3;
    if (weights['withdraw'] !== undefined) weights['withdraw'] += 2;
  }

  // Low control → avoid pressure / feint
  if (self.control <= 1) {
    if (weights['pressure'] !== undefined) weights['pressure'] = Math.max(0, weights['pressure'] - 2);
    if (weights['feint'] !== undefined) weights['feint'] = Math.max(0, weights['feint'] - 2);
  }

  // Opponent near collapse (low total) → favor pressure / feint to finish
  if (playerTotal <= 4) {
    if (weights['pressure'] !== undefined) weights['pressure'] += 3;
    if (weights['feint'] !== undefined) weights['feint'] += 2;
  }

  // We're ahead → play more conservatively
  if (selfTotal > playerTotal + 3) {
    if (weights['stabilize'] !== undefined) weights['stabilize'] += 2;
    if (weights['reposition'] !== undefined) weights['reposition'] += 1;
  }

  // Deterministic hash-based pick
  const hash = Math.abs((ctx.turn * 7 + selfTotal * 13 + playerTotal * 17)) % 1000;

  const moveEntries = available.map((id) => ({ id, weight: Math.max(1, weights[id] ?? 1) }));
  const totalWeight = moveEntries.reduce((sum, e) => sum + e.weight, 0);
  const pick = hash % totalWeight;

  let cumulative = 0;
  for (const entry of moveEntries) {
    cumulative += entry.weight;
    if (pick < cumulative) {
      return entry.id;
    }
  }

  // Should never reach here, but fallback
  return available[0];
}
