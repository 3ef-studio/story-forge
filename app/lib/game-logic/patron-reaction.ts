/**
 * Patron Reaction System
 *
 * Generates short reaction lines from patron deities after encounters resolve.
 * Pure function that returns a deterministic reaction based on encounter context.
 */

import type { DeityId } from '@/app/data/new-origins'

export type PatronReactionInput = {
  patron?: DeityId | null
  outcome?: 'success' | 'failure' | 'partial' | string
  approach?: string
  powerUsedId?: string
  heatDelta?: number
  repDeltas?: Record<string, number>
  districtId?: string
  // Used for deterministic variant selection (e.g., turn number or encounter hash)
  seed?: number
}

// Reaction variants for each patron deity
// Each has 3 success and 3 failure variants for variety
const PATRON_REACTIONS: Record<DeityId, {
  success: string[]
  failure: string[]
  partial: string[]
}> = {
  aurelion: {
    success: [
      'Aurelion approves: your courage kindles hope.',
      'Aurelion smiles: light spreads where you stand.',
      'Aurelion nods: the innocent breathe easier tonight.',
    ],
    failure: [
      'Aurelion warns: protect the innocent, even in defeat.',
      'Aurelion sighs: hope dims, but does not die.',
      'Aurelion counsels: rise again—the city needs your light.',
    ],
    partial: [
      'Aurelion observes: a flicker of hope, not yet a flame.',
      'Aurelion murmurs: progress, but the innocent still wait.',
      'Aurelion notes: light bends, but does not break.',
    ],
  },
  thal_vara: {
    success: [
      'Thal-Vara judges: order held; consequence remains.',
      'Thal-Vara approves: stability endures through your hand.',
      'Thal-Vara intones: the foundation holds firm tonight.',
    ],
    failure: [
      'Thal-Vara condemns: instability invites the storm.',
      'Thal-Vara warns: disorder spreads where structure fails.',
      'Thal-Vara rumbles: rebuild, or the cracks will widen.',
    ],
    partial: [
      'Thal-Vara weighs: balance wavers, but does not fall.',
      'Thal-Vara considers: law bends, but justice persists.',
      'Thal-Vara observes: order strained, not yet broken.',
    ],
  },
  typhos: {
    success: [
      'Typhos exults: the city cracks—again.',
      'Typhos roars: momentum builds, ruin follows.',
      'Typhos laughs: another pillar trembles.',
    ],
    failure: [
      'Typhos snarls: break harder, or be broken.',
      'Typhos growls: stagnation is death—move.',
      'Typhos hisses: weakness invites your own unmaking.',
    ],
    partial: [
      'Typhos grins: a fissure opens—widen it.',
      'Typhos mutters: half measures crack nothing.',
      'Typhos considers: rupture begun, but not yet complete.',
    ],
  },
  nyx_mora: {
    success: [
      'Nyx-Mora whispers: truth bends easily tonight.',
      'Nyx-Mora smirks: shadows deepen where you walk.',
      'Nyx-Mora purrs: certainty crumbles—as it should.',
    ],
    failure: [
      'Nyx-Mora laughs: certainty is your weakest armor.',
      'Nyx-Mora sighs: doubt cuts both ways, doesn\'t it?',
      'Nyx-Mora muses: even shadows stumble in deeper dark.',
    ],
    partial: [
      'Nyx-Mora hums: half-truths serve for now.',
      'Nyx-Mora notes: the veil thins, but does not part.',
      'Nyx-Mora observes: ambiguity preserved—for now.',
    ],
  },
}

/**
 * Simple hash function for deterministic variant selection
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Get a patron reaction line for an encounter outcome.
 *
 * @param input - Context about the encounter and patron
 * @returns A short reaction string, or null if no patron
 */
export function getPatronReaction(input: PatronReactionInput): string | null {
  const { patron, outcome, seed } = input

  // No patron means no reaction
  if (!patron) {
    return null
  }

  // Get reactions for this patron
  const reactions = PATRON_REACTIONS[patron]
  if (!reactions) {
    return null
  }

  // Determine which outcome category to use
  let outcomeKey: 'success' | 'failure' | 'partial'
  if (outcome === 'success') {
    outcomeKey = 'success'
  } else if (outcome === 'failure') {
    outcomeKey = 'failure'
  } else if (outcome === 'partial') {
    outcomeKey = 'partial'
  } else {
    // Default unknown outcomes to partial
    outcomeKey = 'partial'
  }

  const variants = reactions[outcomeKey]
  if (!variants || variants.length === 0) {
    return null
  }

  // Deterministic variant selection using seed
  // If no seed provided, use a hash of the outcome and patron
  const hashInput = seed?.toString() ?? `${patron}-${outcome}-${Date.now()}`
  const variantIndex = simpleHash(hashInput) % variants.length

  return variants[variantIndex]
}

/**
 * Get the icon for a patron deity
 */
export function getPatronIcon(patron: DeityId): string {
  switch (patron) {
    case 'aurelion': return '☀️'
    case 'thal_vara': return '🌊'
    case 'typhos': return '⚡'
    case 'nyx_mora': return '🌙'
    default: return '✨'
  }
}
