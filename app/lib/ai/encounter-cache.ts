// lib/ai/encounter-cache.ts
import { prisma } from '@/app/lib/db'
import type { EncounterTemplate } from '@/app/data/encounter-templates'
import type { CachedEncounterData } from './types'

// Maximum times a cached encounter can be used before it's considered stale
const MAX_USES_BEFORE_STALE = 5

// Maximum age of cached encounters in days
const MAX_CACHE_AGE_DAYS = 30

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
  return {
    id: cached.id,
    name: `Encounter-${cached.id.slice(0, 8)}`, // Generate name from ID
    category: cached.encounterType,
    difficulty: cached.difficulty,
    requiredFactions: cached.factionContext,
    requiredLocation: cached.locationType ? [cached.locationType] : undefined,
    description: cached.description,
    choices: cached.choices,
    outcomes: cached.outcomes,
    narrativeTags: [], // Not stored in cache
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
