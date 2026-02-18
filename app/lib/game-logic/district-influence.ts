/**
 * District Ideological Influence System (MVP)
 *
 * Each district has 4 ideological meters: radiance, stability, entropy, doubt (0-100 each)
 * These shift based on:
 * - Player's origin influence bias
 * - Player's deity (if any)
 * - Action tags from encounter outcomes
 *
 * The dominant ideology affects available encounters, NPC dispositions, and narrative flavor.
 */

import { prisma } from '@/app/lib/db'
import type { Ideology, DeityId, Origin } from '@/app/data/new-origins'
import { getDeityById, getOriginById, getInfluenceBias } from '@/app/data/new-origins'

export type DistrictInfluence = {
  radiance: number
  stability: number
  entropy: number
  doubt: number
}

export type InfluenceDelta = Partial<Record<Ideology, number>>

export type InfluenceContext = {
  actionTags: string[]
  outcome: 'success' | 'partial' | 'failure'
  collateral: boolean
  deceptionUsed: boolean
  protectedCivilians?: boolean
  actedLawfully?: boolean
  originId?: string
  deityId?: DeityId | null
}

/**
 * Compute influence delta from encounter context
 */
export function computeInfluenceDelta(context: InfluenceContext): InfluenceDelta {
  const delta: InfluenceDelta = {
    radiance: 0,
    stability: 0,
    entropy: 0,
    doubt: 0,
  }

  // Base from action tags
  for (const tag of context.actionTags) {
    switch (tag) {
      // Radiance tags
      case 'protect_civilians':
      case 'heroic':
      case 'self_sacrifice':
      case 'truth_telling':
        delta.radiance = (delta.radiance ?? 0) + 2
        break

      // Stability tags
      case 'lawful':
      case 'procedural':
      case 'diplomatic':
      case 'de_escalation':
      case 'institution_support':
        delta.stability = (delta.stability ?? 0) + 2
        break

      // Entropy tags
      case 'collateral_damage':
      case 'property_destruction':
      case 'intimidation':
      case 'revolution':
      case 'chaos':
      case 'reckless':
        delta.entropy = (delta.entropy ?? 0) + 2
        break

      // Doubt tags
      case 'deception':
      case 'manipulation':
      case 'stealth':
      case 'blackmail':
      case 'information_gathering':
        delta.doubt = (delta.doubt ?? 0) + 2
        break
    }
  }

  // Collateral damage effect
  if (context.collateral) {
    delta.entropy = (delta.entropy ?? 0) + 3
    delta.stability = (delta.stability ?? 0) - 2
    delta.radiance = (delta.radiance ?? 0) - 1
  }

  // Deception effect
  if (context.deceptionUsed) {
    delta.doubt = (delta.doubt ?? 0) + 2
    delta.radiance = (delta.radiance ?? 0) - 1
  }

  // Civilian protection
  if (context.protectedCivilians) {
    delta.radiance = (delta.radiance ?? 0) + 3
  }

  // Lawful resolution
  if (context.actedLawfully) {
    delta.stability = (delta.stability ?? 0) + 2
  }

  // Origin influence bias
  if (context.originId) {
    const origin = getOriginById(context.originId)
    if (origin) {
      const bias = getInfluenceBias(origin, context.deityId ?? null)
      for (const [ideology, amount] of Object.entries(bias)) {
        delta[ideology as Ideology] = (delta[ideology as Ideology] ?? 0) + (amount ?? 0)
      }
    }
  }

  // Deity influence (small bonus to deity's ideology)
  if (context.deityId) {
    const deity = getDeityById(context.deityId)
    if (deity) {
      delta[deity.ideology] = (delta[deity.ideology] ?? 0) + 1
    }
  }

  // Outcome modifiers
  if (context.outcome === 'success') {
    // Success amplifies all deltas slightly
    for (const key of Object.keys(delta) as Ideology[]) {
      if (delta[key] && delta[key]! > 0) {
        delta[key] = Math.round(delta[key]! * 1.2)
      }
    }
  } else if (context.outcome === 'failure') {
    // Failure increases entropy
    delta.entropy = (delta.entropy ?? 0) + 1
  }

  return delta
}

/**
 * Apply influence delta to a district and clamp values
 */
