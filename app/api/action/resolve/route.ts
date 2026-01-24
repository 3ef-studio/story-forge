import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  getEncounterTemplateById,
  calculateOutcomeSuccess,
  type EncounterTemplate,
} from '@/app/data/encounter-templates';
import { calculateReputationImpact, getFactionById } from '@/app/data/factions';
import { applyGoalProgressOnEncounterResolution, checkAndCompleteGoals, getActiveGoals } from '@/app/lib/game-logic/goal-manager';
import { buildAttributeMap, buildFactionReputationMap } from '@/app/lib/utils/character-utils';

// Type for outcome result with optional fields
type OutcomeResult = {
  description: string;
  xpGain: number;
  factionChanges: { factionId: string; change: number }[];
  attributeGrowth?: { attributeId: string; amount: number }[];
  hpLoss?: number;
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

    // Calculate success
    const success = calculateOutcomeSuccess(outcome, powersList, attributesMap, choice);
    const result: OutcomeResult = success ? outcome.successResult : outcome.failureResult;

    // Build faction reputation map
    const factionReputations = buildFactionReputationMap(character.factionReputations);

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
    const hpLoss = !success && result.hpLoss ? result.hpLoss : 0;

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

      await tx.storyEvent.create({
        data: {
          characterId: character.id,
          eventType: 'encounter',
          summary: success
            ? `Successfully handled: ${encounter.name}`
            : `Struggled with: ${encounter.name}`,
          fullDescription: result.description,
          narrativeWeight: encounter.difficulty,
          tags: [...encounter.narrativeTags, success ? 'success' : 'failure'],
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

    await applyGoalProgressOnEncounterResolution(character.id, {
      won: success,
      usedPowerIds,
      reputationChanges: allReputationChanges,
    });

    // Check if any goals completed
    const { completedGoals, xpAwarded: goalXp } = await checkAndCompleteGoals(character.id);

    // Get updated active goals
    const activeGoals = await getActiveGoals(character.id);

    return NextResponse.json({
      success,
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
