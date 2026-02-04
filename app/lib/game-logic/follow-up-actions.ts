/**
 * Follow-Up Actions System
 * Generates contextual follow-up actions based on encounter outcomes
 */

import type { Action, ActionCategory, MoralIntent } from '@/app/data/actions';

// =============================================================================
// TYPES
// =============================================================================

export type RiskTier = 'good' | 'risky' | 'dangerous';
export type IntentHint = 'control' | 'stability' | 'position';
export type RewardBias = 'xp' | 'rep' | 'money' | 'item' | 'leverage';
export type ConflictResult = 'victory' | 'defeat' | 'partial';
export type GambitOutcome = 'clean' | 'complication' | 'backfire';

export interface FollowUpAction {
  id: string;                       // stable deterministic id (for dedupe)
  name: string;                     // display title
  description: string;              // display description
  expiresInActions: number;         // TTL decremented per completed action
  riskTier: RiskTier;
  intentHint: IntentHint;
  rewardBias?: RewardBias;

  // Execution hints (must allow building an Action shaped object)
  executeHints: {
    encounterTypes: string[];       // 1+ encounter types
    narrativeContext: string;       // short narrative intent string
    locationTypes?: string[];       // default to last district-derived location
    likelyFactions?: string[];
    difficultyDelta?: number;       // -2..+2 applied to last encounter difficulty
    encounterChance?: number;       // default 1
    baseXPRewardDelta?: number;     // optional small bias (+/-)
    baseMoneyRewardDelta?: number;  // optional small bias (+/-)
  };

  origin: {
    actionId?: string;
    encounterId?: string;
    seedId?: string;
    encounterType?: string;
    district?: string;
  };

  uiTags?: string[];
}

export interface FollowUpContext {
  // Encounter context
  encounterId?: string;
  encounterType?: string;
  encounterDifficulty?: number;
  encounterTags?: string[];
  factions?: string[];
  district?: string;
  actionId?: string;                // the action that led to this encounter

  // Outcome
  outcomeType?: 'success' | 'partial' | 'failure';
  conflictResult?: ConflictResult;  // victory/defeat/stalemate
  gambitOutcome?: GambitOutcome;    // clean/complication/backfire

  // NPCs/Rival
  npcId?: string;
  npcName?: string;
  rivalPresent?: boolean;

  // Post-resolve state
  leverageState?: { control: number; stability: number; position: number };
  usedPowers?: string[];
  baseActionIntent?: string;
}

// =============================================================================
// TEMPLATES
// =============================================================================

interface FollowUpTemplate {
  id: string;
  name: string;
  description: string;
  riskTier: RiskTier;
  intentHint: IntentHint;
  rewardBias?: RewardBias;
  ttl: number;
  executeHints: FollowUpAction['executeHints'];
  uiTags?: string[];
  // Scoring conditions
  conditions: {
    conflictResults?: ConflictResult[];
    gambitOutcomes?: GambitOutcome[];
    actionCategories?: string[];
    requiresNpc?: boolean;
    requiresRival?: boolean;
    requiresFactions?: string[];
    minDifficulty?: number;
    maxDifficulty?: number;
    leverageThreshold?: { type: IntentHint; min: number };
  };
  score: number; // base priority
}

const FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  // === VICTORY-FOCUSED ===
  {
    id: 'press_advantage',
    name: 'Press the Advantage',
    description: 'Capitalize on your recent success to push further.',
    riskTier: 'risky',
    intentHint: 'control',
    rewardBias: 'xp',
    ttl: 3,
    executeHints: {
      encounterTypes: ['powered_criminal_pursuit', 'villain_sighting', 'turf_war'],
      narrativeContext: 'Following up on a recent victory, pressing deeper into enemy territory',
      difficultyDelta: 1,
      baseXPRewardDelta: 10,
    },
    uiTags: ['offensive', 'momentum'],
    conditions: {
      conflictResults: ['victory'],
      minDifficulty: 4,
    },
    score: 80,
  },
  {
    id: 'exploit_opening',
    name: 'Exploit the Opening',
    description: 'Your opponent left themselves vulnerable. Strike now.',
    riskTier: 'good',
    intentHint: 'position',
    rewardBias: 'rep',
    ttl: 2,
    executeHints: {
      encounterTypes: ['ambush_scenario', 'villain_hideout', 'sting_operation'],
      narrativeContext: 'Exploiting a gap in enemy defenses revealed by recent events',
      difficultyDelta: -1,
      baseXPRewardDelta: 5,
    },
    uiTags: ['tactical', 'opportunity'],
    conditions: {
      conflictResults: ['victory'],
      gambitOutcomes: ['clean'],
    },
    score: 85,
  },
  {
    id: 'secure_scene',
    name: 'Secure the Scene',
    description: 'Lock down the area and gather evidence before it disappears.',
    riskTier: 'good',
    intentHint: 'stability',
    rewardBias: 'leverage',
    ttl: 2,
    executeHints: {
      encounterTypes: ['evidence_gathering', 'investigation', 'surveillance'],
      narrativeContext: 'Securing a location after a confrontation to collect intel',
      difficultyDelta: -2,
      encounterChance: 0.8,
    },
    uiTags: ['investigation', 'methodical'],
    conditions: {
      conflictResults: ['victory', 'partial'],
    },
    score: 60,
  },

  // === DEFEAT/SETBACK FOCUSED ===
  {
    id: 'regroup',
    name: 'Regroup and Recover',
    description: 'Fall back, tend to wounds, and plan your next move.',
    riskTier: 'good',
    intentHint: 'stability',
    rewardBias: 'leverage',
    ttl: 3,
    executeHints: {
      encounterTypes: ['peaceful_rest', 'safehouse_discovered', 'recovery_boost'],
      narrativeContext: 'Recovering from a setback and preparing for the next engagement',
      difficultyDelta: -2,
      encounterChance: 0.5,
    },
    uiTags: ['defensive', 'recovery'],
    conditions: {
      conflictResults: ['defeat'],
    },
    score: 90,
  },
  {
    id: 'contain_fallout',
    name: 'Contain the Fallout',
    description: 'Limit the damage from your recent setback before it spreads.',
    riskTier: 'risky',
    intentHint: 'stability',
    rewardBias: 'rep',
    ttl: 2,
    executeHints: {
      encounterTypes: ['damage_control', 'reputation_boost', 'political_statement'],
      narrativeContext: 'Attempting to manage reputation and contain negative consequences',
      difficultyDelta: 0,
    },
    uiTags: ['defensive', 'urgent'],
    conditions: {
      conflictResults: ['defeat'],
      gambitOutcomes: ['backfire'],
    },
    score: 85,
  },
  {
    id: 'rebuild_leverage',
    name: 'Rebuild Your Position',
    description: 'You lost ground. Time to rebuild your leverage.',
    riskTier: 'good',
    intentHint: 'position',
    rewardBias: 'leverage',
    ttl: 4,
    executeHints: {
      encounterTypes: ['informant_meeting', 'intel_purchase', 'connection_made'],
      narrativeContext: 'Rebuilding tactical position after a setback',
      difficultyDelta: -1,
      encounterChance: 0.7,
    },
    uiTags: ['tactical', 'recovery'],
    conditions: {
      conflictResults: ['defeat', 'partial'],
    },
    score: 70,
  },

  // === COMPLICATION FOCUSED ===
  {
    id: 'resolve_complication',
    name: 'Resolve the Complication',
    description: 'Address the loose end your recent action created.',
    riskTier: 'risky',
    intentHint: 'control',
    rewardBias: 'xp',
    ttl: 3,
    executeHints: {
      encounterTypes: ['follow_up_confrontation', 'cleanup_operation', 'damage_control'],
      narrativeContext: 'Dealing with an unforeseen complication from a recent encounter',
      difficultyDelta: 0,
    },
    uiTags: ['urgent', 'cleanup'],
    conditions: {
      gambitOutcomes: ['complication'],
    },
    score: 75,
  },
  {
    id: 'chase_lead',
    name: 'Chase the Lead',
    description: 'A new thread emerged. Follow it before it goes cold.',
    riskTier: 'risky',
    intentHint: 'position',
    rewardBias: 'xp',
    ttl: 2,
    executeHints: {
      encounterTypes: ['investigation', 'surveillance', 'informant_meeting'],
      narrativeContext: 'Following up on new information uncovered during recent events',
      difficultyDelta: 0,
    },
    uiTags: ['investigation', 'time-sensitive'],
    conditions: {
      gambitOutcomes: ['complication', 'clean'],
    },
    score: 65,
  },

  // === NPC/RIVAL FOCUSED ===
  {
    id: 'interrogate_npc',
    name: 'Press for Information',
    description: 'Your recent contact knows more than they revealed.',
    riskTier: 'risky',
    intentHint: 'control',
    rewardBias: 'leverage',
    ttl: 3,
    executeHints: {
      encounterTypes: ['interrogation', 'informant_meeting', 'intel_exchange'],
      narrativeContext: 'Pressing a contact for additional information after a recent interaction',
      difficultyDelta: 1,
    },
    uiTags: ['social', 'intel'],
    conditions: {
      requiresNpc: true,
    },
    score: 70,
  },
  {
    id: 'probe_rival',
    name: 'Probe Rival Activity',
    description: 'Your rival was involved. Learn what they\'re planning.',
    riskTier: 'dangerous',
    intentHint: 'position',
    rewardBias: 'xp',
    ttl: 4,
    executeHints: {
      encounterTypes: ['surveillance', 'investigation', 'informant_meeting'],
      narrativeContext: 'Gathering intelligence on rival movements and plans',
      difficultyDelta: 2,
      baseXPRewardDelta: 15,
    },
    uiTags: ['rival', 'intel'],
    conditions: {
      requiresRival: true,
    },
    score: 75,
  },

  // === FACTION FOCUSED ===
  {
    id: 'trace_supply',
    name: 'Trace the Supply Chain',
    description: 'Follow the money and resources to their source.',
    riskTier: 'risky',
    intentHint: 'position',
    rewardBias: 'money',
    ttl: 3,
    executeHints: {
      encounterTypes: ['smuggling_run', 'deal_making', 'investigation'],
      narrativeContext: 'Tracing criminal supply chains and financial connections',
      difficultyDelta: 1,
      likelyFactions: ['syndicate', 'black_market', 'street_gangs'],
      baseMoneyRewardDelta: 50,
    },
    uiTags: ['investigation', 'criminal'],
    conditions: {
      actionCategories: ['criminal', 'neutral'],
      requiresFactions: ['syndicate', 'black_market', 'street_gangs'],
    },
    score: 65,
  },
  {
    id: 'lose_heat',
    name: 'Lose the Heat',
    description: 'Authorities are closing in. Time to lay low.',
    riskTier: 'good',
    intentHint: 'stability',
    rewardBias: 'leverage',
    ttl: 2,
    executeHints: {
      encounterTypes: ['escape_chase', 'safehouse_discovered', 'hide_and_seek'],
      narrativeContext: 'Evading law enforcement attention after criminal activity',
      difficultyDelta: -1,
      likelyFactions: ['metro_police'],
      encounterChance: 0.6,
    },
    uiTags: ['evasion', 'criminal'],
    conditions: {
      actionCategories: ['criminal'],
    },
    score: 70,
  },

  // === HIGH LEVERAGE FOCUSED ===
  {
    id: 'spend_control',
    name: 'Seize the Moment',
    description: 'Your accumulated control lets you force a decisive confrontation.',
    riskTier: 'dangerous',
    intentHint: 'control',
    rewardBias: 'xp',
    ttl: 2,
    executeHints: {
      encounterTypes: ['public_confrontation', 'hero_battle', 'ambush_scenario'],
      narrativeContext: 'Using accumulated tactical control for a decisive strike',
      difficultyDelta: 2,
      baseXPRewardDelta: 20,
    },
    uiTags: ['offensive', 'high-stakes'],
    conditions: {
      leverageThreshold: { type: 'control', min: 2 },
    },
    score: 60,
  },
  {
    id: 'consolidate_position',
    name: 'Consolidate Your Position',
    description: 'Lock in your tactical advantage before it slips away.',
    riskTier: 'good',
    intentHint: 'position',
    rewardBias: 'leverage',
    ttl: 3,
    executeHints: {
      encounterTypes: ['territory_claim', 'alliance_formed', 'connection_made'],
      narrativeContext: 'Consolidating tactical gains and securing advantages',
      difficultyDelta: -1,
      encounterChance: 0.8,
    },
    uiTags: ['tactical', 'consolidation'],
    conditions: {
      leverageThreshold: { type: 'position', min: 2 },
    },
    score: 55,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a deterministic ID for a follow-up based on context
 */
function generateFollowUpId(templateId: string, ctx: FollowUpContext): string {
  const base = `fup_${templateId}_${ctx.encounterId ?? ctx.actionId ?? 'unknown'}`;
  // Add a simple hash based on difficulty and result for uniqueness
  const hash = ((ctx.encounterDifficulty ?? 0) * 7 + (ctx.conflictResult === 'victory' ? 1 : ctx.conflictResult === 'defeat' ? 2 : 3)) % 1000;
  return `${base}_${hash}`;
}

/**
 * Score a template against the current context
 */
function scoreTemplate(template: FollowUpTemplate, ctx: FollowUpContext): number {
  let score = template.score;
  const { conditions } = template;

  // Check conflict result condition
  if (conditions.conflictResults) {
    if (!ctx.conflictResult || !conditions.conflictResults.includes(ctx.conflictResult)) {
      return 0; // Disqualified
    }
    score += 20; // Bonus for matching
  }

  // Check gambit outcome condition
  if (conditions.gambitOutcomes) {
    if (!ctx.gambitOutcome || !conditions.gambitOutcomes.includes(ctx.gambitOutcome)) {
      return 0; // Disqualified
    }
    score += 15;
  }

  // Check action category condition (using baseActionIntent as proxy)
  if (conditions.actionCategories) {
    if (!ctx.baseActionIntent || !conditions.actionCategories.includes(ctx.baseActionIntent)) {
      return 0;
    }
    score += 10;
  }

  // Check NPC requirement
  if (conditions.requiresNpc && !ctx.npcId) {
    return 0;
  }
  if (conditions.requiresNpc && ctx.npcId) {
    score += 25; // Strong bonus for NPC-focused follow-ups when NPC present
  }

  // Check rival requirement
  if (conditions.requiresRival && !ctx.rivalPresent) {
    return 0;
  }
  if (conditions.requiresRival && ctx.rivalPresent) {
    score += 30; // Strong bonus for rival-focused follow-ups
  }

  // Check faction requirement
  if (conditions.requiresFactions && conditions.requiresFactions.length > 0) {
    const hasMatchingFaction = ctx.factions?.some(f => conditions.requiresFactions!.includes(f));
    if (!hasMatchingFaction) {
      return 0;
    }
    score += 15;
  }

  // Check difficulty range
  if (conditions.minDifficulty && (ctx.encounterDifficulty ?? 0) < conditions.minDifficulty) {
    return 0;
  }
  if (conditions.maxDifficulty && (ctx.encounterDifficulty ?? 10) > conditions.maxDifficulty) {
    return 0;
  }

  // Check leverage threshold
  if (conditions.leverageThreshold) {
    const leverageValue = ctx.leverageState?.[conditions.leverageThreshold.type] ?? 0;
    if (leverageValue < conditions.leverageThreshold.min) {
      return 0;
    }
    score += 20;
  }

  return score;
}

/**
 * Generate follow-up actions based on encounter context
 */
export function generateFollowUps(
  ctx: FollowUpContext,
  opts?: { max?: number }
): FollowUpAction[] {
  const maxFollowUps = opts?.max ?? 3;

  // Score all templates
  const scoredTemplates = FOLLOW_UP_TEMPLATES
    .map(template => ({
      template,
      score: scoreTemplate(template, ctx),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  // Take top N
  const selected = scoredTemplates.slice(0, maxFollowUps);

  // Convert to FollowUpAction
  return selected.map(({ template }) => ({
    id: generateFollowUpId(template.id, ctx),
    name: template.name,
    description: template.description,
    expiresInActions: template.ttl,
    riskTier: template.riskTier,
    intentHint: template.intentHint,
    rewardBias: template.rewardBias,
    executeHints: {
      ...template.executeHints,
      likelyFactions: template.executeHints.likelyFactions ?? ctx.factions,
      locationTypes: template.executeHints.locationTypes,
    },
    origin: {
      actionId: ctx.actionId,
      encounterId: ctx.encounterId,
      encounterType: ctx.encounterType,
      district: ctx.district,
    },
    uiTags: template.uiTags,
  }));
}

/**
 * Decrement TTLs and remove expired follow-ups
 */
export function decrementFollowUpTTLs(existing: FollowUpAction[]): FollowUpAction[] {
  return existing
    .map(f => ({ ...f, expiresInActions: f.expiresInActions - 1 }))
    .filter(f => f.expiresInActions > 0);
}

/**
 * Merge new follow-ups with existing, deduping by ID and limiting total count
 */
export function mergeFollowUps(
  existing: FollowUpAction[],
  incoming: FollowUpAction[],
  opts?: { maxTotal?: number }
): FollowUpAction[] {
  const maxTotal = opts?.maxTotal ?? 5;
  const byId = new Map<string, FollowUpAction>();

  // Existing first (preserve order)
  for (const f of existing) {
    byId.set(f.id, f);
  }

  // Incoming overwrites if same ID (fresher)
  for (const f of incoming) {
    byId.set(f.id, f);
  }

  // Sort by urgency (lower TTL first) then by risk tier (dangerous first)
  const riskOrder: Record<RiskTier, number> = { dangerous: 0, risky: 1, good: 2 };
  const merged = Array.from(byId.values())
    .sort((a, b) => {
      if (a.expiresInActions !== b.expiresInActions) {
        return a.expiresInActions - b.expiresInActions;
      }
      return riskOrder[a.riskTier] - riskOrder[b.riskTier];
    });

  return merged.slice(0, maxTotal);
}

/**
 * Build an ephemeral Action object from a follow-up for execution
 */
export function buildEphemeralActionFromFollowUp(
  followUp: FollowUpAction,
  baseAction?: Action,
  lastDifficulty?: number,
  districtLocationType?: string
): Action {
  const hints = followUp.executeHints;
  const baseDifficulty = lastDifficulty ?? 5;
  const difficultyDelta = hints.difficultyDelta ?? 0;
  const targetDifficulty = Math.max(1, Math.min(10, baseDifficulty + difficultyDelta));

  // Derive category and moral intent from base action or defaults
  const category: ActionCategory = (baseAction?.category as ActionCategory) ?? 'neutral';
  const moralIntent: MoralIntent = baseAction?.moralIntent ?? 'neutral';

  // Energy cost based on risk tier
  const energyCostByRisk: Record<RiskTier, number> = { good: 8, risky: 10, dangerous: 12 };
  const energyCost = energyCostByRisk[followUp.riskTier];

  // Base rewards with deltas
  const baseXP = baseAction?.baseXPReward ?? 25;
  const baseMoney = baseAction?.baseMoneyReward ?? 0;

  return {
    id: followUp.id,
    name: followUp.name,
    description: followUp.description,
    category,
    moralIntent,
    energyCost,
    factionImpacts: baseAction?.factionImpacts ?? [],
    attributeGrowthChance: baseAction?.attributeGrowthChance ?? [],
    encounterChance: hints.encounterChance ?? 1,
    encounterTypes: hints.encounterTypes,
    difficultyRange: [targetDifficulty, targetDifficulty] as [number, number],
    likelyFactions: hints.likelyFactions ?? baseAction?.likelyFactions ?? [],
    narrativeContext: hints.narrativeContext,
    locationTypes: hints.locationTypes ?? (districtLocationType ? [districtLocationType] : baseAction?.locationTypes ?? ['city_streets']),
    baseXPReward: Math.max(10, baseXP + (hints.baseXPRewardDelta ?? 0)),
    baseMoneyReward: Math.max(0, baseMoney + (hints.baseMoneyRewardDelta ?? 0)),
    // No cooldown for follow-ups
    cooldownHours: undefined,
  };
}

/**
 * Check if an action ID is a follow-up action
 */
export function isFollowUpActionId(actionId: string): boolean {
  return actionId.startsWith('fup_');
}

/**
 * Safely parse pendingFollowUps from JSON (fail-soft)
 */
export function parsePendingFollowUps(json: unknown): FollowUpAction[] {
  if (!json) return [];
  if (!Array.isArray(json)) return [];

  // Basic validation - ensure each item has required fields
  return json.filter((item): item is FollowUpAction => {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.expiresInActions === 'number' &&
      typeof item.riskTier === 'string' &&
      typeof item.intentHint === 'string' &&
      typeof item.executeHints === 'object'
    );
  });
}
