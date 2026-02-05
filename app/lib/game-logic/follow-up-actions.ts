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

// Categories for diversity selection
export type FollowUpCategory = 'investigate' | 'chase' | 'cleanup' | 'pressure' | 'recover' | 'consolidate';

export interface FollowUpAction {
  id: string;                       // stable deterministic id (for dedupe)
  name: string;                     // display title
  description: string;              // display description
  expiresInActions: number;         // TTL decremented per completed action
  riskTier: RiskTier;
  intentHint: IntentHint;
  rewardBias?: RewardBias;

  // Keys for deduplication and cooldown
  templateKey: string;              // template ID
  subjectKey: string;               // derived from npc/rival/faction/district
  followUpKey: string;              // templateKey + '::' + subjectKey

  // Category for diversity selection
  category: FollowUpCategory;

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

// History tracking for cooldowns
export interface FollowUpHistoryEntry {
  followUpKey: string;
  actionCounter: number;            // when this was generated/executed/expired
  status: 'generated' | 'executed' | 'expired';
}

export interface FollowUpHistory {
  entries: FollowUpHistoryEntry[];
}

export interface FollowUpContext {
  // Character context (for jitter)
  characterId?: string;
  actionCounter?: number;           // current action counter for history

  // Encounter context
  encounterId?: string;
  seedId?: string;
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
  rivalId?: string;
  rivalPresent?: boolean;

