/**
 * Alignment System (MVP)
 *
 * Players with divine origins (Champion, Shard) have an alignment value (0-100).
 * - 70-100: Aligned — small buffs (reduced energy cost, +1 success modifier)
 * - 40-69: Neutral — no change
 * - 20-39: Drifting — minor penalty (+1 energy cost, -1 success modifier)
 * - 0-19: Severed — severe penalty (advanced powers disabled, debuffs)
 *
 * Alignment shifts based on encounter behavior (action tags, outcomes).
 */

import { getDeityById, type DeityId, type Deity } from '@/app/data/new-origins'

export type AlignmentTier = 'aligned' | 'neutral' | 'drifting' | 'severed'

export type AlignmentModifiers = {
  tier: AlignmentTier
  energyCostMod: number // Added to energy cost (negative = discount)
  successMod: number // Added to success rolls
  advancedPowersDisabled: boolean
  description: string
}

export type AlignmentDeltaInput = {
  actionTags: string[]
  outcome: 'success' | 'partial' | 'failure'
  collateral: boolean
  deceptionUsed: boolean
  // Optional additional context
  playerProtectedCivilians?: boolean
  playerActedLawfully?: boolean
}

/**
 * Get the alignment tier from a value
 */
export function getAlignmentTier(value: number | null): AlignmentTier {
  if (value === null) return 'neutral' // Non-divine origins
  if (value >= 70) return 'aligned'
  if (value >= 40) return 'neutral'
  if (value >= 20) return 'drifting'
  return 'severed'
}

/**
 * Get the modifiers applied based on alignment tier
 */
export function getAlignmentModifiers(value: number | null): AlignmentModifiers {
  const tier = getAlignmentTier(value)

  switch (tier) {
    case 'aligned':
      return {
        tier,
        energyCostMod: -1, // 1 less energy per action
        successMod: 1, // +1 to success rolls
        advancedPowersDisabled: false,
        description: 'Your patron\'s power flows through you freely.',
      }
    case 'neutral':
      return {
        tier,
        energyCostMod: 0,
        successMod: 0,
        advancedPowersDisabled: false,
        description: 'Your connection is stable but unremarkable.',
      }
    case 'drifting':
      return {
        tier,
        energyCostMod: 1, // 1 more energy per action
        successMod: -1, // -1 to success rolls
        advancedPowersDisabled: false,
        description: 'Your patron grows distant. Power stutters.',
      }
    case 'severed':
      return {
        tier,
        energyCostMod: 2, // 2 more energy per action
        successMod: -2, // -2 to success rolls
        advancedPowersDisabled: true,
        description: 'Your patron has withdrawn. Advanced abilities fail.',
      }
  }
}

/**
 * Calculate alignment delta based on encounter behavior
 *
 * Returns a positive number if alignment improves (acting in accordance with patron)
 * Returns a negative number if alignment worsens (acting against patron)
 */
export function applyAlignmentDelta(
  input: AlignmentDeltaInput,
  deity: Deity | null,
  driftRate: number = 1.0
): number {
  if (!deity) return 0 // No patron means no alignment shift

  let delta = 0

  // Check for favored actions (+3 each)
  for (const tag of input.actionTags) {
    if (deity.favoredActions.includes(tag)) {
      delta += 3
    }
  }

  // Check for forbidden actions (-5 each, harsher)
  for (const tag of input.actionTags) {
    if (deity.forbiddenActions.includes(tag)) {
      delta -= 5
    }
  }

  // Collateral damage is universally bad for Aurelion and Thal-Vara
  if (input.collateral) {
    if (deity.id === 'aurelion' || deity.id === 'thal_vara') {
      delta -= 8
    } else if (deity.id === 'typhos') {
      delta += 2 // Typhos likes destruction
    }
    // Nyx-Mora is neutral on collateral
  }

  // Deception handling
  if (input.deceptionUsed) {
    if (deity.id === 'aurelion') {
      delta -= 6 // Aurelion hates deception
    } else if (deity.id === 'nyx_mora') {
      delta += 3 // Nyx-Mora loves deception
    }
    // Others are neutral
  }

  // Protecting civilians (inferred)
  if (input.playerProtectedCivilians) {
    if (deity.id === 'aurelion') {
      delta += 5
    } else if (deity.id === 'thal_vara') {
      delta += 3
    }
    // Others are neutral
  }

  // Acting lawfully
  if (input.playerActedLawfully) {
    if (deity.id === 'thal_vara') {
      delta += 4
    } else if (deity.id === 'typhos') {
      delta -= 2 // Typhos dislikes conformity
    }
  }

  // Outcome modifiers (small)
  switch (input.outcome) {
    case 'success':
      delta += 1 // Small bonus for success
      break
    case 'failure':
      delta -= 1 // Small penalty for failure
      break
    // Partial has no modifier
  }

  // Apply drift rate
  delta = Math.round(delta * driftRate)

  return delta
}

