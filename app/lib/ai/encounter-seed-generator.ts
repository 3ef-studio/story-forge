// lib/ai/encounter-seed-generator.ts
// Generates cacheable encounter seeds - NO player-specific data

import { z } from 'zod'
import { generateJSONCompletion } from '@/app/lib/openai'
import { SEED_SYSTEM_PROMPT, buildSeedPrompt, SEED_FEW_SHOT_EXAMPLE } from './seed-prompts'
import type { EncounterSeed, SeedGenerationInput, SeedChoice, SeedOutcome, PlayerIntentContext } from './types'
import { factions } from '@/app/data/factions'

const VALID_FACTION_IDS = factions.map(f => f.id)
const VALID_ATTRIBUTE_IDS = [
  'strength', 'agility', 'endurance', 'intelligence',
  'perception', 'willpower', 'charisma', 'stealth',
  'reputation', 'notoriety'
]
const VALID_APPROACHES = ['direct', 'subtle', 'diplomatic', 'tactical'] as const
const VALID_TONES = ['aggressive', 'cautious', 'clever', 'desperate', 'controlled', 'risky'] as const
const VALID_OPENING_STYLES = ['sensory', 'dialogue', 'action', 'discovery', 'aftermath'] as const
const VALID_STAKE_TYPES = ['time_pressure', 'moral_dilemma', 'reputation_risk', 'collateral_risk', 'unknown_threat'] as const

// Zod schema for seed choice
const seedChoiceSchema = z.object({
  id: z.enum(['choice_1', 'choice_2', 'choice_3', 'choice_4']),
  genericLabel: z.string().min(1).max(100),
  approach: z.enum(VALID_APPROACHES),
  tone: z.enum(VALID_TONES).optional(),
  requiredAttributes: z.array(z.object({
    attributeId: z.string().refine(val => VALID_ATTRIBUTE_IDS.includes(val)),
    minValue: z.number().int().min(1).max(100),
  })).optional(),
  requiredPowers: z.array(z.string()).optional(),
})

// Zod schema for seed outcome
const seedOutcomeSchema = z.object({
  choiceId: z.enum(['choice_1', 'choice_2', 'choice_3', 'choice_4']),
  successChance: z.number().min(0.1).max(0.95),
  successResult: z.object({
    description: z.string().min(1).max(500),
    xpGain: z.number().int().min(10).max(100),
    factionChanges: z.array(z.object({
      factionId: z.string().refine(val => VALID_FACTION_IDS.includes(val)),
      change: z.number().int().min(-50).max(50),
    })),
    attributeGrowth: z.array(z.object({
      attributeId: z.string().refine(val => VALID_ATTRIBUTE_IDS.includes(val)),
      amount: z.number().int().min(1).max(3),
    })).optional(),
  }),
  failureResult: z.object({
    description: z.string().min(1).max(500),
    xpGain: z.number().int().min(5).max(50),
    factionChanges: z.array(z.object({
      factionId: z.string().refine(val => VALID_FACTION_IDS.includes(val)),
      change: z.number().int().min(-50).max(50),
    })),
    hpLoss: z.number().int().min(0).max(50).optional(),
  }),
})

// Full seed schema
const seedSchema = z.object({
  title: z.string().min(1).max(100),
  situationSummary: z.string().min(10).max(300),
  openingStyle: z.enum(VALID_OPENING_STYLES).optional(),
  stakeType: z.enum(VALID_STAKE_TYPES).optional(),
  seedHooks: z.array(z.string().max(60)).max(2).optional(),
  choices: z.array(seedChoiceSchema).length(4),
  outcomes: z.array(seedOutcomeSchema).length(4),
  tags: z.array(z.string()).min(1).max(10),
})

type RawSeedResponse = z.infer<typeof seedSchema>

// Validate seed has exactly 4 choices with different approaches
function validateSeedStructure(seed: RawSeedResponse): string[] {
  const errors: string[] = []

  // Check all 4 approach types are present
  const approaches = new Set(seed.choices.map(c => c.approach))
  for (const approach of VALID_APPROACHES) {
    if (!approaches.has(approach)) {
      errors.push(`Missing ${approach} approach choice`)
    }
  }

  // Check choice IDs are correct
  const expectedIds = ['choice_1', 'choice_2', 'choice_3', 'choice_4']
  const choiceIds = seed.choices.map(c => c.id).sort()
  if (JSON.stringify(choiceIds) !== JSON.stringify(expectedIds)) {
    errors.push('Choice IDs must be choice_1, choice_2, choice_3, choice_4')
  }

  // Check all choices have outcomes
  const outcomeChoiceIds = new Set(seed.outcomes.map(o => o.choiceId))
  for (const choiceId of expectedIds) {
    if (!outcomeChoiceIds.has(choiceId as 'choice_1' | 'choice_2' | 'choice_3' | 'choice_4')) {
      errors.push(`Missing outcome for ${choiceId}`)
    }
  }

  // Check for personalization language (should not be present)
  const allText = [
    seed.title,
    seed.situationSummary,
    ...seed.choices.map(c => c.genericLabel),
    ...seed.outcomes.flatMap(o => [o.successResult.description, o.failureResult.description]),
  ].join(' ').toLowerCase()

  const personalizedTerms = [ 'since last', 'as always', 'remember when']
  for (const term of personalizedTerms) {
    if (allText.includes(term)) {
      errors.push(`Contains personalization language: "${term}"`)
    }
  }

  return errors
}

