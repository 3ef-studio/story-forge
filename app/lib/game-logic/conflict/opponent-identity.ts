/**
 * Opponent Identity — gives conflict opponents a structured identity
 * (rival / NPC / archetype) with deterministic selection and scaling.
 */

import type { ConflictResources, MoveId } from './types';
import type { RivalPersonality } from '@/app/data/rivals';

// --- Types ---

export type OpponentArchetype = 'brute' | 'controller' | 'infiltrator' | 'schemer' | 'enforcer' | 'wildcard';
export type OpponentKind = 'rival' | 'npc' | 'archetype';

export interface OpponentIdentity {
  id: string;
  kind: OpponentKind;
  name: string;
  archetype: OpponentArchetype;
  factionId?: string;
  threatTier: number; // 1-10
  tags?: string[];
  mechanics: {
    startingResourceBonus: Partial<ConflictResources>;
    moveBonuses: Partial<Record<MoveId, { self?: Partial<ConflictResources>; opponent?: Partial<ConflictResources> }>>;
  };
}

export interface OpponentIdentityInput {
  rival?: { id: string; name: string; personality: RivalPersonality; level: number; hostility: number };
  npc?: { id: string; name: string; tags: string[]; factionId?: string };
  encounterCategory: string;
  encounterDifficulty: number;
  encounterTags?: string[];
  district?: string;
  factionId?: string;
}

// --- Archetype mechanics table ---

const ARCHETYPE_MECHANICS: Record<OpponentArchetype, {
  startingResourceBonus: Partial<ConflictResources>;
  moveBonuses: Partial<Record<MoveId, { self?: Partial<ConflictResources>; opponent?: Partial<ConflictResources> }>>;
}> = {
  brute: {
    startingResourceBonus: { control: 1 },
    moveBonuses: { pressure: { opponent: { stability: -1 } } },
  },
  controller: {
    startingResourceBonus: { stability: 1 },
    moveBonuses: { stabilize: { self: { control: 1 } } },
  },
  infiltrator: {
    startingResourceBonus: { position: 1 },
    moveBonuses: { feint: { self: { position: 1 } } },
  },
  schemer: {
    startingResourceBonus: { position: 1 },
    moveBonuses: { reposition: { opponent: { control: -1 } } },
  },
  enforcer: {
    startingResourceBonus: { control: 1 },
    moveBonuses: { seize_control: { self: { stability: 1 } } },
  },
  wildcard: {
    startingResourceBonus: {},
    moveBonuses: {
      feint: { self: { control: 1 } },
      pressure: { self: { position: 1 } },
    },
  },
};

// --- Rival personality → archetype mapping ---

const PERSONALITY_TO_ARCHETYPE: Record<RivalPersonality, OpponentArchetype> = {
  brute: 'brute',
  tactician: 'schemer',
  zealot: 'enforcer',
  sadist: 'wildcard',
  hunter: 'infiltrator',
};

// --- NPC tags → archetype mapping ---

const NPC_TAG_PATTERNS: Array<{ pattern: RegExp; archetype: OpponentArchetype }> = [
  { pattern: /enforcer|gang|thug|criminal/, archetype: 'enforcer' },
  { pattern: /broker|informant|spy/, archetype: 'schemer' },
  { pattern: /stealth|hacker|infiltrat/, archetype: 'infiltrator' },
  { pattern: /violent|raider|brute/, archetype: 'brute' },
  { pattern: /law_enforcement|security|guardian|patrol/, archetype: 'controller' },
];

function archetypeFromNPCTags(tags: string[]): OpponentArchetype {
  const joined = tags.join(',');
  for (const { pattern, archetype } of NPC_TAG_PATTERNS) {
    if (pattern.test(joined)) return archetype;
  }
  return 'wildcard';
}

// --- Fallback name generation ---

const DISTRICT_ADJECTIVES: Record<string, string> = {
  downtown: 'Downtown',
  industrial: 'Industrial',
  waterfront: 'Dockside',
  slums: 'Backstreet',
  midtown: 'Midtown',
};

