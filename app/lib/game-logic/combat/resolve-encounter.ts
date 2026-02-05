/**
 * Combat Resolver
 * Pure, deterministic encounter resolution based on character stats and dice roll
 *
 * This module exports both resolution (with RNG) and preview (without RNG) functions.
 * Both use the same internal math via computeResolutionMath() to ensure consistency.
 */

import { getPowerById } from '@/app/data/powers';
import type {
  Approach,
  DisplayChip,
  Modifier,
  Outcome,
  ResolutionInput,
  ResolveEncounterInput,
  ResolutionBreakdown,
  ResolutionPreview,
  RiskTier,
  PrepSelection,
  GambitIntent,
  GambitPreview,
  GambitProbabilities,
  GambitEffect,
  GambitResult,
  GambitOutcomeTier,
} from './types';
import { calculatePowerBonus, type CharacterPower } from '../power-progression';

// Approach-specific strength keywords that powers can match
const APPROACH_STRENGTH_KEYWORDS: Record<Approach, string[]> = {
  direct: [
    'direct combat',
    'intimidation',
    'crowd control',
    'breaking obstacles',
    'high damage',
    'explosive force',
  ],
  subtle: [
    'stealth',
    'infiltration',
    'escape',
    'surveillance',
    'reconnaissance',
    'ambush',
    'avoiding detection',
  ],
  tactical: [
    'tactical advantage',
    'environmental manipulation',
    'disabling electronics',
    'creating barriers',
    'disarming opponents',
    'creating cover',
    'trapping enemies',
    'avoid traps',
  ],
  diplomatic: [
    'detecting lies',
    'interrogation',
    'understanding motives',
    'coordination with allies',
    'mental communication',
    'information gathering',
  ],
};

// Primary attributes for each approach (two stats averaged)
export const APPROACH_ATTRIBUTES: Record<Approach, [string, string]> = {
  direct: ['strength', 'endurance'],
  subtle: ['stealth', 'agility'],
  tactical: ['intelligence', 'perception'],
  diplomatic: ['charisma', 'willpower'],
};

// =============================================================================
// GAMBIT SYSTEM: Intent detection and outcome generation
// =============================================================================

// Keywords for detecting gambit intent from choice text
const GAMBIT_INTENT_KEYWORDS: Record<GambitIntent, string[]> = {
  control: [
    'force', 'dominate', 'overpower', 'seize', 'take', 'attack', 'strike',
    'charge', 'confront', 'demand', 'impose', 'assert', 'overwhelm', 'crush',
  ],
  stability: [
    'defend', 'protect', 'hold', 'steady', 'resist', 'endure', 'brace',
    'fortify', 'secure', 'maintain', 'sustain', 'anchor', 'guard', 'shield',
  ],
  position: [
    'flank', 'outmaneuver', 'reposition', 'circle', 'sneak', 'slip', 'evade',
    'dodge', 'feint', 'divert', 'distract', 'infiltrate', 'scout', 'assess',
  ],
};

// Counter resources for each intent (used in complication/backfire)
const INTENT_COUNTER_RESOURCE: Record<GambitIntent, GambitIntent> = {
  control: 'stability',   // aggressive control → opponent stabilizes
  stability: 'position',  // defensive posture → opponent repositions
  position: 'control',    // maneuvering → opponent seizes control
};

// =============================================================================
// GAMBIT SHAPE LIBRARY: Mechanically distinct gambit templates
// =============================================================================

type GambitShape = {
  id: string;
  intent: GambitIntent;
  clean: GambitEffect[];
  complication: GambitEffect[];
  backfire: GambitEffect[];
};

/**
 * Library of mechanically distinct gambit shapes.
 * Ordered so standard intent-counter shapes come first (matching existing behavior),
 * followed by opponent-facing / alternative shapes for variety.
 */