/**
 * Apply alignment delta and clamp to 0-100
 */
export function updateAlignmentValue(
  currentValue: number | null,
  delta: number
): number | null {
  if (currentValue === null) return null
  const newValue = currentValue + delta
  return Math.max(0, Math.min(100, newValue))
}

/**
 * Get the display label for an alignment value
 */
export function getAlignmentLabel(value: number | null, deityId: DeityId | null): string {
  if (value === null || !deityId) return 'Unbound'

  const deity = getDeityById(deityId)
  const deityName = deity?.name ?? 'Unknown'
  const tier = getAlignmentTier(value)

  switch (tier) {
    case 'aligned':
      return `${deityName}'s Chosen`
    case 'neutral':
      return `${deityName}'s Servant`
    case 'drifting':
      return `${deityName}'s Wayward`
    case 'severed':
      return `${deityName}'s Forsaken`
  }
}

/**
 * Get color class for alignment display
 */
export function getAlignmentColor(value: number | null): string {
  const tier = getAlignmentTier(value)
  switch (tier) {
    case 'aligned':
      return 'text-green-400'
    case 'neutral':
      return 'text-blue-400'
    case 'drifting':
      return 'text-yellow-400'
    case 'severed':
      return 'text-red-400'
  }
}

/**
 * Get background color class for alignment display
 */
export function getAlignmentBgColor(value: number | null): string {
  const tier = getAlignmentTier(value)
  switch (tier) {
    case 'aligned':
      return 'bg-green-500/20 border-green-500/30'
    case 'neutral':
      return 'bg-blue-500/20 border-blue-500/30'
    case 'drifting':
      return 'bg-yellow-500/20 border-yellow-500/30'
    case 'severed':
      return 'bg-red-500/20 border-red-500/30'
  }
}

/**
 * Infer action tags from encounter/choice context
 * Used when explicit tags aren't available
 */
export function inferActionTags(context: {
  choiceText?: string
  approachType?: string
  powerUsed?: string
  factionChanges?: Record<string, number>
}): string[] {
  const tags: string[] = []

  // Infer from choice text keywords
  const text = context.choiceText?.toLowerCase() ?? ''

  if (text.includes('protect') || text.includes('defend') || text.includes('save')) {
    tags.push('protect_civilians')
  }
  if (text.includes('lie') || text.includes('deceive') || text.includes('trick') || text.includes('bluff')) {
    tags.push('deception')
  }
  if (text.includes('arrest') || text.includes('law') || text.includes('police') || text.includes('legal')) {
    tags.push('lawful')
  }
  if (text.includes('destroy') || text.includes('smash') || text.includes('break') || text.includes('rampage')) {
    tags.push('property_destruction')
  }
  if (text.includes('intimidate') || text.includes('threaten') || text.includes('fear')) {
    tags.push('intimidation')
  }
  if (text.includes('negotiate') || text.includes('talk') || text.includes('calm') || text.includes('peace')) {
    tags.push('de_escalation')
  }
  if (text.includes('stealth') || text.includes('sneak') || text.includes('hide') || text.includes('shadow')) {
    tags.push('stealth')
  }
  if (text.includes('hero') || text.includes('sacrifice') || text.includes('brave')) {
    tags.push('heroic')
  }
  if (text.includes('truth') || text.includes('honest') || text.includes('reveal')) {
    tags.push('truth_telling')
  }

  // Infer from approach type
  if (context.approachType === 'aggressive') {
    tags.push('direct_confrontation')
  }
  if (context.approachType === 'diplomatic') {
    tags.push('diplomatic')
  }
  if (context.approachType === 'stealth') {
    tags.push('stealth')
  }

  return tags
}
