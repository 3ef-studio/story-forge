// lib/game-logic/goal-manager.ts
// Goal management system - deterministic, no AI calls

import { prisma } from '@/app/lib/db'
import { goalDefinitions, getGoalDefinitionById, type GoalDefinition, type GoalMetadata } from '@/app/data/goals'
import type { Action } from '@/app/data/actions'
import type { CharacterGoal } from '@prisma/client'

// Type for goal records returned from DB
export type GoalRecord = {
  id: string
  goalType: string
  title: string
  description: string
  targetValue: number
  currentProgress: number
  metadata: GoalMetadata | null
  xpReward: number
  isActive: boolean
  completedAt: Date | null
}

// Origin to starting goals mapping
const ORIGIN_STARTING_GOALS: Record<string, [string, string]> = {
  inherited_artifact: ['use_telekinesis_3', 'win_encounters_3'],
  corporate_experiment: ['use_enhanced_durability_3', 'gain_civilian_rep_20'],
  dream_walker: ['use_precognition_3', 'use_telepathy_3'],
  viral_mutation: ['use_shapeshifting_3', 'use_healing_3'],
  empathic_overload: ['use_telepathy_3', 'social_actions_3'],
  construction_accident: ['use_super_strength_3', 'heroic_actions_5'],
  parallel_refugee: ['use_flight_3', 'use_force_field_3'],
  bloodline_awakening: ['win_encounters_3', 'gain_vigilante_rep_15'],
  observer_entity: ['patrol_downtown_3', 'gain_police_rep_15'],
  probability_anomaly: ['win_encounters_5', 'heroic_actions_5'],
}

// Fallback goals for any origin not mapped
const FALLBACK_STARTING_GOALS: [string, string] = ['win_encounters_3', 'heroic_actions_5']

