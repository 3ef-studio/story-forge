import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  getEncounterTemplateById,
  type EncounterTemplate,
} from '@/app/data/encounter-templates';
import { calculateReputationImpact, getFactionById } from '@/app/data/factions';
import { applyGoalProgressOnEncounterResolution, checkAndCompleteGoals, getActiveGoals } from '@/app/lib/game-logic/goal-manager';
import { buildAttributeMap, buildFactionReputationMap } from '@/app/lib/utils/character-utils';
import { resolveEncounter, inferApproachFromText } from '@/app/lib/game-logic/combat/resolve-encounter';
import type { Approach, ResolutionBreakdown } from '@/app/lib/game-logic/combat/types';
import {
  selectPowerForApproach,
  calculatePowerXpGain,
  calculatePowerBonus,
  processPowerProgression,
  type PowerProgressionResult,
} from '@/app/lib/game-logic/power-progression';
import {
  consumeThread,
  maybeCreateThreadFromOutcome,
} from '@/app/lib/game-logic/thread-manager';
import {
  recordNPCEncounter,
  calculateDispositionChange,
  calculateSocialDispositionChange,
} from '@/app/lib/game-logic/npc-manager';
import { getNPCById } from '@/app/data/npcs';
import { getActionById } from '@/app/data/actions';

// Type for outcome result with optional fields
type OutcomeResult = {
  description: string;
  xpGain: number;
  factionChanges: { factionId: string; change: number }[];
  attributeGrowth?: { attributeId: string; amount: number }[];
  hpLoss?: number;
};

