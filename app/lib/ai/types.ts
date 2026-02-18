// lib/ai/types.ts
import type { Origin } from '@/app/data/new-origins'
import type { Power } from '@/app/data/powers'
import type { Faction } from '@/app/data/factions'
import type { Action } from '@/app/data/actions'
import type { EncounterTemplate } from '@/app/data/encounter-templates'

// Previous encounter summary for narrative continuity
export type PreviousEncounter = {
  name: string
  description: string
  choiceMade: string
  outcome: string
  wasSuccess: boolean
  factionsInvolved: string[]
  timestamp: Date
}

// Character context for AI prompts
export type CharacterContext = {
  name: string
  level: number
  origin: {
    id: string
    name: string
    backstory: string
    narrativeTags: string[]
    voiceTone: string
    uniqueTrait: Origin['uniqueTrait']
    nemesisType?: string
    secretWeakness?: string
  }
  powers: {
    id: string
    name: string
    narrativeStrengths: string[]
    narrativeWeaknesses: string[]
    visualDescription: string
  }[]
  significantAttributes: {
    id: string
    value: number
  }[]
  factionStandings: {
    factionId: string
    factionName: string
    reputation: number
    descriptor: string
  }[]
  recentStoryEvents: {
    summary: string
    tags: string[]
    narrativeWeight: number
  }[]
  previousEncounters: PreviousEncounter[]
}

// Action context for AI prompts
export type ActionContext = {
  id: string
  name: string
  category: string
  narrativeContext: string
  encounterTypes: string[]
  difficultyRange: [number, number]
  likelyFactions: string[]
  locationTypes: string[]
}

// Full encounter generation request
export type EncounterGenerationRequest = {
  character: CharacterContext
  action: ActionContext
  encounterType: string
  difficulty: number
  involvedFactions: string[]
  location: string
}

// AI-generated encounter (matches EncounterTemplate structure)
export type AIGeneratedEncounter = Omit<EncounterTemplate, 'timesUsed' | 'canBeReused'> & {
  isAIGenerated: true
}

// Cached encounter from database (JSON fields parsed)
export type CachedEncounterData = {
  id: string
  encounterType: string
  difficulty: number
  factionContext: string[]
  locationType: string | null
  description: string
  choices: EncounterTemplate['choices']
  outcomes: EncounterTemplate['outcomes']
  timesUsed: number
  createdAt: Date
  lastUsedAt: Date | null
}

// ============================================
// SEED + PERSONALIZER ARCHITECTURE (V1)
// ============================================

// Player intent context for narrative framing
export type PlayerIntentContext = {
  intentScore: number
  intentBand: 'villain' | 'criminal' | 'neutral' | 'vigilante' | 'hero'
  playerFactionId: string | null
  actionId: string
  actionCategory: string
  moralIntent: 'heroic' | 'neutral' | 'villainous'
  districtId: string
  playerRoleHint: 'initiator' | 'responder'
}

// Seed generation inputs - NO player-specific data
export type SeedGenerationInput = {
  actionId: string
  actionCategory: string
  moralIntent: 'heroic' | 'neutral' | 'villainous'
  encounterType: string
  difficulty: number
  difficultyBucket: 'easy' | 'medium' | 'hard' // For cache key grouping
  location: string
  involvedFactions: string[] // Sorted for deterministic cache key
  playerIntentContext?: PlayerIntentContext // Player's overall intent for narrative framing
}

// Enums for structural variety in seeds
export type OpeningStyle = 'sensory' | 'dialogue' | 'action' | 'discovery' | 'aftermath'
export type StakeType = 'time_pressure' | 'moral_dilemma' | 'reputation_risk' | 'collateral_risk' | 'unknown_threat'
export type ChoiceTone = 'aggressive' | 'cautious' | 'clever' | 'desperate' | 'controlled' | 'risky'

// A single seed choice - generic, no personalization
export type SeedChoice = {
  id: string // Stable ID (choice_1, choice_2, etc.)
  genericLabel: string // Generic action description
  approach: 'direct' | 'subtle' | 'diplomatic' | 'tactical' // Approach type
  tone?: ChoiceTone // Tonal color for choice phrasing
  requiredAttributes?: { attributeId: string; minValue: number }[]
  requiredPowers?: string[]
}

// Seed outcome - full mechanical data
export type SeedOutcome = {
  choiceId: string
  successChance: number
  successResult: {
    description: string // Generic success description
    xpGain: number
    factionChanges: { factionId: string; change: number }[]
    attributeGrowth?: { attributeId: string; amount: number }[]
  }
  failureResult: {
    description: string // Generic failure description
    xpGain: number
    factionChanges: { factionId: string; change: number }[]
    hpLoss?: number
  }
}

// Encounter Seed - cacheable, no player references
export type EncounterSeed = {
  seedId: string // UUID assigned after caching
  title: string // Generic title
  situationSummary: string // 1-2 sentences, neutral
  category: string
  difficulty: number
  openingStyle?: OpeningStyle // How the encounter opens narratively
  stakeType?: StakeType // What's at risk in this encounter
  seedHooks?: string[] // 1-2 short generic callback hooks (max 8 words each)
  choices: [SeedChoice, SeedChoice, SeedChoice, SeedChoice] // Exactly 4 choices
  outcomes: SeedOutcome[]
  tags: string[] // Metadata for matching/filtering
  involvedFactions: string[]
  location: string
}

// Cache key components for deterministic lookup
export type SeedCacheKey = {
  encounterType: string
  difficultyBucket: 'easy' | 'medium' | 'hard'
  location: string
  factionKey: string // Sorted, joined faction IDs
  actionCategory: string
}

// Personalizer input - character context for flavoring
export type PersonalizerInput = {
  seed: EncounterSeed
  characterName: string
  originName: string
  powerNames: string[]
  reputationTiers: { factionId: string; tier: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied' }[]
  recentEncounterTags: string[] // Tags from last 3 encounters
  moralIntent?: 'heroic' | 'neutral' | 'villainous'
}

// Personalized encounter output - adds flavor without changing structure
export type PersonalizedEncounter = {
  // From seed (unchanged)
  seedId: string
  category: string
  difficulty: number
  outcomes: SeedOutcome[]
  tags: string[]

  // Personalized content
  name: string // Personalized title
  description: string // Personalized narrative intro (2-4 sentences)
  flavorText?: string // Optional atmospheric detail
  choices: {
    id: string // Same as seed
    text: string // Personalized choice label
    requiredPowers?: string[]
    requiredAttributes?: { attributeId: string; minValue: number }[]
    narrativeDescription: string // Personalized description
  }[]
}

// Helper to convert difficulty to bucket
export function getDifficultyBucket(difficulty: number): 'easy' | 'medium' | 'hard' {
  if (difficulty <= 3) return 'easy'
  if (difficulty <= 6) return 'medium'
  return 'hard'
}

// Helper to generate deterministic cache key
export function generateSeedCacheKey(input: SeedGenerationInput): string {
  const factionKey = [...input.involvedFactions].sort().join('|')
  return `${input.encounterType}:${input.difficultyBucket}:${input.location}:${factionKey}:${input.actionCategory}`
}
