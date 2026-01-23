// lib/ai/encounter-generator.ts
import { generateJSONCompletion } from '@/app/lib/openai'
import { buildEncounterGenerationRequest } from './context-builder'
import { ENCOUNTER_SYSTEM_PROMPT, buildUserPrompt, FEW_SHOT_EXAMPLE } from './prompts'
import { validateEncounter, type ValidatedEncounter } from './validation'
import type { AIGeneratedEncounter, EncounterGenerationRequest } from './types'
import type { EncounterTemplate } from '@/app/data/encounter-templates'

// Generate an encounter from the AI
export async function generateEncounter(
  request: EncounterGenerationRequest
): Promise<AIGeneratedEncounter | null> {
  try {
    console.log('[AI] Generating encounter for:', {
      character: request.character.name,
      action: request.action.name,
      encounterType: request.encounterType,
      difficulty: request.difficulty,
    })

    // Build the prompts
    const systemPrompt = `${ENCOUNTER_SYSTEM_PROMPT}\n\n${FEW_SHOT_EXAMPLE}`
    const userPrompt = buildUserPrompt(request)

    // Call OpenAI
    const response = await generateJSONCompletion(systemPrompt, userPrompt, {
      maxTokens: 2000,
      temperature: 0.8,
    })

    console.log('[AI] Received response, validating...')

    // Validate the response
    const validation = validateEncounter(response)

    if (!validation.success) {
      console.error('[AI] Validation failed:', validation.errors)
      return null
    }

    const encounter = validation.encounter!

    // Convert to AIGeneratedEncounter format
    const aiEncounter: AIGeneratedEncounter = {
      ...encounter,
      isAIGenerated: true,
    }

    console.log('[AI] Successfully generated encounter:', encounter.name)

    return aiEncounter
  } catch (error) {
    console.error('[AI] Error generating encounter:', error)
    return null
  }
}

// Full pipeline: build context and generate encounter
export async function generateEncounterForAction(
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
): Promise<AIGeneratedEncounter | null> {
  try {
    // Build the full request with context
    const request = await buildEncounterGenerationRequest(
      character,
      actionId,
      encounterType,
      difficulty,
      involvedFactions,
      location
    )

    // Generate the encounter
    return await generateEncounter(request)
  } catch (error) {
    console.error('[AI] Error in generateEncounterForAction:', error)
    return null
  }
}

// Convert validated encounter to EncounterTemplate format (for compatibility)
export function toEncounterTemplate(
  encounter: ValidatedEncounter | AIGeneratedEncounter
): EncounterTemplate {
  return {
    id: encounter.id,
    name: encounter.name,
    category: encounter.category,
    difficulty: encounter.difficulty,
    requiredFactions: encounter.requiredFactions,
    requiredLocation: encounter.requiredLocation,
    minPlayerLevel: encounter.minPlayerLevel,
    minNotoriety: encounter.minNotoriety,
    minReputation: encounter.minReputation,
    description: encounter.description,
    flavorText: encounter.flavorText,
    choices: encounter.choices,
    outcomes: encounter.outcomes,
    narrativeTags: encounter.narrativeTags,
    canBeReused: true,
    timesUsed: 0,
  }
}