// Extended choice type that may include approach from seed encounters
type ChoiceWithApproach = {
  id: string;
  text: string;
  requiredPowers?: string[];
  requiredAttributes?: { attributeId: string; minValue: number }[];
  narrativeDescription: string;
  approach?: Approach;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mobility powers that provide escape bonuses
const MOBILITY_POWERS = ['flight', 'super_speed', 'invisibility', 'wall_crawling', 'shapeshifting'];
const PRECOGNITION_POWER = 'precognition';

// Retreat resolution type
type RetreatResolution = {
  isRetreat: true;
  escapeChance: number;
  roll: number;
  mobilityBonus: number;
  difficultyPenalty: number;
  agilityBonus: number;
  success: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function handleRetreat(
  userId: string,
  encounter: EncounterTemplate
): Promise<NextResponse> {
  // Get character
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      attributes: true,
      powers: true,
      factionReputations: true,
    },
  });

  if (!character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 });
  }

  // Build attribute map
  const attributesMap = buildAttributeMap(character.attributes);
  const powersList = character.powers.map((p) => p.powerId);

  // Calculate escape chance
  const agility = attributesMap['agility'] ?? 10;
  const difficulty = encounter.difficulty;

  // Mobility bonus: +0.10 for mobility powers, +0.05 for precognition
  let mobilityBonus = 0;
  if (powersList.some((p) => MOBILITY_POWERS.includes(p))) {
    mobilityBonus = 0.10;
  } else if (powersList.includes(PRECOGNITION_POWER)) {
    mobilityBonus = 0.05;
  }

  // Calculate escape chance: base 35% + agility bonus + mobility bonus - difficulty penalty
  const agilityBonus = agility * 0.02;
  const difficultyPenalty = difficulty * 0.10;
  const escapeChance = clamp(0.35 + agilityBonus + mobilityBonus - difficultyPenalty, 0.10, 0.85);

  // Roll for escape
  const roll = Math.random();
  const escaped = roll < escapeChance;

  // Calculate results based on escape success
  const xpGained = escaped ? Math.max(10, Math.floor(encounter.difficulty * 2)) : 5;
  const energyCost = escaped ? 2 : 5;
  const hpLoss = escaped ? 0 : Math.min(10, 5 + Math.floor(difficulty / 2));

  const description = escaped
    ? 'You managed to escape the encounter.'
    : 'You tried to escape but were caught. You took some damage in the process.';

  const newHp = Math.max(0, character.currentHp - hpLoss);

  // Calculate XP and check level up
  let newXp = character.currentXp + xpGained;
  let newLevel = character.level;
  const xpToLevel = character.level * 100;
  let leveledUp = false;

  if (newXp >= xpToLevel) {
    newXp -= xpToLevel;
    newLevel++;
    leveledUp = true;
  }

  // Update character in transaction
  await prisma.$transaction(async (tx) => {
    await tx.character.update({
      where: { id: character.id },
      data: {
        currentHp: newHp,
        currentEnergy: Math.max(0, character.currentEnergy - energyCost),
        currentXp: newXp,
        level: newLevel,
        maxHp: leveledUp ? character.maxHp + 10 : character.maxHp,
        pendingLevelUpAttributePick: leveledUp ? true : undefined,
      },
    });

    // Build summary based on outcome
    const outcomeSummary = escaped
      ? `Escaped from: ${encounter.name}`
      : `Failed to escape: ${encounter.name}`;

    await tx.storyEvent.create({
      data: {
        characterId: character.id,
        eventType: 'encounter',
        summary: outcomeSummary,
        fullDescription: description,
        narrativeWeight: Math.max(1, encounter.difficulty - 2),
        tags: [...encounter.narrativeTags, 'retreat', escaped ? 'escaped' : 'caught'],
      },
    });

    if (leveledUp) {
      await tx.storyEvent.create({
        data: {
          characterId: character.id,
          eventType: 'level_up',
          summary: `Reached Level ${newLevel}!`,
          narrativeWeight: 8,
          tags: ['level_up', 'milestone'],
        },
      });
    }
  });

  // Apply goal progress (retreat counts as loss for goals)
  await applyGoalProgressOnEncounterResolution(character.id, {
    won: false,
    usedPowerIds: [],
    reputationChanges: {},
  });

  // Check if any goals completed
  const { completedGoals, xpAwarded: goalXp } = await checkAndCompleteGoals(character.id);

  // Get updated active goals
  const activeGoals = await getActiveGoals(character.id);

  // Build retreat resolution data
  const retreatResolution: RetreatResolution = {
    isRetreat: true,
    escapeChance: Math.round(escapeChance * 100),
    roll: Math.round(roll * 100),
    mobilityBonus: Math.round(mobilityBonus * 100),
    difficultyPenalty: Math.round(difficultyPenalty * 100),
    agilityBonus: Math.round(agilityBonus * 100),
    success: escaped,
  };

  return NextResponse.json({
    success: escaped,
    partial: false,
    outcome: {
      description,
      xpGained,
      hpChange: -hpLoss,
      energyChange: -energyCost,
      factionChanges: [],
      attributeGrowth: [],
    },
    resolution: {
      outcome: escaped ? 'success' : 'failure',
      roll: retreatResolution.roll,
      target: retreatResolution.escapeChance,
      modifiers: [
        { label: 'Base chance', value: 35 },
        { label: `Agility (${agility})`, value: retreatResolution.agilityBonus },
        { label: 'Mobility powers', value: retreatResolution.mobilityBonus },
        { label: `Difficulty ${difficulty}`, value: -retreatResolution.difficultyPenalty },
      ],
      summary: escaped ? 'You escaped successfully.' : 'Your escape attempt failed.',
      isRetreat: true,
    },
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    goals: {
      active: activeGoals,
      completed: completedGoals,
      xpAwarded: goalXp,
    },
  });
}