const GAMBIT_SHAPES: GambitShape[] = [
  // Standard intent-counter shapes (match existing buildGambitPreview behavior)
  {
    id: 'push',
    intent: 'control',
    clean: [{ target: 'player', resource: 'control', delta: 1 }],
    complication: [
      { target: 'player', resource: 'control', delta: 1 },
      { target: 'opponent', resource: 'stability', delta: 1 },
    ],
    backfire: [{ target: 'opponent', resource: 'stability', delta: 1 }],
  },
  {
    id: 'fortify',
    intent: 'stability',
    clean: [{ target: 'player', resource: 'stability', delta: 1 }],
    complication: [
      { target: 'player', resource: 'stability', delta: 1 },
      { target: 'opponent', resource: 'position', delta: 1 },
    ],
    backfire: [{ target: 'opponent', resource: 'position', delta: 1 }],
  },
  {
    id: 'reposition',
    intent: 'position',
    clean: [{ target: 'player', resource: 'position', delta: 1 }],
    complication: [
      { target: 'player', resource: 'position', delta: 1 },
      { target: 'opponent', resource: 'control', delta: 1 },
    ],
    backfire: [{ target: 'opponent', resource: 'control', delta: 1 }],
  },
  // Opponent-facing shapes (for the 4th+ distinct choice)
  {
    id: 'pressure',
    intent: 'control',
    clean: [{ target: 'opponent', resource: 'stability', delta: -1 }],
    complication: [
      { target: 'opponent', resource: 'stability', delta: -1 },
      { target: 'player', resource: 'stability', delta: -1 },
    ],
    backfire: [{ target: 'player', resource: 'stability', delta: -1 }],
  },
  {
    id: 'undermine',
    intent: 'position',
    clean: [{ target: 'opponent', resource: 'control', delta: -1 }],
    complication: [
      { target: 'opponent', resource: 'control', delta: -1 },
      { target: 'player', resource: 'position', delta: -1 },
    ],
    backfire: [{ target: 'player', resource: 'position', delta: -1 }],
  },
];

/**
 * Compute a canonical signature for a gambit preview based on resource deltas.
 * Two gambits with the same signature are mechanically identical.
 */
export function computeGambitSignature(preview: GambitPreview): string {
  const sortEffects = (effects: GambitEffect[]) =>
    [...effects]
      .sort((a, b) => {
        if (a.target !== b.target) return a.target.localeCompare(b.target);
        if (a.resource !== b.resource) return a.resource.localeCompare(b.resource);
        return a.delta - b.delta;
      })
      .map(e => `${e.target}:${e.resource}:${e.delta}`)
      .join(',');

  return `${sortEffects(preview.outcomes.clean)}||${sortEffects(preview.outcomes.backfire)}`;
}

/**
 * Build a GambitPreview from a shape definition and risk tier.
 */
function buildGambitFromShape(shape: GambitShape, riskTier: RiskTier): GambitPreview {
  return {
    intent: shape.intent,
    probabilities: GAMBIT_PROBABILITIES[riskTier],
    outcomes: {
      clean: shape.clean.map(e => ({ ...e })),
      complication: shape.complication.map(e => ({ ...e })),
      backfire: shape.backfire.map(e => ({ ...e })),
    },
  };
}

/**
 * Assign mechanically distinct gambit previews to a set of choices.
 * Each choice gets a unique (clean, backfire) signature.
 *
 * Algorithm:
 * 1. For each choice, first try the naturally inferred intent.
 * 2. If that signature is already used, iterate through the shape library
 *    to find the first unused shape.
 * 3. Returns an array of GambitPreviews parallel to the input choices.
 */