// Get active goals for a character
export async function getActiveGoals(characterId: string): Promise<GoalRecord[]> {
  const goals = await prisma.characterGoal.findMany({
    where: {
      characterId,
      isActive: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return goals.map(g => ({
    id: g.id,
    goalType: g.goalType,
    title: g.title,
    description: g.description,
    targetValue: g.targetValue,
    currentProgress: g.currentProgress,
    metadata: g.metadata as GoalMetadata | null,
    xpReward: g.xpReward,
    isActive: g.isActive,
    completedAt: g.completedAt,
  }))
}

// Initialize goals for a new character based on origin
export async function initializeGoalsForNewCharacter(
  characterId: string,
  originId: string
): Promise<void> {
  const startingGoalIds = ORIGIN_STARTING_GOALS[originId] ?? FALLBACK_STARTING_GOALS

  const goalsToCreate = startingGoalIds
    .map(id => getGoalDefinitionById(id))
    .filter((g): g is GoalDefinition => g !== undefined)

  if (goalsToCreate.length === 0) {
    console.error('[Goals] No valid starting goals found for origin:', originId)
    return
  }

  await prisma.characterGoal.createMany({
    data: goalsToCreate.map(def => ({
      characterId,
      goalType: def.goalType,
      title: def.titleTemplate,
      description: def.descriptionTemplate,
      targetValue: def.targetValue,
      currentProgress: 0,
      metadata: def.metadata,
      xpReward: def.xpReward,
      isActive: true,
    })),
  })

  console.log('[Goals] Initialized', goalsToCreate.length, 'goals for character:', characterId)
}

// Check if an action advances any active goal
export function doesActionAdvanceAnyGoal(
  action: { id: string; category: string; locationTypes: string[] },
  goals: GoalRecord[]
): { advances: boolean; goalIds: string[] } {
  const advancedGoalIds: string[] = []

  for (const goal of goals) {
    if (!goal.isActive || goal.currentProgress >= goal.targetValue) continue

    const metadata = goal.metadata

    switch (goal.goalType) {
      case 'action_count':
        if (metadata?.actionId === action.id) {
          advancedGoalIds.push(goal.id)
        }
        break

      case 'category_count':
        if (metadata?.category === action.category) {
          advancedGoalIds.push(goal.id)
        }
        break

      case 'location_count':
        if (metadata?.location && action.locationTypes.includes(metadata.location)) {
          advancedGoalIds.push(goal.id)
        }
        break

      // faction_rep_gain, encounter_win_count, power_use_count
      // are tracked via resolution, not action execution
    }
  }

  return {
    advances: advancedGoalIds.length > 0,
    goalIds: advancedGoalIds,
  }
}

// Apply goal progress when an action is executed
export async function applyGoalProgressOnAction(
  characterId: string,
  action: Action
): Promise<void> {
  const activeGoals = await getActiveGoals(characterId)

  for (const goal of activeGoals) {
    if (!goal.isActive || goal.currentProgress >= goal.targetValue) continue

    const metadata = goal.metadata
    let shouldIncrement = false

    switch (goal.goalType) {
      case 'action_count':
        if (metadata?.actionId === action.id) {
          shouldIncrement = true
        }
        break

      case 'category_count':
        if (metadata?.category === action.category) {
          shouldIncrement = true
        }
        break

      case 'location_count':
        if (metadata?.location && action.locationTypes.includes(metadata.location)) {
          shouldIncrement = true
        }
        break
    }

    if (shouldIncrement) {
      await prisma.characterGoal.update({
        where: { id: goal.id },
        data: {
          currentProgress: Math.min(goal.currentProgress + 1, goal.targetValue),
        },
      })
    }
  }
}

// Apply goal progress when an encounter is resolved
export async function applyGoalProgressOnEncounterResolution(
  characterId: string,
  resolution: {
    won: boolean
    usedPowerIds?: string[]
    reputationChanges?: Record<string, number>
  }
): Promise<void> {
  const activeGoals = await getActiveGoals(characterId)

  for (const goal of activeGoals) {
    if (!goal.isActive || goal.currentProgress >= goal.targetValue) continue

    const metadata = goal.metadata
    let incrementAmount = 0

    switch (goal.goalType) {
      case 'encounter_win_count':
        if (resolution.won) {
          incrementAmount = 1
        }
        break

      case 'power_use_count':
        if (metadata?.powerId && resolution.usedPowerIds?.includes(metadata.powerId)) {
          incrementAmount = 1
        }
        break

      case 'faction_rep_gain':
        if (metadata?.factionId && resolution.reputationChanges) {
          const repChange = resolution.reputationChanges[metadata.factionId]
          if (repChange && repChange > 0) {
            incrementAmount = repChange
          }
        }
        break
    }

    if (incrementAmount > 0) {
      await prisma.characterGoal.update({
        where: { id: goal.id },
        data: {
          currentProgress: Math.min(goal.currentProgress + incrementAmount, goal.targetValue),
        },
      })
    }
  }
}

// Check and complete goals that have reached their target
export async function checkAndCompleteGoals(
  characterId: string
): Promise<{ completedGoals: GoalRecord[]; xpAwarded: number }> {
  const activeGoals = await getActiveGoals(characterId)
  const completedGoals: GoalRecord[] = []
  let totalXp = 0

  for (const goal of activeGoals) {
    if (goal.currentProgress >= goal.targetValue) {
      // Mark as completed
      await prisma.characterGoal.update({
        where: { id: goal.id },
        data: {
          isActive: false,
          completedAt: new Date(),
        },
      })

      // Award XP
      await prisma.character.update({
        where: { id: characterId },
        data: {
          currentXp: { increment: goal.xpReward },
        },
      })

      totalXp += goal.xpReward
      completedGoals.push({ ...goal, isActive: false, completedAt: new Date() })
    }
  }

  if (completedGoals.length > 0) {
    console.log('[Goals] Completed', completedGoals.length, 'goals, awarded', totalXp, 'XP')
  }

  return { completedGoals, xpAwarded: totalXp }
}

// Get available goal choices (goals not currently active or recently completed)
export async function getGoalChoices(characterId: string): Promise<GoalDefinition[]> {
  // Get all goals for this character
  const existingGoals = await prisma.characterGoal.findMany({
    where: { characterId },
    select: { goalType: true, metadata: true },
  })

  // Build a set of "used" goal identifiers to avoid duplicates
  const usedGoalKeys = new Set(
    existingGoals.map(g => {
      const meta = g.metadata as GoalMetadata | null
      return `${g.goalType}:${meta?.actionId || ''}:${meta?.category || ''}:${meta?.factionId || ''}:${meta?.powerId || ''}:${meta?.location || ''}`
    })
  )

  // Filter out already used goals
  const availableGoals = goalDefinitions.filter(def => {
    const key = `${def.goalType}:${def.metadata.actionId || ''}:${def.metadata.category || ''}:${def.metadata.factionId || ''}:${def.metadata.powerId || ''}:${def.metadata.location || ''}`
    return !usedGoalKeys.has(key)
  })

  // Return 2-3 random choices
  const shuffled = availableGoals.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

// Accept a goal choice and create the goal
export async function acceptGoalChoice(
  characterId: string,
  goalTemplateId: string
): Promise<GoalRecord | null> {
  const definition = getGoalDefinitionById(goalTemplateId)
  if (!definition) {
    console.error('[Goals] Unknown goal template:', goalTemplateId)
    return null
  }

  const created = await prisma.characterGoal.create({
    data: {
      characterId,
      goalType: definition.goalType,
      title: definition.titleTemplate,
      description: definition.descriptionTemplate,
      targetValue: definition.targetValue,
      currentProgress: 0,
      metadata: definition.metadata,
      xpReward: definition.xpReward,
      isActive: true,
    },
  })

  console.log('[Goals] Accepted new goal:', definition.titleTemplate)

  return {
    id: created.id,
    goalType: created.goalType,
    title: created.title,
    description: created.description,
    targetValue: created.targetValue,
    currentProgress: created.currentProgress,
    metadata: created.metadata as GoalMetadata | null,
    xpReward: created.xpReward,
    isActive: created.isActive,
    completedAt: created.completedAt,
  }
}

// Get count of active goals
export async function getActiveGoalCount(characterId: string): Promise<number> {
  return prisma.characterGoal.count({
    where: {
      characterId,
      isActive: true,
    },
  })
}
