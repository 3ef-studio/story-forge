/**
 * Combat Resolution Types
 * Lightweight, deterministic encounter resolution system
 */

// Outcome types - success, partial (near miss), or failure
export type Outcome = 'success' | 'partial' | 'failure';

// A single modifier that contributed to the resolution
export type Modifier = {
  label: string;
  value: number; // Negative = easier (lowers target), Positive = harder (raises target)
};

// The complete breakdown of how the resolution was calculated
export type ResolutionBreakdown = {
  roll: number;           // The RNG roll (1-100)
  target: number;         // The final target number to beat
  baseTarget: number;     // The starting target before modifiers
  modifiers: Modifier[];  // All modifiers that affected the target
  outcome: Outcome;       // The final result
  summary: string;        // Human-readable explanation
};

// Approach types for encounter choices
export type Approach = 'direct' | 'subtle' | 'tactical' | 'diplomatic';

// Input for the resolver function (without RNG for shared use)
export type ResolutionInput = {
  difficulty: number;                    // Encounter difficulty 1-10
  approach: Approach;                    // From chosen option
  attributes: Record<string, number>;    // Character attributes map
  powerIds: string[];                    // Character's power IDs
  repByFaction: Record<string, number>;  // Faction reputation map
  encounterTags?: string[];              // Encounter seed tags (may include faction ids)
  involvedFactions?: string[];           // Explicitly involved factions
};

// Input for the resolver function (with optional RNG)
export type ResolveEncounterInput = ResolutionInput & {
  rng?: () => number;                    // Optional RNG for testing (0-1)
  powerLevelBonus?: number;              // Optional bonus from power level (negative = easier)
  powerLevelLabel?: string;              // Optional label for power level modifier
  npcInfluenceBonus?: number;            // Optional bonus from NPC disposition/familiarity
  npcInfluenceLabel?: string;            // Label for NPC influence modifier
};

// Risk tier for previews
export type RiskTier = 'great' | 'good' | 'risky' | 'dangerous';

// Display chip for UI
export type DisplayChip = {
  label: string;
  value?: number;
  type: 'attribute' | 'synergy' | 'reputation';
};

// Preview result (no RNG, no outcome)
export type ResolutionPreview = {
  target: number;
  baseTarget: number;
  modifiers: Modifier[];
  estimatedChance: number;         // 0-100 percent chance of success
  riskTier: RiskTier;
  displayChips: DisplayChip[];     // Formatted chips for UI
  matchedPowers: string[];         // Powers that contributed to synergy
  attributePair: [string, string]; // The two attributes used for this approach
};

// =============================================================================
// PREP PHASE TYPES
// =============================================================================

// Prep action types
export type PrepActionId = 'momentum' | 'intel' | 'power';

// Prep selection (what the player chose)
export type PrepSelection =
  | { type: 'momentum' }
  | { type: 'intel' }
  | { type: 'power'; powerId: string };

// Prep applied result (returned from server)
export type PrepApplied = {
  type: PrepActionId;
  combatBonus: number;
  energyCost: number;
  powerId?: string;
  powerName?: string;
};

// Combat breakdown for outcome display
export type CombatBreakdown = {
  baseCombat: number;
  prepBonus: number;
  powerBonus: number;
  totalTarget: number;
};
