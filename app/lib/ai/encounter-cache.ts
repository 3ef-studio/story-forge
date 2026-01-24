// lib/ai/encounter-cache.ts
import { prisma } from '@/app/lib/db'
import type { EncounterTemplate } from '@/app/data/encounter-templates'
import type { CachedEncounterData, EncounterSeed, SeedGenerationInput } from './types'

// Maximum times a cached encounter can be used before it's considered stale
const MAX_USES_BEFORE_STALE = 5

// Maximum age of cached encounters in days
const MAX_CACHE_AGE_DAYS = 30

// Seed-specific max uses (seeds can be reused more since personalization adds variety)
const MAX_SEED_USES = 10

// Find a cached encounter with fuzzy matching
export async function findCachedEncounter(
  encounterType: string,
  difficulty: number,
  factions: string[],
  location?: string
): Promise<EncounterTemplate | null> {
  try {
    // Find encounters matching the type with fuzzy difficulty matching (±1)
    const cached = await prisma.cachedEncounter.findFirst({
      where: {
        encounterType,
        difficulty: {
          gte: difficulty - 1,
          lte: difficulty + 1,
        },
        // At least one faction must match
        factionContext: {
          hasSome: factions,
        },
        // Not overused
        timesUsed: {
          lt: MAX_USES_BEFORE_STALE,
        },
      },
      orderBy: [
        // Prefer exact difficulty matches
        { difficulty: 'asc' },
        // Then prefer less-used encounters
        { timesUsed: 'asc' },
        // Then prefer newer encounters
        { createdAt: 'desc' },
      ],
    })

    if (!cached) {
      return null
    }

    console.log('[Cache] Found cached encounter:', cached.id)

    // Update usage stats
    await prisma.cachedEncounter.update({
      where: { id: cached.id },
      data: {
        timesUsed: { increment: 1 },
        lastUsedAt: new Date(),
      },
    })

    // Convert to EncounterTemplate format
    return convertToEncounterTemplate(cached as unknown as CachedEncounterData)
  } catch (error) {
    console.error('[Cache] Error finding cached encounter:', error)
    return null
  }
}

// Get a cached encounter by ID (for resolution)
export async function getCachedEncounterById(
  encounterId: string
): Promise<EncounterTemplate | null> {
  try {
    const cached = await prisma.cachedEncounter.findUnique({
      where: { id: encounterId },
    })

    if (!cached) {
      return null
    }

    return convertToEncounterTemplate(cached as unknown as CachedEncounterData)
  } catch (error) {
    console.error('[Cache] Error getting cached encounter by ID:', error)
    return null
  }
}

// Cache a newly generated encounter
export async function cacheEncounter(
  encounter: EncounterTemplate,
  factions: string[],
  location?: string
): Promise<string | null> {
  try {
    const cached = await prisma.cachedEncounter.create({
      data: {
        encounterType: encounter.category,
        difficulty: encounter.difficulty,
        factionContext: factions,
        locationType: location || null,
        description: encounter.description,
        choices: encounter.choices as unknown as object,
        outcomes: encounter.outcomes as unknown as object,
        timesUsed: 1,
        lastUsedAt: new Date(),
      },
    })

    console.log('[Cache] Cached new encounter:', cached.id)
    return cached.id
  } catch (error) {
    console.error('[Cache] Error caching encounter:', error)
    return null
  }
}

// Clean up stale/overused cache entries
export async function cleanStaleCache(): Promise<number> {
  try {
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - MAX_CACHE_AGE_DAYS)

    const result = await prisma.cachedEncounter.deleteMany({
      where: {
        OR: [
          // Overused encounters
          { timesUsed: { gte: MAX_USES_BEFORE_STALE } },
          // Old encounters
          { createdAt: { lt: staleDate } },
        ],
      },
    })

    console.log(`[Cache] Cleaned ${result.count} stale encounters`)
    return result.count
  } catch (error) {
    console.error('[Cache] Error cleaning stale cache:', error)
    return 0
  }
}

// Convert database model to EncounterTemplate
function convertToEncounterTemplate(cached: CachedEncounterData): EncounterTemplate {
  // Handle both old format (choices is array) and new seed format (choices is {title, choices, tags})
  const choicesData = cached.choices as unknown
  let choices: EncounterTemplate['choices']
  let name: string
  let narrativeTags: string[]

  if (Array.isArray(choicesData)) {
    // Old format: choices is directly an array
    choices = choicesData as EncounterTemplate['choices']
    name = `Encounter-${cached.id.slice(0, 8)}`
    narrativeTags = []
  } else if (choicesData && typeof choicesData === 'object' && 'choices' in choicesData) {
    // New seed format: choices is {title, choices, tags}
    const seedData = choicesData as { title?: string; choices?: EncounterTemplate['choices']; tags?: string[] }
    choices = seedData.choices || []
    name = seedData.title || `Encounter-${cached.id.slice(0, 8)}`
    narrativeTags = seedData.tags || []
  } else {
    // Fallback
    choices = []
    name = `Encounter-${cached.id.slice(0, 8)}`
    narrativeTags = []
  }

  return {
    id: cached.id,
    name,
    category: cached.encounterType,
    difficulty: cached.difficulty,
    requiredFactions: cached.factionContext,
    requiredLocation: cached.locationType ? [cached.locationType] : undefined,
    description: cached.description,
    choices,
    outcomes: cached.outcomes,
    narrativeTags,
    canBeReused: true,
    timesUsed: cached.timesUsed,
  }
}

