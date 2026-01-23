// lib/ai/types.ts
import type { Origin } from '@/app/data/origins'
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