export function assignDistinctGambits(
  choices: { text: string; riskTier: RiskTier }[]
): GambitPreview[] {
  const usedSignatures = new Set<string>();
  const results: GambitPreview[] = [];

  for (const { text, riskTier } of choices) {
    // First try: use the naturally inferred intent (preserves existing behavior when possible)
    const intent = inferGambitIntent(text);
    const naturalPreview = buildGambitPreview(intent, riskTier);
    const naturalSig = computeGambitSignature(naturalPreview);

    if (!usedSignatures.has(naturalSig)) {
      usedSignatures.add(naturalSig);
      results.push(naturalPreview);
      continue;
    }

    // Fallback: find an unused shape from the library
    let found = false;
    for (const shape of GAMBIT_SHAPES) {
      const shapePreview = buildGambitFromShape(shape, riskTier);
      const shapeSig = computeGambitSignature(shapePreview);
      if (!usedSignatures.has(shapeSig)) {
        usedSignatures.add(shapeSig);
        results.push(shapePreview);
        found = true;
        break;
      }
    }

    if (!found) {
      // All shapes exhausted — use natural preview as last resort
      results.push(naturalPreview);
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(
      '[Gambit Dedup] Assigned signatures:',
      results.map((r, i) => ({
        choice: i,
        intent: r.intent,
        sig: computeGambitSignature(r),
      }))
    );
  }

  return results;
}

// Probabilities by risk tier
const GAMBIT_PROBABILITIES: Record<RiskTier, GambitProbabilities> = {
  great: { clean: 60, complication: 30, backfire: 10 },
  good: { clean: 50, complication: 35, backfire: 15 },
  risky: { clean: 30, complication: 45, backfire: 25 },
  dangerous: { clean: 15, complication: 40, backfire: 45 },
};

/**
 * Infer gambit intent from choice text using keyword matching.
 * Falls back to 'control' if no keywords match.
 */
export function inferGambitIntent(choiceText: string): GambitIntent {
  const lower = choiceText.toLowerCase();

  // Count keyword matches for each intent
  const scores: Record<GambitIntent, number> = { control: 0, stability: 0, position: 0 };

  for (const [intent, keywords] of Object.entries(GAMBIT_INTENT_KEYWORDS) as [GambitIntent, string[]][]) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        scores[intent]++;
      }
    }
  }

  // Find intent with highest score
  let maxIntent: GambitIntent = 'control';
  let maxScore = 0;

  for (const [intent, score] of Object.entries(scores) as [GambitIntent, number][]) {
    if (score > maxScore) {
      maxScore = score;
      maxIntent = intent;
    }
  }

  return maxIntent;
}

/**
 * Build gambit preview for a choice.
 * Shows probabilities and potential effects for each outcome tier.
 */
export function buildGambitPreview(intent: GambitIntent, riskTier: RiskTier): GambitPreview {
  const probabilities = GAMBIT_PROBABILITIES[riskTier];
  const counterResource = INTENT_COUNTER_RESOURCE[intent];

  return {
    intent,
    probabilities,
    outcomes: {
      clean: [
        { target: 'player', resource: intent, delta: 1 },
      ],
      complication: [
        { target: 'player', resource: intent, delta: 1 },
        { target: 'opponent', resource: counterResource, delta: 1 },
      ],
      backfire: [
        { target: 'opponent', resource: counterResource, delta: 1 },
      ],
    },
  };
}

/**
 * Roll gambit outcome based on probabilities.
 * Returns the resolved gambit with effects to apply.
 */
export function resolveGambit(
  intent: GambitIntent,
  riskTier: RiskTier,
  rng: () => number = Math.random
): GambitResult {
  const probabilities = GAMBIT_PROBABILITIES[riskTier];
  const counterResource = INTENT_COUNTER_RESOURCE[intent];

  // Roll 1-100
  const roll = Math.floor(rng() * 100) + 1;

  // Determine outcome tier
  let outcomeTier: GambitOutcomeTier;
  let effects: GambitEffect[];

  if (roll <= probabilities.clean) {
    outcomeTier = 'clean';
    effects = [{ target: 'player', resource: intent, delta: 1 }];
  } else if (roll <= probabilities.clean + probabilities.complication) {
    outcomeTier = 'complication';
    effects = [
      { target: 'player', resource: intent, delta: 1 },
      { target: 'opponent', resource: counterResource, delta: 1 },
    ];
  } else {
    outcomeTier = 'backfire';
    effects = [{ target: 'opponent', resource: counterResource, delta: 1 }];
  }

  return { intent, roll, outcomeTier, effects };
}

/**
 * Resolve a gambit using the preview's own outcomes (for shape-aware resolution).
 * This ensures the resolved effects match what was shown in the preview UI.
 */
export function resolveGambitFromPreview(
  preview: GambitPreview,
  rng: () => number = Math.random
): GambitResult {
  const { probabilities, outcomes, intent } = preview;
  const roll = Math.floor(rng() * 100) + 1;

  let outcomeTier: GambitOutcomeTier;
  let effects: GambitEffect[];

  if (roll <= probabilities.clean) {
    outcomeTier = 'clean';
    effects = outcomes.clean.map(e => ({ ...e }));
  } else if (roll <= probabilities.clean + probabilities.complication) {
    outcomeTier = 'complication';
    effects = outcomes.complication.map(e => ({ ...e }));
  } else {
    outcomeTier = 'backfire';
    effects = outcomes.backfire.map(e => ({ ...e }));
  }

  return { intent, roll, outcomeTier, effects };
}