// Get cache statistics
export async function getCacheStats(): Promise<{
  totalEncounters: number
  averageUses: number
  encountersByType: Record<string, number>
}> {
  try {
    const encounters = await prisma.cachedEncounter.findMany({
      select: {
        encounterType: true,
        timesUsed: true,
      },
    })

    const totalEncounters = encounters.length
    const averageUses = totalEncounters > 0
      ? encounters.reduce((sum, e) => sum + e.timesUsed, 0) / totalEncounters
      : 0

    const encountersByType = encounters.reduce((acc, e) => {
      acc[e.encounterType] = (acc[e.encounterType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalEncounters,
      averageUses,
      encountersByType,
    }
  } catch (error) {
    console.error('[Cache] Error getting cache stats:', error)
    return {
      totalEncounters: 0,
      averageUses: 0,
      encountersByType: {},
    }
  }
}

// ============================================
// SEED CACHING (V1 Architecture)
// ============================================

// Generate deterministic cache key for seed lookup
function buildSeedCacheKey(input: SeedGenerationInput): string {
  const factionKey = [...input.involvedFactions].sort().join('|')
  return `${input.encounterType}:${input.difficultyBucket}:${input.location}:${factionKey}:${input.actionCategory}`
}

// Find a cached seed by deterministic key
export async function findCachedSeed(
  input: SeedGenerationInput
): Promise<EncounterSeed | null> {
  try {
    const cacheKey = buildSeedCacheKey(input)
    console.log('[SeedCache] Looking up seed with key:', cacheKey)

    // Use the description field to store the cache key for lookup
    // This is a workaround since we don't have a dedicated cacheKey column
    const cached = await prisma.cachedEncounter.findFirst({
      where: {
        encounterType: input.encounterType,
        difficulty: {
          gte: input.difficulty - 1,
          lte: input.difficulty + 1,
        },
        factionContext: {
          hasEvery: input.involvedFactions,
        },
        locationType: input.location,
        timesUsed: {
          lt: MAX_SEED_USES,
        },
      },
      orderBy: [
        { timesUsed: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    if (!cached) {
      console.log('[SeedCache] MISS - no cached seed found')
      return null
    }

    console.log('[SeedCache] HIT - found cached seed:', cached.id)

    // Update usage stats
    await prisma.cachedEncounter.update({
      where: { id: cached.id },
      data: {
        timesUsed: { increment: 1 },
        lastUsedAt: new Date(),
      },
    })

    // Convert to EncounterSeed format
    return convertToEncounterSeed(cached, input)
  } catch (error) {
    console.error('[SeedCache] Error finding cached seed:', error)
    return null
  }
}

// Cache a newly generated seed
export async function cacheSeed(
  seed: EncounterSeed,
  input: SeedGenerationInput
): Promise<string | null> {
  try {
    const cacheKey = buildSeedCacheKey(input)

    const cached = await prisma.cachedEncounter.create({
      data: {
        encounterType: input.encounterType,
        difficulty: input.difficulty,
        factionContext: input.involvedFactions,
        locationType: input.location,
        description: seed.situationSummary,
        choices: {
          title: seed.title,
          choices: seed.choices,
          tags: seed.tags,
        } as unknown as object,
        outcomes: seed.outcomes as unknown as object,
        timesUsed: 1,
        lastUsedAt: new Date(),
      },
    })

    console.log('[SeedCache] Cached new seed:', cached.id, 'key:', cacheKey)
    return cached.id
  } catch (error) {
    console.error('[SeedCache] Error caching seed:', error)
    return null
  }
}

// Get a cached seed by ID (for resolution)
export async function getCachedSeedById(
  seedId: string
): Promise<{ seed: EncounterSeed; raw: CachedEncounterData } | null> {
  try {
    const cached = await prisma.cachedEncounter.findUnique({
      where: { id: seedId },
    })

    if (!cached) {
      return null
    }

    // Reconstruct seed from cached data
    const choicesData = cached.choices as { title?: string; choices?: EncounterSeed['choices']; tags?: string[] }
    const outcomes = cached.outcomes as EncounterSeed['outcomes']

    const seed: EncounterSeed = {
      seedId: cached.id,
      title: choicesData.title || `Encounter-${cached.id.slice(0, 8)}`,
      situationSummary: cached.description,
      category: cached.encounterType,
      difficulty: cached.difficulty,
      choices: choicesData.choices || [] as unknown as EncounterSeed['choices'],
      outcomes: outcomes,
      tags: choicesData.tags || [],
      involvedFactions: cached.factionContext,
      location: cached.locationType || 'urban',
    }

    return {
      seed,
      raw: cached as unknown as CachedEncounterData,
    }
  } catch (error) {
    console.error('[SeedCache] Error getting cached seed by ID:', error)
    return null
  }
}

// Convert database record to EncounterSeed
function convertToEncounterSeed(
  cached: {
    id: string
    encounterType: string
    difficulty: number
    factionContext: string[]
    locationType: string | null
    description: string
    choices: unknown
    outcomes: unknown
  },
  input: SeedGenerationInput
): EncounterSeed {
  const choicesData = cached.choices as { title?: string; choices?: EncounterSeed['choices']; tags?: string[] }
  const outcomes = cached.outcomes as EncounterSeed['outcomes']

  return {
    seedId: cached.id,
    title: choicesData.title || `Encounter-${cached.id.slice(0, 8)}`,
    situationSummary: cached.description,
    category: cached.encounterType,
    difficulty: cached.difficulty,
    choices: choicesData.choices || [] as unknown as EncounterSeed['choices'],
    outcomes: outcomes,
    tags: choicesData.tags || [],
    involvedFactions: cached.factionContext,
    location: cached.locationType || input.location,
  }
}