export function applyInfluenceDelta(
  current: DistrictInfluence,
  delta: InfluenceDelta
): DistrictInfluence {
  return {
    radiance: Math.max(0, Math.min(100, current.radiance + (delta.radiance ?? 0))),
    stability: Math.max(0, Math.min(100, current.stability + (delta.stability ?? 0))),
    entropy: Math.max(0, Math.min(100, current.entropy + (delta.entropy ?? 0))),
    doubt: Math.max(0, Math.min(100, current.doubt + (delta.doubt ?? 0))),
  }
}

/**
 * Get the dominant ideology in a district
 */
export function getDominantIdeology(influence: DistrictInfluence): Ideology | null {
  const entries: [Ideology, number][] = [
    ['radiance', influence.radiance],
    ['stability', influence.stability],
    ['entropy', influence.entropy],
    ['doubt', influence.doubt],
  ]

  // Sort by value descending
  entries.sort((a, b) => b[1] - a[1])

  // Must have at least 30 to be considered dominant
  if (entries[0][1] >= 30) {
    // Must lead by at least 10 to be clearly dominant
    if (entries[0][1] - entries[1][1] >= 10) {
      return entries[0][0]
    }
  }

  return null // No clear dominant ideology
}

/**
 * Apply district influence update in the database
 */
export async function applyDistrictInfluence(
  characterId: string,
  districtId: string,
  context: InfluenceContext
): Promise<{
  delta: InfluenceDelta
  newInfluence: DistrictInfluence
  dominantIdeology: Ideology | null
}> {
  // Get current district state
  let districtState = await prisma.districtState.findUnique({
    where: {
      characterId_districtId: {
        characterId,
        districtId,
      },
    },
  })

  // Create if not exists (with safe defaults)
  if (!districtState) {
    districtState = await prisma.districtState.create({
      data: {
        characterId,
        districtId,
        controlValue: 50,
        instability: 0,
        influenceRadiance: 25,
        influenceStability: 25,
        influenceEntropy: 25,
        influenceDoubt: 25,
      },
    })
  }

  const currentInfluence: DistrictInfluence = {
    radiance: districtState.influenceRadiance,
    stability: districtState.influenceStability,
    entropy: districtState.influenceEntropy,
    doubt: districtState.influenceDoubt,
  }

  // Compute and apply delta
  const delta = computeInfluenceDelta(context)
  const newInfluence = applyInfluenceDelta(currentInfluence, delta)

  // Update database
  await prisma.districtState.update({
    where: {
      characterId_districtId: {
        characterId,
        districtId,
      },
    },
    data: {
      influenceRadiance: newInfluence.radiance,
      influenceStability: newInfluence.stability,
      influenceEntropy: newInfluence.entropy,
      influenceDoubt: newInfluence.doubt,
    },
  })

  const dominantIdeology = getDominantIdeology(newInfluence)

  return { delta, newInfluence, dominantIdeology }
}

/**
 * Get district influence for display
 */
export async function getDistrictInfluence(
  characterId: string,
  districtId: string
): Promise<DistrictInfluence> {
  const districtState = await prisma.districtState.findUnique({
    where: {
      characterId_districtId: {
        characterId,
        districtId,
      },
    },
  })

  if (!districtState) {
    // Safe default for new districts
    return {
      radiance: 25,
      stability: 25,
      entropy: 25,
      doubt: 25,
    }
  }

  return {
    radiance: districtState.influenceRadiance,
    stability: districtState.influenceStability,
    entropy: districtState.influenceEntropy,
    doubt: districtState.influenceDoubt,
  }
}

/**
 * Get ideology display info
 */
export function getIdeologyInfo(ideology: Ideology): {
  name: string
  color: string
  bgColor: string
  icon: string
  description: string
} {
  switch (ideology) {
    case 'radiance':
      return {
        name: 'Radiance',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20 border-yellow-500/30',
        icon: '☀️',
        description: 'Truth, protection, heroism',
      }
    case 'stability':
      return {
        name: 'Stability',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20 border-blue-500/30',
        icon: '🏛️',
        description: 'Order, law, structure',
      }
    case 'entropy':
      return {
        name: 'Entropy',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20 border-red-500/30',
        icon: '🔥',
        description: 'Chaos, destruction, change',
      }
    case 'doubt':
      return {
        name: 'Doubt',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20 border-purple-500/30',
        icon: '👁️',
        description: 'Secrets, manipulation, knowledge',
      }
  }
}