const ARCHETYPE_NOUNS: Record<OpponentArchetype, string> = {
  brute: 'Brute',
  controller: 'Warden',
  infiltrator: 'Shadow',
  schemer: 'Schemer',
  enforcer: 'Enforcer',
  wildcard: 'Operative',
};

function generateFallbackName(archetype: OpponentArchetype, district?: string): string {
  const adj = (district && DISTRICT_ADJECTIVES[district]) || 'Unknown';
  const noun = ARCHETYPE_NOUNS[archetype];
  return `${adj} ${noun}`;
}

// --- Threat tier scaling ---

function scaledStartingBonus(
  base: Partial<ConflictResources>,
  threatTier: number,
): Partial<ConflictResources> {
  if (threatTier < 5) return {}; // too weak for archetype bonus
  const multiplier = threatTier >= 8 ? 2 : 1;
  const result: Partial<ConflictResources> = {};
  for (const [key, val] of Object.entries(base)) {
    if (val) result[key as keyof ConflictResources] = val * multiplier;
  }
  return result;
}

// --- Clamp helper ---

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

// --- Main selection function ---

export function resolveOpponentIdentity(input: OpponentIdentityInput): OpponentIdentity {
  // Priority: rival > NPC > archetype fallback

  if (input.rival) {
    const archetype = PERSONALITY_TO_ARCHETYPE[input.rival.personality];
    const threatTier = clamp(1, 10, input.rival.level + Math.floor(input.rival.hostility / 25));
    const baseMechanics = ARCHETYPE_MECHANICS[archetype];
    return {
      id: input.rival.id,
      kind: 'rival',
      name: input.rival.name,
      archetype,
      factionId: input.factionId,
      threatTier,
      mechanics: {
        startingResourceBonus: scaledStartingBonus(baseMechanics.startingResourceBonus, threatTier),
        moveBonuses: baseMechanics.moveBonuses,
      },
    };
  }

  if (input.npc) {
    const archetype = archetypeFromNPCTags(input.npc.tags);
    const threatTier = clamp(1, 10, input.encounterDifficulty);
    const baseMechanics = ARCHETYPE_MECHANICS[archetype];
    return {
      id: input.npc.id,
      kind: 'npc',
      name: input.npc.name,
      archetype,
      factionId: input.npc.factionId ?? input.factionId,
      threatTier,
      tags: input.npc.tags,
      mechanics: {
        startingResourceBonus: scaledStartingBonus(baseMechanics.startingResourceBonus, threatTier),
        moveBonuses: baseMechanics.moveBonuses,
      },
    };
  }

  // Archetype fallback — derive from encounter tags or default wildcard
  const archetype = input.encounterTags
    ? archetypeFromNPCTags(input.encounterTags)
    : 'wildcard';
  const threatTier = clamp(1, 10, input.encounterDifficulty);
  const baseMechanics = ARCHETYPE_MECHANICS[archetype];
  return {
    id: `archetype-${archetype}-${threatTier}`,
    kind: 'archetype',
    name: generateFallbackName(archetype, input.district),
    archetype,
    factionId: input.factionId,
    threatTier,
    mechanics: {
      startingResourceBonus: scaledStartingBonus(baseMechanics.startingResourceBonus, threatTier),
      moveBonuses: baseMechanics.moveBonuses,
    },
  };
}

// --- Dev logging ---

export function logOpponentIdentity(identity: OpponentIdentity): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.group('[Opponent Identity]');
  console.log(`Kind: ${identity.kind}`);
  console.log(`Name: ${identity.name}`);
  console.log(`Archetype: ${identity.archetype}`);
  console.log(`Threat Tier: ${identity.threatTier}`);
  if (identity.factionId) console.log(`Faction: ${identity.factionId}`);
  console.log('Starting Bonus:', identity.mechanics.startingResourceBonus);
  console.log('Move Bonuses:', identity.mechanics.moveBonuses);
  console.groupEnd();
}
