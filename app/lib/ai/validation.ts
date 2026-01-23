// lib/ai/validation.ts
import { z } from 'zod'
import { factions } from '@/app/data/factions'

// Valid faction IDs from the factions data
const VALID_FACTION_IDS = factions.map(f => f.id)

// Valid attribute IDs
const VALID_ATTRIBUTE_IDS = [
  'strength', 'agility', 'endurance', 'intelligence',
  'perception', 'willpower', 'charisma', 'stealth',
  'reputation', 'notoriety'
]

// Zod schema for required attribute
const requiredAttributeSchema = z.object({
  attributeId: z.string().refine(
    val => VALID_ATTRIBUTE_IDS.includes(val),
    { message: 'Invalid attribute ID' }
  ),
  minValue: z.number().int().min(1).max(100),
})

// Zod schema for faction change
const factionChangeSchema = z.object({
  factionId: z.string().refine(
    val => VALID_FACTION_IDS.includes(val),
    { message: 'Invalid faction ID' }
  ),
  change: z.number().int().min(-50).max(50),
})

// Zod schema for attribute growth
const attributeGrowthSchema = z.object({
  attributeId: z.string().refine(
    val => VALID_ATTRIBUTE_IDS.includes(val),
    { message: 'Invalid attribute ID' }
  ),
  amount: z.number().int().min(1).max(5),
})

// Zod schema for choice
const choiceSchema = z.object({
  id: z.string().min(1).max(50),
  text: z.string().min(1).max(500),
  requiredPowers: z.array(z.string()).optional(),
  requiredAttributes: z.array(requiredAttributeSchema).optional(),
  narrativeDescription: z.string().min(1).max(500),
})

// Zod schema for success result
const successResultSchema = z.object({
  description: z.string().min(1).max(2000),
  xpGain: z.number().int().min(0).max(100),
  factionChanges: z.array(factionChangeSchema),
  attributeGrowth: z.array(attributeGrowthSchema).optional(),
  itemsGained: z.array(z.string()).optional(),
})

// Zod schema for failure result
const failureResultSchema = z.object({
  description: z.string().min(1).max(2000),
  xpGain: z.number().int().min(0).max(50),
  factionChanges: z.array(factionChangeSchema),
  hpLoss: z.number().int().min(0).max(100).optional(),
  itemsLost: z.array(z.string()).optional(),
})

// Zod schema for outcome
const outcomeSchema = z.object({
  choiceId: z.string().min(1).max(50),
  successChance: z.number().min(0).max(1),
  successResult: successResultSchema,
  failureResult: failureResultSchema,
})

// Full encounter schema
export const encounterSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  difficulty: z.number().int().min(1).max(10),
  requiredFactions: z.array(z.string()).optional(),
  requiredLocation: z.array(z.string()).optional(),
  minPlayerLevel: z.number().int().optional(),
  minNotoriety: z.number().int().optional(),
  minReputation: z.number().int().optional(),
  description: z.string().min(1).max(3000),
  flavorText: z.string().max(1000).optional(),
  choices: z.array(choiceSchema).min(2).max(6),
  outcomes: z.array(outcomeSchema).min(2).max(6),
  narrativeTags: z.array(z.string()).min(1).max(20),
})

export type ValidatedEncounter = z.infer<typeof encounterSchema>

// Validate that all choice IDs have matching outcome entries
function validateChoiceOutcomeMatching(encounter: ValidatedEncounter): string[] {
  const errors: string[] = []
  const choiceIds = new Set(encounter.choices.map(c => c.id))
  const outcomeChoiceIds = new Set(encounter.outcomes.map(o => o.choiceId))

  // Check all choices have outcomes
  for (const choiceId of choiceIds) {
    if (!outcomeChoiceIds.has(choiceId)) {
      errors.push(`Choice "${choiceId}" has no matching outcome`)
    }
  }

  // Check all outcomes have matching choices
  for (const outcomeChoiceId of outcomeChoiceIds) {
    if (!choiceIds.has(outcomeChoiceId)) {
      errors.push(`Outcome references unknown choice "${outcomeChoiceId}"`)
    }
  }

  return errors
}

// Sanitize text to prevent prompt injection
function sanitizeText(text: string): string {
  // Remove any potential control characters or injection attempts
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim()
}

// Sanitize entire encounter object
function sanitizeEncounter(encounter: ValidatedEncounter): ValidatedEncounter {
  return {
    ...encounter,
    id: sanitizeText(encounter.id),
    name: sanitizeText(encounter.name),
    category: sanitizeText(encounter.category),
    description: sanitizeText(encounter.description),
    flavorText: encounter.flavorText ? sanitizeText(encounter.flavorText) : undefined,
    choices: encounter.choices.map(c => ({
      ...c,
      id: sanitizeText(c.id),
      text: sanitizeText(c.text),
      narrativeDescription: sanitizeText(c.narrativeDescription),
    })),
    outcomes: encounter.outcomes.map(o => ({
      ...o,
      choiceId: sanitizeText(o.choiceId),
      successResult: {
        ...o.successResult,
        description: sanitizeText(o.successResult.description),
      },
      failureResult: {
        ...o.failureResult,
        description: sanitizeText(o.failureResult.description),
      },
    })),
    narrativeTags: encounter.narrativeTags.map(sanitizeText),
    requiredFactions: encounter.requiredFactions?.map(sanitizeText),
  }
}

// Main validation function
export function validateEncounter(jsonString: string): {
  success: boolean
  encounter?: ValidatedEncounter
  errors?: string[]
} {
  try {
    const parsed = JSON.parse(jsonString)
    const result = encounterSchema.safeParse(parsed)

    if (!result.success) {
      return {
        success: false,
        errors: result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
      }
    }

    // Additional validation
    const matchingErrors = validateChoiceOutcomeMatching(result.data)
    if (matchingErrors.length > 0) {
      return {
        success: false,
        errors: matchingErrors,
      }
    }

    // Sanitize and return
    const sanitized = sanitizeEncounter(result.data)

    return {
      success: true,
      encounter: sanitized,
    }
  } catch (error) {
    return {
      success: false,
      errors: [`JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`],
    }
  }
}

// Validate faction IDs in an array
export function validateFactionIds(factionIds: string[]): string[] {
  return factionIds.filter(id => VALID_FACTION_IDS.includes(id))
}