// Sanitize text
function sanitizeText(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

// Generate a seed from AI
export async function generateSeed(input: SeedGenerationInput): Promise<EncounterSeed | null> {
  try {
    console.log('[Seed] Generating seed for:', {
      encounterType: input.encounterType,
      difficulty: input.difficulty,
      location: input.location,
      factions: input.involvedFactions,
    })

    const systemPrompt = `${SEED_SYSTEM_PROMPT}\n\n${SEED_FEW_SHOT_EXAMPLE}`
    const userPrompt = buildSeedPrompt(input)

    // Call OpenAI with lower token limit for seeds
    const response = await generateJSONCompletion(systemPrompt, userPrompt, {
      maxTokens: 1500,
      temperature: 0.7,
    })

    // Parse and validate
    let parsed: unknown
    try {
      parsed = JSON.parse(response)
    } catch {
      console.error('[Seed] JSON parse error')
      return null
    }

    const schemaResult = seedSchema.safeParse(parsed)
    if (!schemaResult.success) {
      console.error('[Seed] Schema validation failed:', schemaResult.error.issues)
      return null
    }

    const rawSeed = schemaResult.data

    // Validate structure
    const structureErrors = validateSeedStructure(rawSeed)
    if (structureErrors.length > 0) {
      console.error('[Seed] Structure validation failed:', structureErrors)
      return null
    }

    // Convert to EncounterSeed format
    const seed: EncounterSeed = {
      seedId: '', // Will be assigned after caching
      title: sanitizeText(rawSeed.title),
      situationSummary: sanitizeText(rawSeed.situationSummary),
      openingStyle: rawSeed.openingStyle,
      stakeType: rawSeed.stakeType,
      seedHooks: rawSeed.seedHooks?.map(sanitizeText),
      category: input.encounterType,
      difficulty: input.difficulty,
      choices: rawSeed.choices.map(c => ({
        id: c.id,
        genericLabel: sanitizeText(c.genericLabel),
        approach: c.approach,
        tone: c.tone,
        requiredAttributes: c.requiredAttributes,
        requiredPowers: c.requiredPowers,
      })) as [SeedChoice, SeedChoice, SeedChoice, SeedChoice],
      outcomes: rawSeed.outcomes.map(o => ({
        choiceId: o.choiceId,
        successChance: o.successChance,
        successResult: {
          description: sanitizeText(o.successResult.description),
          xpGain: o.successResult.xpGain,
          factionChanges: o.successResult.factionChanges,
          attributeGrowth: o.successResult.attributeGrowth,
        },
        failureResult: {
          description: sanitizeText(o.failureResult.description),
          xpGain: o.failureResult.xpGain,
          factionChanges: o.failureResult.factionChanges,
          hpLoss: o.failureResult.hpLoss,
        },
      })),
      tags: rawSeed.tags.map(sanitizeText),
      involvedFactions: input.involvedFactions,
      location: input.location,
    }

    console.log('[Seed] Successfully generated seed:', seed.title)
    return seed
  } catch (error) {
    console.error('[Seed] Error generating seed:', error)
    return null
  }
}

// Build SeedGenerationInput from action execution context
export function buildSeedInput(
  actionId: string,
  actionCategory: string,
  encounterType: string,
  difficulty: number,
  location: string,
  involvedFactions: string[],
  moralIntent: 'heroic' | 'neutral' | 'villainous' = 'neutral',
  playerIntentContext?: PlayerIntentContext
): SeedGenerationInput {
  const difficultyBucket = difficulty <= 3 ? 'easy' : difficulty <= 6 ? 'medium' : 'hard'

  return {
    actionId,
    actionCategory,
    moralIntent,
    encounterType,
    difficulty,
    difficultyBucket,
    location,
    involvedFactions: [...involvedFactions].sort(), // Sort for deterministic cache key
    playerIntentContext,
  }
}