// Clamp a number between min and max
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert difficulty (1-10) to base target (40-95)
 * Higher difficulty = higher target = harder to succeed
 */
function difficultyToBaseTarget(difficulty: number): number {
  const d = clamp(difficulty, 1, 10);
  return clamp(45 + d * 5, 40, 95);
}

/**
 * Calculate attribute bonus based on approach
 * Returns the bonus value (positive = helps, lowers target when applied)
 */
function calculateAttributeBonus(
  approach: Approach,
  attributes: Record<string, number>
): { bonus: number; label: string; rawBonus: number } {
  const [attr1, attr2] = APPROACH_ATTRIBUTES[approach];
  const val1 = attributes[attr1] ?? 10;
  const val2 = attributes[attr2] ?? 10;

  const statScore = (val1 + val2) / 2;
  const rawBonus = Math.floor((statScore - 10) * 1.5);
  const bonus = clamp(rawBonus, -10, 20);

  const attr1Display = attr1.charAt(0).toUpperCase() + attr1.slice(1);
  const attr2Display = attr2.charAt(0).toUpperCase() + attr2.slice(1);

  return {
    bonus: -bonus, // Negative because it lowers target
    label: `${attr1Display}/${attr2Display}`,
    rawBonus: bonus, // Original positive value for display chips
  };
}

/**
 * Calculate power synergy bonus based on approach
 * Returns the bonus value (positive = helps, lowers target when applied)
 */