  // Post-resolve state
  leverageState?: { control: number; stability: number; position: number };
  usedPowers?: string[];
  baseActionIntent?: string;
}

// Options for generating follow-ups
export interface GenerateFollowUpsOptions {
  max?: number;
  history?: FollowUpHistory;
  cooldownActions?: number;         // default 3
  pendingFollowUps?: FollowUpAction[]; // existing pending for dedupe
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
  category: FollowUpCategory;       // for diversity selection
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
    category: 'pressure',
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
    category: 'chase',
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
    category: 'investigate',
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
    category: 'recover',
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
    category: 'cleanup',
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
    category: 'recover',
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
    category: 'cleanup',
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
    category: 'chase',
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
    category: 'pressure',
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
    category: 'investigate',
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
    category: 'investigate',
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
    category: 'recover',
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
    category: 'pressure',
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
    category: 'consolidate',
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
// HELPER FUNCTIONS — Keys, Hashing, History
// =============================================================================

const DEFAULT_COOLDOWN_ACTIONS = 3;
const MAX_HISTORY_ENTRIES = 30;

/**
 * Derive a subject key from context (npc > rival > faction > district)
 */
function deriveSubjectKey(ctx: FollowUpContext, template: FollowUpTemplate): string {
  if (template.conditions.requiresNpc && ctx.npcId) return `npc:${ctx.npcId}`;
  if (template.conditions.requiresRival && ctx.rivalId) return `rival:${ctx.rivalId}`;
  if (ctx.factions?.length) return `fac:${ctx.factions[0]}`;
  if (ctx.district) return `dst:${ctx.district}`;
  return 'generic';
}

/**
 * Build the canonical followUpKey for dedup + cooldown
 */
function buildFollowUpKey(templateId: string, subjectKey: string): string {
  return `${templateId}::${subjectKey}`;
}

/**
 * Generate a stable deterministic ID for a follow-up
 */
function generateFollowUpId(templateId: string, ctx: FollowUpContext): string {
  const base = `fup_${templateId}_${ctx.encounterId ?? ctx.actionId ?? 'unknown'}`;
  const hash = ((ctx.encounterDifficulty ?? 0) * 7 + (ctx.conflictResult === 'victory' ? 1 : ctx.conflictResult === 'defeat' ? 2 : 3)) % 1000;
  return `${base}_${hash}`;
}

/**
 * Deterministic score jitter derived from characterId + seedId + encounterId.
 * Returns a value in [-15, +15] that varies per encounter but is stable per run.
 */
function deterministicJitter(templateId: string, ctx: FollowUpContext): number {
  const seed = `${ctx.characterId ?? ''}|${ctx.seedId ?? ''}|${ctx.encounterId ?? ''}|${templateId}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  // Map to [-15, +15]
  return ((Math.abs(h) % 31) - 15);
}

// =============================================================================
// HISTORY MANAGEMENT
// =============================================================================

/**
 * Safely parse follow-up history from JSON
 */
export function parseFollowUpHistory(json: unknown): FollowUpHistory {
  if (!json || typeof json !== 'object') return { entries: [] };
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj.entries)) return { entries: [] };
  return {
    entries: obj.entries.filter((e): e is FollowUpHistoryEntry =>
      typeof e === 'object' && e !== null &&
      typeof (e as FollowUpHistoryEntry).followUpKey === 'string' &&
      typeof (e as FollowUpHistoryEntry).actionCounter === 'number' &&
      typeof (e as FollowUpHistoryEntry).status === 'string'
    ),
  };
}

/**
 * Check if a followUpKey is on cooldown (appeared within last N actions)
 */
function isOnCooldown(
  key: string,
  history: FollowUpHistory,
  currentActionCounter: number,
  cooldownActions: number,
): boolean {
  return history.entries.some(e =>
    e.followUpKey === key && (currentActionCounter - e.actionCounter) < cooldownActions
  );
}

/**
 * Record new entries in history. Trims to MAX_HISTORY_ENTRIES.
 */
export function addHistoryEntries(
  history: FollowUpHistory,
  entries: FollowUpHistoryEntry[],
): FollowUpHistory {
  const combined = [...history.entries, ...entries];
  // Keep only the most recent entries
  const trimmed = combined.length > MAX_HISTORY_ENTRIES
    ? combined.slice(combined.length - MAX_HISTORY_ENTRIES)
    : combined;
  return { entries: trimmed };
}

// =============================================================================
// SCORING
// =============================================================================

/**
 * Score a template against the current context (base score, no jitter)
 */
function scoreTemplate(template: FollowUpTemplate, ctx: FollowUpContext): number {
  let score = template.score;
  const { conditions } = template;

  // Check conflict result condition
  if (conditions.conflictResults) {
    if (!ctx.conflictResult || !conditions.conflictResults.includes(ctx.conflictResult)) {
      return 0;
    }
    score += 20;
  }

  // Check gambit outcome condition
  if (conditions.gambitOutcomes) {
    if (!ctx.gambitOutcome || !conditions.gambitOutcomes.includes(ctx.gambitOutcome)) {
      return 0;
    }
    score += 15;
  }

  // Check action category condition
  if (conditions.actionCategories) {
    if (!ctx.baseActionIntent || !conditions.actionCategories.includes(ctx.baseActionIntent)) {
      return 0;
    }
    score += 10;
  }

  // Check NPC requirement
  if (conditions.requiresNpc && !ctx.npcId) return 0;
  if (conditions.requiresNpc && ctx.npcId) score += 25;

  // Check rival requirement
  if (conditions.requiresRival && !ctx.rivalPresent) return 0;
  if (conditions.requiresRival && ctx.rivalPresent) score += 30;

  // Check faction requirement
  if (conditions.requiresFactions && conditions.requiresFactions.length > 0) {
    const hasMatchingFaction = ctx.factions?.some(f => conditions.requiresFactions!.includes(f));
    if (!hasMatchingFaction) return 0;
    score += 15;
  }

  // Check difficulty range
  if (conditions.minDifficulty && (ctx.encounterDifficulty ?? 0) < conditions.minDifficulty) return 0;
  if (conditions.maxDifficulty && (ctx.encounterDifficulty ?? 10) > conditions.maxDifficulty) return 0;

  // Check leverage threshold
  if (conditions.leverageThreshold) {
    const leverageValue = ctx.leverageState?.[conditions.leverageThreshold.type] ?? 0;
    if (leverageValue < conditions.leverageThreshold.min) return 0;
    score += 20;
  }

  return score;
}

// =============================================================================
// DIVERSITY SELECTION
// =============================================================================

interface ScoredCandidate {
  template: FollowUpTemplate;
  score: number;                    // base + jitter
  subjectKey: string;
  followUpKey: string;
}

/**
 * Select up to `max` candidates with diversity constraints:
 *  - prefer 1 control + 1 stability + 1 position if available
 *  - prefer different categories (investigate/chase/cleanup/pressure/recover/consolidate)
 *  - no duplicate followUpKeys
 */
function diversitySelect(candidates: ScoredCandidate[], max: number): ScoredCandidate[] {
  if (candidates.length <= max) return candidates;

  const selected: ScoredCandidate[] = [];
  const usedKeys = new Set<string>();
  const usedIntents = new Set<IntentHint>();
  const usedCategories = new Set<FollowUpCategory>();

  // Pass 1: pick one per intent (control, stability, position) — highest scored candidate
  const intents: IntentHint[] = ['control', 'stability', 'position'];
  for (const intent of intents) {
    if (selected.length >= max) break;
    const best = candidates.find(c =>
      c.template.intentHint === intent &&
      !usedKeys.has(c.followUpKey) &&
      !usedCategories.has(c.template.category)
    );
    if (best) {
      selected.push(best);
      usedKeys.add(best.followUpKey);
      usedIntents.add(intent);
      usedCategories.add(best.template.category);
    }
  }

  // Pass 2: fill remaining slots preferring unused categories
  for (const c of candidates) {
    if (selected.length >= max) break;
    if (usedKeys.has(c.followUpKey)) continue;
    // Prefer unused category
    if (!usedCategories.has(c.template.category)) {
      selected.push(c);
      usedKeys.add(c.followUpKey);
      usedIntents.add(c.template.intentHint);
      usedCategories.add(c.template.category);
    }
  }

  // Pass 3: fill any remaining slots with highest scoring regardless
  for (const c of candidates) {
    if (selected.length >= max) break;
    if (usedKeys.has(c.followUpKey)) continue;
    selected.push(c);
    usedKeys.add(c.followUpKey);
  }

  return selected;
}

// =============================================================================
// MAIN GENERATION
// =============================================================================

/**
 * Generate follow-up actions based on encounter context.
 * Applies cooldown, dedupe, jitter, and diversity selection.
 */
export function generateFollowUps(
  ctx: FollowUpContext,
  opts?: GenerateFollowUpsOptions,
): FollowUpAction[] {
  const maxFollowUps = opts?.max ?? 3;
  const history = opts?.history ?? { entries: [] };
  const cooldownActions = opts?.cooldownActions ?? DEFAULT_COOLDOWN_ACTIONS;
  const pendingFollowUps = opts?.pendingFollowUps ?? [];
  const currentActionCounter = ctx.actionCounter ?? 0;

  // Build set of followUpKeys already in pending list (for dedupe)
  const pendingKeys = new Set(pendingFollowUps.map(f => f.followUpKey).filter(Boolean));

  // Score all templates, apply jitter, filter cooldowns
  const candidates: ScoredCandidate[] = [];

  for (const template of FOLLOW_UP_TEMPLATES) {
    const baseScore = scoreTemplate(template, ctx);
    if (baseScore <= 0) continue;

    const subjectKey = deriveSubjectKey(ctx, template);
    const followUpKey = buildFollowUpKey(template.id, subjectKey);

    // Skip if already pending
    if (pendingKeys.has(followUpKey)) continue;

    // Skip if on cooldown
    if (isOnCooldown(followUpKey, history, currentActionCounter, cooldownActions)) continue;

    // Apply deterministic jitter
    const jitter = deterministicJitter(template.id, ctx);
    const finalScore = baseScore + jitter;

    candidates.push({ template, score: finalScore, subjectKey, followUpKey });
  }

  // Sort by final score descending
  candidates.sort((a, b) => b.score - a.score);

  // Apply diversity selection
  const selected = diversitySelect(candidates, maxFollowUps);

  // Convert to FollowUpAction
  return selected.map(({ template, subjectKey, followUpKey }) => ({
    id: generateFollowUpId(template.id, ctx),
    name: template.name,
    description: template.description,
    expiresInActions: template.ttl,
    riskTier: template.riskTier,
    intentHint: template.intentHint,
    category: template.category,
    rewardBias: template.rewardBias,
    templateKey: template.id,
    subjectKey,
    followUpKey,
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

// =============================================================================
// TTL + MERGE
// =============================================================================

/**
 * Decrement TTLs and return { alive, expired } partitions.
 * Expired entries can be recorded in history.
 */
export function decrementFollowUpTTLs(existing: FollowUpAction[]): {
  alive: FollowUpAction[];
  expired: FollowUpAction[];
} {
  const alive: FollowUpAction[] = [];
  const expired: FollowUpAction[] = [];

  for (const f of existing) {
    const updated = { ...f, expiresInActions: f.expiresInActions - 1 };
    if (updated.expiresInActions > 0) {
      alive.push(updated);
    } else {
      expired.push(f);
    }
  }

  return { alive, expired };
}

/**
 * Merge new follow-ups with existing.
 * Dedupes by followUpKey (prefers newer), then by id. Limits to maxTotal.
 */
export function mergeFollowUps(
  existing: FollowUpAction[],
  incoming: FollowUpAction[],
  opts?: { maxTotal?: number }
): FollowUpAction[] {
  const maxTotal = opts?.maxTotal ?? 5;
  const byKey = new Map<string, FollowUpAction>();

  // Existing first (preserve older entries)
  for (const f of existing) {
    const key = f.followUpKey || f.id;
    if (!byKey.has(key)) byKey.set(key, f);
  }

  // Incoming overwrites by followUpKey (fresher)
  for (const f of incoming) {
    const key = f.followUpKey || f.id;
    byKey.set(key, f);
  }

  // Sort by urgency (lower TTL first) then by risk tier (dangerous first)
  const riskOrder: Record<RiskTier, number> = { dangerous: 0, risky: 1, good: 2 };
  const merged = Array.from(byKey.values())
    .sort((a, b) => {
      if (a.expiresInActions !== b.expiresInActions) {
        return a.expiresInActions - b.expiresInActions;
      }
      return riskOrder[a.riskTier] - riskOrder[b.riskTier];
    });

  return merged.slice(0, maxTotal);
}

// =============================================================================
// EPHEMERAL ACTION BUILDER
// =============================================================================

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

  const category: ActionCategory = (baseAction?.category as ActionCategory) ?? 'neutral';
  const moralIntent: MoralIntent = baseAction?.moralIntent ?? 'neutral';

  const energyCostByRisk: Record<RiskTier, number> = { good: 6, risky: 8, dangerous: 10 };
  const energyCost = energyCostByRisk[followUp.riskTier];

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
    cooldownHours: undefined,
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

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
