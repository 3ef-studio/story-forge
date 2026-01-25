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
} from './types';

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

  return {
    target: math.target,
    baseTarget: math.baseTarget,
    modifiers: math.modifiers,
    estimatedChance,
    riskTier,
    displayChips,
    matchedPowers: math.powerResult.matchedPowers,
    attributePair: APPROACH_ATTRIBUTES[input.approach],
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
  const { rng = Math.random, ...resolutionInput } = input;

  // Use shared math computation
  const math = computeResolutionMath(resolutionInput);

  // Roll the dice (1-100)
  const roll = Math.floor(rng() * 100) + 1;

  // Determine outcome
  let outcome: Outcome;
  if (roll >= math.target) {
    outcome = 'success';
  } else if (roll >= math.target - 12) {
    outcome = 'partial';
  } else {
    outcome = 'failure';
  }

  // Generate summary
  const summary = generateSummary(input.approach, outcome);

  return {
    roll,
    target: math.target,
    baseTarget: math.baseTarget,
    modifiers: math.modifiers,
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