function calculatePowerSynergyBonus(
  approach: Approach,
  powerIds: string[]
): { bonus: number; label: string; matchedPowers: string[]; rawBonus: number } {
  const keywords = APPROACH_STRENGTH_KEYWORDS[approach];
  const matchedPowers: string[] = [];

  for (const powerId of powerIds) {
    const power = getPowerById(powerId);
    if (!power) continue;

    const hasMatch = power.narrativeStrengths.some(strength =>
      keywords.some(keyword =>
        strength.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    if (hasMatch) {
      matchedPowers.push(power.name);
    }
  }

  if (matchedPowers.length === 0) {
    return { bonus: 0, label: 'Power Synergy', matchedPowers: [], rawBonus: 0 };
  }

  const rawBonus = 5 + Math.min(matchedPowers.length - 1, 3) * 2;
  const bonus = Math.min(rawBonus, 12);

  return {
    bonus: -bonus, // Negative because it lowers target
    label: `Power Synergy (${matchedPowers.slice(0, 3).join(', ')}${matchedPowers.length > 3 ? '...' : ''})`,
    matchedPowers,
    rawBonus: bonus, // Original positive value for display chips
  };
}

/**
 * Calculate reputation bonus for relevant factions
 * Returns the bonus value (positive rep = helps, lowers target when applied)
 */
function calculateReputationBonus(
  repByFaction: Record<string, number>,
  encounterTags?: string[],
  involvedFactions?: string[]
): { bonus: number; label: string; rawBonus: number } {
  const relevantFactions = new Set<string>();

  if (involvedFactions) {
    for (const f of involvedFactions) {
      relevantFactions.add(f);
    }
  }

  if (encounterTags) {
    for (const tag of encounterTags) {
      if (repByFaction[tag] !== undefined) {
        relevantFactions.add(tag);
      }
    }
  }

  if (relevantFactions.size === 0) {
    return { bonus: 0, label: 'Reputation', rawBonus: 0 };
  }

  let maxRep = 0;
  for (const factionId of relevantFactions) {
    const rep = repByFaction[factionId] ?? 0;
    if (Math.abs(rep) > Math.abs(maxRep)) {
      maxRep = rep;
    }
  }

  const rawBonus = Math.floor(maxRep / 10);
  const bonus = clamp(rawBonus, -6, 6);

  if (bonus === 0) {
    return { bonus: 0, label: 'Reputation', rawBonus: 0 };
  }

  return {
    bonus: -bonus, // Negative because positive rep lowers target
    label: 'Reputation',
    rawBonus: bonus, // Original value for display chips (can be negative)
  };
}

// =============================================================================
// SHARED MATH: Used by both resolve and preview
// =============================================================================

type ResolutionMathResult = {
  baseTarget: number;
  target: number;
  modifiers: Modifier[];
  attrResult: ReturnType<typeof calculateAttributeBonus>;
  powerResult: ReturnType<typeof calculatePowerSynergyBonus>;
  repResult: ReturnType<typeof calculateReputationBonus>;
};

/**
 * Compute resolution math - shared between preview and actual resolution.
 * This ensures preview and resolution always use identical calculations.
 */
function computeResolutionMath(input: ResolutionInput): ResolutionMathResult {
  const {
    difficulty,
    approach,
    attributes,
    powerIds,
    repByFaction,
    encounterTags,
    involvedFactions,
  } = input;

  // 1. Calculate base target from difficulty
  const baseTarget = difficultyToBaseTarget(difficulty);
  const modifiers: Modifier[] = [];

  // Start with base difficulty as a reference modifier (value 0)
  modifiers.push({
    label: `Difficulty ${difficulty}`,
    value: 0,
  });

  // 2. Calculate attribute bonus
  const attrResult = calculateAttributeBonus(approach, attributes);
  if (attrResult.bonus !== 0) {
    modifiers.push({
      label: attrResult.label,
      value: attrResult.bonus,
    });
  }

  // 3. Calculate power synergy bonus
  const powerResult = calculatePowerSynergyBonus(approach, powerIds);
  if (powerResult.bonus !== 0) {
    modifiers.push({
      label: powerResult.label,
      value: powerResult.bonus,
    });
  }

  // 4. Calculate reputation bonus
  const repResult = calculateReputationBonus(repByFaction, encounterTags, involvedFactions);
  if (repResult.bonus !== 0) {
    modifiers.push({
      label: repResult.label,
      value: repResult.bonus,
    });
  }

  // 5. Calculate final target (base + all modifier values)
  const totalModifierValue = modifiers.reduce((sum, m) => sum + m.value, 0);
  const target = clamp(baseTarget + totalModifierValue, 5, 99);

  return {
    baseTarget,
    target,
    modifiers,
    attrResult,
    powerResult,
    repResult,
  };
}

// =============================================================================
// PREVIEW FUNCTION: No RNG, returns estimated chance and risk tier
// =============================================================================

/**
 * Get risk tier based on estimated chance
 */
function getRiskTier(estimatedChance: number): RiskTier {
  if (estimatedChance >= 75) return 'great';
  if (estimatedChance >= 60) return 'good';
  if (estimatedChance >= 45) return 'risky';
  return 'dangerous';
}

/**
 * Preview encounter resolution without RNG.
 * Returns estimated chance and risk tier for UI display.
 * Uses exact same math as actual resolution.
 */
export function previewEncounterResolution(input: ResolutionInput): ResolutionPreview {
  const math = computeResolutionMath(input);

  // Since roll is 1-100 and success is roll >= target:
  // estimatedChance = 101 - target (clamped to 0-100)
  const estimatedChance = clamp(101 - math.target, 0, 100);
  const riskTier = getRiskTier(estimatedChance);

  // Build display chips for UI
  const displayChips: DisplayChip[] = [];

  // Attribute chip (always show)
  const [attr1, attr2] = APPROACH_ATTRIBUTES[input.approach];
  const attr1Short = attr1.slice(0, 3).toUpperCase();
  const attr2Short = attr2.slice(0, 3).toUpperCase();
  displayChips.push({
    label: `${attr1Short}/${attr2Short}`,
    value: math.attrResult.rawBonus,
    type: 'attribute',
  });

  // Synergy chip (only if matched)
  if (math.powerResult.matchedPowers.length > 0) {
    const synergyLabel = math.powerResult.matchedPowers.length === 1
      ? math.powerResult.matchedPowers[0]
      : 'Synergy';
    displayChips.push({
      label: synergyLabel,
      value: math.powerResult.rawBonus,
      type: 'synergy',
    });
  }

  // Reputation chip (only if non-zero)
  if (math.repResult.rawBonus !== 0) {
    displayChips.push({
      label: 'Rep',
      value: math.repResult.rawBonus,
      type: 'reputation',
    });
  }

  // Build gambit preview if choice text is provided
  let gambit: GambitPreview | undefined;
  if (input.choiceText) {
    const intent = inferGambitIntent(input.choiceText);
    gambit = buildGambitPreview(intent, riskTier);
  }

  return {
    target: math.target,
    baseTarget: math.baseTarget,
    modifiers: math.modifiers,
    estimatedChance,
    riskTier,
    displayChips,
    matchedPowers: math.powerResult.matchedPowers,
    attributePair: APPROACH_ATTRIBUTES[input.approach],
    gambit,
  };
}

// =============================================================================
// RESOLUTION FUNCTION: With RNG, returns full breakdown including outcome
// =============================================================================

/**
 * Generate outcome summary based on approach and result
 */
function generateSummary(approach: Approach, outcome: Outcome): string {
  const summaries: Record<Approach, Record<Outcome, string>> = {
    direct: {
      success: 'Your direct approach overwhelmed the opposition.',
      partial: 'You pushed through, but not without taking some hits.',
      failure: 'Your frontal assault met fierce resistance.',
    },
    subtle: {
      success: 'You slipped through unnoticed, achieving your goal.',
      partial: 'You managed to stay hidden, but complications arose.',
      failure: 'Your cover was blown at a critical moment.',
    },
    tactical: {
      success: 'Your careful planning paid off perfectly.',
      partial: 'The plan worked, though not exactly as intended.',
      failure: 'Despite your strategy, things went sideways.',
    },
    diplomatic: {
      success: 'Your words found the right ears and hearts.',
      partial: 'You made progress, but full agreement eluded you.',
      failure: 'Your attempts at negotiation fell on deaf ears.',
    },
  };

  return summaries[approach][outcome];
}

/**
 * Main resolver function - PURE and deterministic (except for RNG)
 * Uses same math as preview to ensure consistency.
 */
export function resolveEncounter(input: ResolveEncounterInput): ResolutionBreakdown {
  const { rng = Math.random, powerLevelBonus, powerLevelLabel, npcInfluenceBonus, npcInfluenceLabel, focusBonus, focusBonusLabel, ...resolutionInput } = input;

  // Use shared math computation
  const math = computeResolutionMath(resolutionInput);

  // Copy modifiers and target to allow power level modification
  const modifiers = [...math.modifiers];
  let target = math.target;

  // Apply power level bonus if provided (negative = easier, lowers target)
  if (powerLevelBonus && powerLevelBonus !== 0) {
    const bonusValue = -powerLevelBonus; // Convert to target modifier (negative bonus = lower target)
    modifiers.push({
      label: powerLevelLabel ?? 'Power Level',
      value: bonusValue,
    });
    target = clamp(target + bonusValue, 5, 99);
  }

  // Apply NPC influence bonus if provided (positive = helps, lowers target)
  if (npcInfluenceBonus && npcInfluenceBonus !== 0) {
    const bonusValue = -npcInfluenceBonus; // Positive influence = lower target = easier
    modifiers.push({
      label: npcInfluenceLabel ?? 'NPC Influence',
      value: bonusValue,
    });
    target = clamp(target + bonusValue, 5, 99);
  }

  // Apply focus channeling bonus if provided (positive = helps, lowers target)
  if (focusBonus && focusBonus > 0) {
    const bonusValue = -focusBonus; // Positive focus = lower target = easier
    modifiers.push({
      label: focusBonusLabel ?? 'Focus',
      value: bonusValue,
    });
    target = clamp(target + bonusValue, 5, 99);
  }

  // Roll the dice (1-100)
  const roll = Math.floor(rng() * 100) + 1;

  // Determine outcome
  let outcome: Outcome;
  if (roll >= target) {
    outcome = 'success';
  } else if (roll >= target - 12) {
    outcome = 'partial';
  } else {
    outcome = 'failure';
  }

  // Generate summary
  const summary = generateSummary(input.approach, outcome);

  return {
    roll,
    target,
    baseTarget: math.baseTarget,
    modifiers,
    outcome,
    summary,
  };
}

/**
 * Infer approach from choice text if not explicitly provided
 * This is a fallback for legacy choices that don't have approach field
 */
export function inferApproachFromText(text: string): Approach {
  const lower = text.toLowerCase();

  if (
    lower.includes('storm') ||
    lower.includes('confront') ||
    lower.includes('charge') ||
    lower.includes('attack') ||
    lower.includes('force') ||
    lower.includes('overpower')
  ) {
    return 'direct';
  }

  if (
    lower.includes('sneak') ||
    lower.includes('slip') ||
    lower.includes('quiet') ||
    lower.includes('hidden') ||
    lower.includes('stealth') ||
    lower.includes('vanish')
  ) {
    return 'subtle';
  }

  if (
    lower.includes('negot') ||
    lower.includes('talk') ||
    lower.includes('reason') ||
    lower.includes('persuade') ||
    lower.includes('convince')
  ) {
    return 'diplomatic';
  }

  // Default to tactical for anything else
  return 'tactical';
}

// =============================================================================
// PREP PHASE HELPERS
// =============================================================================

// Prep action definitions
const PREP_ACTIONS = {
  momentum: { energyCost: 2, combatBonus: 10, label: 'Build Momentum' },
  intel: { energyCost: 1, combatBonus: 5, label: 'Gather Intel' },
} as const;

/**
 * Calculate the energy cost for a prep selection
 */
export function calculatePrepEnergyCost(
  selection: PrepSelection,
  characterPowers: CharacterPower[]
): number {
  if (selection.type === 'momentum') {
    return PREP_ACTIONS.momentum.energyCost;
  }
  if (selection.type === 'intel') {
    return PREP_ACTIONS.intel.energyCost;
  }
  if (selection.type === 'power') {
    const power = getPowerById(selection.powerId);
    if (!power) return 0;
    return power.energyCost;
  }
  return 0;
}

/**
 * Calculate the combat bonus for a prep selection
 * For powers, this uses the existing calculatePowerBonus which considers power level
 */
export function calculatePrepCombatBonus(
  selection: PrepSelection,
  characterPowers: CharacterPower[]
): number {
  if (selection.type === 'momentum') {
    return PREP_ACTIONS.momentum.combatBonus;
  }
  if (selection.type === 'intel') {
    return PREP_ACTIONS.intel.combatBonus;
  }
  if (selection.type === 'power') {
    const power = getPowerById(selection.powerId);
    if (!power) return 0;

    // Find the character's power level
    const charPower = characterPowers.find(cp => cp.powerId === selection.powerId);
    const powerLevel = charPower?.currentLevel ?? 1;

    // Use the existing power bonus calculation (returns a bounded value)
    return calculatePowerBonus(power, powerLevel);
  }
  return 0;
}

/**
 * Get the label for a prep selection (for UI display)
 */
export function getPrepLabel(selection: PrepSelection): string {
  if (selection.type === 'momentum') {
    return PREP_ACTIONS.momentum.label;
  }
  if (selection.type === 'intel') {
    return PREP_ACTIONS.intel.label;
  }
  if (selection.type === 'power') {
    const power = getPowerById(selection.powerId);
    return power?.name ?? 'Use Power';
  }
  return 'Prep';
}

// =============================================================================
// DEV EXAMPLE: Run this function to see example resolution outputs
// =============================================================================
export function devExampleResolution(): void {
  console.log('=== Combat Resolution Examples ===\n');

  const testInput = {
    difficulty: 5,
    approach: 'direct' as const,
    attributes: { strength: 18, endurance: 16 },
    powerIds: ['super_strength'],
    repByFaction: { civilian_population: 25 },
    encounterTags: ['civilian_population'],
  };

  // Preview
  const preview = previewEncounterResolution(testInput);
  console.log('Preview (no RNG):');
  console.log(`  Target: ${preview.target}`);
  console.log(`  Estimated Chance: ${preview.estimatedChance}%`);
  console.log(`  Risk Tier: ${preview.riskTier}`);
  console.log(`  Chips:`, preview.displayChips);
  console.log();

  // Actual resolution
  const resolution = resolveEncounter({ ...testInput, rng: () => 0.65 });
  console.log('Resolution (with RNG):');
  console.log(`  Roll: ${resolution.roll} vs Target: ${resolution.target}`);
  console.log(`  Outcome: ${resolution.outcome}`);
  console.log();

  // Verify targets match
  if (preview.target !== resolution.target) {
    console.error('ERROR: Preview and resolution targets do not match!');
  } else {
    console.log('OK: Preview and resolution targets match.');
  }
}
