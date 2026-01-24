// lib/ai/context-builder.ts
import { prisma } from '@/app/lib/db'
import { getOriginById } from '@/app/data/origins'
import { getPowerById } from '@/app/data/powers'
import { getFactionById, getReputationDescriptor } from '@/app/data/factions'
import { getActionById } from '@/app/data/actions'
import type { CharacterContext, ActionContext, EncounterGenerationRequest, PreviousEncounter } from './types'

// Significant attribute threshold
const SIGNIFICANT_ATTRIBUTE_THRESHOLD = 15

// Build enriched character context for AI prompts
export async function buildCharacterContext(
  character: {
    id: string
    name: string
    level: number
    originId: string
    attributes: { attributeId: string; currentValue: number }[]
    powers: { powerId: string }[]
    factionReputations: { factionId: string; reputation: number }[]
  }
): Promise<CharacterContext> {
  const origin = getOriginById(character.originId)
  if (!origin) {
    throw new Error(`Unknown origin: ${character.originId}`)
  }

  // Build power context
  const powers = character.powers
    .map(p => {
      const power = getPowerById(p.powerId)
      if (!power) return null
      return {
        id: power.id,
        name: power.name,
        narrativeStrengths: power.narrativeStrengths,
        narrativeWeaknesses: power.narrativeWeaknesses,
        visualDescription: power.visualDescription,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  // Build significant attributes (only include notable ones)
  const significantAttributes = character.attributes
    .filter(a => a.currentValue >= SIGNIFICANT_ATTRIBUTE_THRESHOLD)
    .map(a => ({ id: a.attributeId, value: a.currentValue }))

  // Build faction standings with descriptors
  const factionStandings = character.factionReputations
    .map(fr => {
      const faction = getFactionById(fr.factionId)
      if (!faction) return null
      return {
        factionId: fr.factionId,
        factionName: faction.name,
        reputation: fr.reputation,
        descriptor: getReputationDescriptor(faction, fr.reputation),
      }
    })
    .filter((fs): fs is NonNullable<typeof fs> => fs !== null)

  // Get recent story events (top 10 by narrative weight)
  const recentEvents = await prisma.storyEvent.findMany({
    where: { characterId: character.id },
    orderBy: [
      { narrativeWeight: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 10,
    select: {
      summary: true,
      tags: true,
      narrativeWeight: true,
    },
  })

  // Get last 3 encounter events for narrative continuity
  const encounterEvents = await prisma.storyEvent.findMany({
    where: {
      characterId: character.id,
      eventType: { in: ['encounter_success', 'encounter_failure'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      eventType: true,
      summary: true,
      fullDescription: true,
      tags: true,
      createdAt: true,
    },
  })

  // Parse encounter events into PreviousEncounter format
  const previousEncounters: PreviousEncounter[] = encounterEvents.map(event => {
    // Extract info from the full description - format is typically:
    // "Encounter: [name]. Choice: [choice]. Outcome: [description]"
    const fullDesc = event.fullDescription || event.summary

    // Parse encounter name from summary (usually starts with it)
    const nameMatch = event.summary.match(/^([^:]+):/) || event.summary.match(/^(.+?)\./)
    const encounterName = nameMatch ? nameMatch[1].trim() : event.summary.split('.')[0]

    // Extract factions from tags (tags starting with faction_)
    const factionTags = event.tags.filter(t => t.startsWith('faction_'))
      .map(t => t.replace('faction_', ''))

    // Try to extract choice from fullDescription
    // Format: "Choice: [choice text]" or infer from first sentence of description
    const choiceMatch = fullDesc.match(/Choice:\s*([^.]+)/)
    const choiceMade = choiceMatch
      ? choiceMatch[1].trim()
      : (fullDesc.split('.')[0] || 'Unknown approach')

    return {
      name: encounterName,
      description: event.summary,
      choiceMade,
      outcome: fullDesc,
      wasSuccess: event.eventType === 'encounter_success',
      factionsInvolved: factionTags,
      timestamp: event.createdAt,
    }
  })

  return {
    name: character.name,
    level: character.level,
    origin: {
      id: origin.id,
      name: origin.name,
      backstory: origin.backstory,
      narrativeTags: origin.narrativeTags,
      voiceTone: origin.voiceTone,
      uniqueTrait: origin.uniqueTrait,
      nemesisType: origin.nemesisType,
      secretWeakness: origin.secretWeakness,
    },
    powers,
    significantAttributes,
    factionStandings,
    recentStoryEvents: recentEvents,
    previousEncounters,
  }
}

// Build action context for AI prompts
export function buildActionContext(actionId: string): ActionContext {
  const action = getActionById(actionId)
  if (!action) {
    throw new Error(`Unknown action: ${actionId}`)
  }

  return {
    id: action.id,
    name: action.name,
    category: action.category,
    narrativeContext: action.narrativeContext,
    encounterTypes: action.encounterTypes,
    difficultyRange: action.difficultyRange,
    likelyFactions: action.likelyFactions,
    locationTypes: action.locationTypes,
  }
}

// Build full encounter generation request
export async function buildEncounterGenerationRequest(
  character: {
    id: string
    name: string
    level: number
    originId: string
    attributes: { attributeId: string; currentValue: number }[]
    powers: { powerId: string }[]
    factionReputations: { factionId: string; reputation: number }[]
  },
  actionId: string,
  encounterType: string,
  difficulty: number,
  involvedFactions: string[],
  location: string
): Promise<EncounterGenerationRequest> {
  const characterContext = await buildCharacterContext(character)
  const actionContext = buildActionContext(actionId)

  return {
    character: characterContext,
    action: actionContext,
    encounterType,
    difficulty,
    involvedFactions,
    location,
  }
}
