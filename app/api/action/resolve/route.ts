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

type ResolveActionBody = {
  encounterId: string;
  choiceId: string;
  isCached?: boolean;
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
    (v.isCached === undefined || typeof v.isCached === 'boolean')
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

    const { encounterId, choiceId } = rawBody;
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

    // Use the new combat resolver for deterministic, explainable resolution
    const resolution: ResolutionBreakdown = resolveEncounter({
      difficulty: encounter.difficulty,
      approach,
      attributes: attributesMap,
      powerIds: powersList,
      repByFaction: factionReputations,
      encounterTags: encounter.narrativeTags,
      involvedFactions: encounter.requiredFactions,
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

    // Update character in transaction
    await prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: {
          currentHp: newHp,
          currentXp: newXp,
          level: newLevel,
          maxHp: leveledUp ? character.maxHp + 10 : character.maxHp,
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
    });
  } catch (error) {
    console.error('Encounter resolution error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