type ResolveActionBody = {
  encounterId: string;
  choiceId: string;
  isCached?: boolean;
  threadId?: string;
  actionId?: string;
  locationType?: string;
  npcId?: string;
};

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isResolveActionBody(value: unknown): value is ResolveActionBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;

  return (
    typeof v.encounterId === 'string' &&
    typeof v.choiceId === 'string' &&
    (v.isCached === undefined || typeof v.isCached === 'boolean') &&
    (v.threadId === undefined || typeof v.threadId === 'string') &&
    (v.actionId === undefined || typeof v.actionId === 'string') &&
    (v.locationType === undefined || typeof v.locationType === 'string') &&
    (v.npcId === undefined || typeof v.npcId === 'string')
  );
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!isResolveActionBody(rawBody)) {
      return NextResponse.json(
        { error: 'Missing or invalid encounterId/choiceId' },
        { status: 400 }
      );
    }

    const { encounterId, choiceId, threadId, actionId, locationType, npcId } = rawBody;
    const isCached = Boolean(rawBody.isCached);

    // Look up encounter from cache or templates
    // Robust behavior: UUID encounterIds are almost certainly cached AI encounters.
    let encounter: EncounterTemplate | null | undefined = null;

    if (isCached || isUuidLike(encounterId)) {
      // IMPORTANT: lazy import prevents build-time module evaluation failures on Vercel
      const { getCachedEncounterById } = await import('@/app/lib/ai/encounter-cache');
      encounter = await getCachedEncounterById(encounterId);
    }

    if (!encounter) {
      encounter = getEncounterTemplateById(encounterId);
    }

    if (!encounter) {
      return NextResponse.json(
        {
          error: 'Invalid encounter',
          encounterId,
          isCached,
          lookedInCache: isCached || isUuidLike(encounterId),
        },
        { status: 400 }
      );
    }

    // Handle retreat as a special universal choice
    if (choiceId === 'retreat') {
      return handleRetreat(session.user.id, encounter);
    }

    const choice = encounter.choices.find((c) => c.id === choiceId);
    if (!choice) {
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
    }

    const outcome = encounter.outcomes.find((o) => o.choiceId === choiceId);
    if (!outcome) {
      return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 });
    }

    // Get character
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      include: {
        attributes: true,
        powers: true,
        factionReputations: true,
      },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Build attribute map
    const attributesMap = buildAttributeMap(character.attributes);

    // Build powers list
    const powersList = character.powers.map((p) => p.powerId);

    // Check choice requirements
    if (choice.requiredPowers?.length) {
      const hasPower = choice.requiredPowers.some((p) => powersList.includes(p));
      if (!hasPower) {
        return NextResponse.json(
          { error: 'Missing required power for this choice' },
          { status: 400 }
        );
      }
    }

    if (choice.requiredAttributes?.length) {
      const unmet = choice.requiredAttributes.find(
        (req) => (attributesMap[req.attributeId] || 0) < req.minValue
      );
      if (unmet) {
        return NextResponse.json(
          { error: `Requires ${unmet.attributeId} ${unmet.minValue}` },
          { status: 400 }
        );
      }
    }

    // Build faction reputation map
    const factionReputations = buildFactionReputationMap(character.factionReputations);

    // Determine approach from choice (seed choices have it, templates need inference)
    const choiceWithApproach = choice as ChoiceWithApproach;
    const approach: Approach = choiceWithApproach.approach ?? inferApproachFromText(choice.text);

    // Select power for this approach
    const characterPowers = character.powers.map((p) => ({
      powerId: p.powerId,
      currentLevel: p.currentLevel,
      currentXp: p.currentXp,
      timesUsed: p.timesUsed,
    }));
    const selectedPower = selectPowerForApproach(approach, characterPowers);

    // Calculate power level bonus if we have a selected power
    let powerLevelBonus = 0;
    let powerLevelLabel: string | undefined;
    if (selectedPower) {
      powerLevelBonus = calculatePowerBonus(selectedPower.power, selectedPower.characterPower.currentLevel);
      powerLevelLabel = `${selectedPower.power.name} Lv${selectedPower.characterPower.currentLevel}`;
    }

    // Use the new combat resolver for deterministic, explainable resolution
    const resolution: ResolutionBreakdown = resolveEncounter({
      difficulty: encounter.difficulty,
      approach,
      attributes: attributesMap,
      powerIds: powersList,
      repByFaction: factionReputations,
      encounterTags: encounter.narrativeTags,
      involvedFactions: encounter.requiredFactions,
      powerLevelBonus,
      powerLevelLabel,
    });

    // Determine outcome based on resolution
    // success = full rewards, partial = success rewards at 50%, failure = failure penalties
    const isSuccess = resolution.outcome === 'success';
    const isPartial = resolution.outcome === 'partial';
    const isFailure = resolution.outcome === 'failure';

    // Select base result - partial uses success result with reduced rewards
    const baseResult: OutcomeResult = (isSuccess || isPartial)
      ? outcome.successResult
      : outcome.failureResult;

    // Calculate effective XP (partial gets 50%)
    const xpMultiplier = isPartial ? 0.5 : 1.0;
    const effectiveXpGain = Math.floor(baseResult.xpGain * xpMultiplier);

    // Build effective result with adjusted values
    const result: OutcomeResult = {
      description: isPartial
        ? `${baseResult.description} (Partial success)`
        : baseResult.description,
      xpGain: effectiveXpGain,
      factionChanges: baseResult.factionChanges.map(fc => ({
        ...fc,
        // Partial success gets reduced faction changes too
        change: isPartial ? Math.floor(fc.change * 0.5) : fc.change,
      })),
      attributeGrowth: (isSuccess || isPartial) ? baseResult.attributeGrowth : undefined,
      hpLoss: isFailure ? baseResult.hpLoss : undefined,
    };

    // Calculate cascading reputation changes
    const allReputationChanges: Record<string, number> = {};
    for (const change of result.factionChanges) {
      const faction = getFactionById(change.factionId);
      if (!faction) continue;

      const cascadeChanges = calculateReputationImpact(
        faction,
        change.change,
        factionReputations
      );

      for (const [cascadeFactionId, cascadeChange] of Object.entries(cascadeChanges)) {
        allReputationChanges[cascadeFactionId] =
          (allReputationChanges[cascadeFactionId] || 0) + cascadeChange;
      }
    }

    // Calculate HP change (only on failure)
    const hpLoss = isFailure && result.hpLoss ? result.hpLoss : 0;

    const newHp = Math.max(0, character.currentHp - hpLoss);

    // Calculate XP and check level up
    const xpGained = result.xpGain;
    let newXp = character.currentXp + xpGained;
    let newLevel = character.level;
    const xpToLevel = character.level * 100;
    let leveledUp = false;

    if (newXp >= xpToLevel) {
      newXp -= xpToLevel;
      newLevel++;
      leveledUp = true;
    }

    // Process power progression if we have a selected power
    let powerProgression: PowerProgressionResult | null = null;
    if (selectedPower) {
      const powerXpGained = calculatePowerXpGain(encounter.difficulty, isSuccess || isPartial);
      powerProgression = processPowerProgression(
        selectedPower.power,
        selectedPower.characterPower,
        powerXpGained
      );
    }

    // Update character in transaction
    await prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: {
          currentHp: newHp,
          currentXp: newXp,
          level: newLevel,
          maxHp: leveledUp ? character.maxHp + 10 : character.maxHp,
          pendingLevelUpAttributePick: leveledUp ? true : undefined,
        },
      });

      const attributeGrowth = result.attributeGrowth ?? [];

      for (const growth of attributeGrowth) {
        await tx.characterAttribute.updateMany({
          where: {
            characterId: character.id,
            attributeId: growth.attributeId,
          },
          data: {
            currentValue: { increment: growth.amount },
          },
        });
      }

      for (const [factionId, change] of Object.entries(allReputationChanges)) {
        await tx.factionReputation.updateMany({
          where: { characterId: character.id, factionId },
          data: { reputation: { increment: change } },
        });
      }

      // Update power progression if applicable
      if (powerProgression) {
        await tx.characterPower.updateMany({
          where: {
            characterId: character.id,
            powerId: powerProgression.powerId,
          },
          data: {
            currentXp: powerProgression.xpAfter,
            currentLevel: powerProgression.levelAfter,
            timesUsed: { increment: 1 },
          },
        });
      }

      // Build summary based on outcome
      const outcomeSummary = isSuccess
        ? `Successfully handled: ${encounter.name}`
        : isPartial
        ? `Partially succeeded: ${encounter.name}`
        : `Struggled with: ${encounter.name}`;

      await tx.storyEvent.create({
        data: {
          characterId: character.id,
          eventType: 'encounter',
          summary: outcomeSummary,
          fullDescription: result.description,
          narrativeWeight: encounter.difficulty,
          tags: [...encounter.narrativeTags, resolution.outcome],
        },
      });

      if (leveledUp) {
        await tx.storyEvent.create({
          data: {
            characterId: character.id,
            eventType: 'level_up',
            summary: `Reached Level ${newLevel}!`,
            narrativeWeight: 8,
            tags: ['level_up', 'milestone'],
          },
        });
      }
    });

    // Apply goal progress for encounter resolution
    // Determine used powers from choice (if choice required powers, consider them used)
    const usedPowerIds = choice.requiredPowers ?? [];

    // Goals count success and partial as "won"
    const wonEncounter = isSuccess || isPartial;

    await applyGoalProgressOnEncounterResolution(character.id, {
      won: wonEncounter,
      usedPowerIds,
      reputationChanges: allReputationChanges,
    });

    // Check if any goals completed
    const { completedGoals, xpAwarded: goalXp } = await checkAndCompleteGoals(character.id);

    // Get updated active goals
    const activeGoals = await getActiveGoals(character.id);

    // Consume thread if one was used in this encounter
    if (threadId) {
      await consumeThread(threadId);
    }

    // Maybe create a new thread from this outcome
    await maybeCreateThreadFromOutcome(character.id, {
      encounterId,
      encounterType: encounter.category,
      difficulty: encounter.difficulty,
      involvedFactions: encounter.requiredFactions,
      locationType: locationType,
      success: isSuccess || isPartial,
      factionChanges: Object.entries(allReputationChanges).map(([factionId, change]) => ({
        factionId,
        change,
      })),
      actionId: actionId || 'unknown',
      npcId,
    });

    // Record NPC encounter if one was involved
    if (npcId) {
      const npc = getNPCById(npcId);
      const factionChanges = Object.entries(allReputationChanges).map(([factionId, change]) => ({
        factionId,
        change,
      }));

      // Social actions get higher disposition bonuses
      const resolvedAction = actionId ? getActionById(actionId) : undefined;
      const dispositionChange = resolvedAction?.category === 'social'
        ? calculateSocialDispositionChange(npc?.factionId, factionChanges)
        : calculateDispositionChange(isSuccess || isPartial, npc?.factionId, factionChanges);

      await recordNPCEncounter(character.id, npcId, dispositionChange);
    }

    return NextResponse.json({
      success: isSuccess,
      partial: isPartial,
      outcome: {
        description: result.description,
        xpGained,
        hpChange: -hpLoss,
        factionChanges: Object.entries(allReputationChanges).map(([factionId, change]) => ({
          factionId,
          change,
        })),
        attributeGrowth: result.attributeGrowth ?? [],
      },
      resolution: {
        outcome: resolution.outcome,
        roll: resolution.roll,
        target: resolution.target,
        modifiers: resolution.modifiers,
        summary: resolution.summary,
      },
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
      goals: {
        active: activeGoals,
        completed: completedGoals,
        xpAwarded: goalXp,
      },
      powerProgression: powerProgression ? {
        powerId: powerProgression.powerId,
        powerName: powerProgression.powerName,
        powerCategory: powerProgression.powerCategory,
        levelBefore: powerProgression.levelBefore,
        xpBefore: powerProgression.xpBefore,
        levelAfter: powerProgression.levelAfter,
        xpAfter: powerProgression.xpAfter,
        xpGained: powerProgression.xpGained,
        leveledUp: powerProgression.leveledUp,
        powerBonusApplied: powerProgression.powerBonus,
        xpToNextLevel: powerProgression.xpToNextLevel,
      } : undefined,
    });
  } catch (error) {
    console.error('Encounter resolution error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
