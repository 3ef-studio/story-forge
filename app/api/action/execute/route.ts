import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  getActionById,
  applyActionEffects,
  getCooldownExpiry,
  rollForEncounter,
  selectEncounterType,
  getEncounterDifficulty,
} from '@/app/data/actions';
import { calculateReputationImpact, getFactionById } from '@/app/data/factions';
import {
  getAvailableEncounters,
  selectRandomEncounter,
  type EncounterTemplate,
} from '@/app/data/encounter-templates';
import { findCachedEncounter, cacheEncounter } from '@/app/lib/ai/encounter-cache';

// Ensure this route runs on Node.js runtime (Prisma + Edge can break)
export const runtime = 'nodejs';
// Ensure Next doesn't try to statically optimize anything about this route
export const dynamic = 'force-dynamic';

type ExecuteActionBody = {
  actionId: string;
};

function isExecuteActionBody(value: unknown): value is ExecuteActionBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.actionId === 'string' && v.actionId.length > 0;
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

    if (!isExecuteActionBody(rawBody)) {
      return NextResponse.json({ error: 'Missing or invalid actionId' }, { status: 400 });
    }

    const { actionId } = rawBody;

    const action = getActionById(actionId);
    if (!action) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get character with all data
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      include: {
        attributes: true,
        powers: true,
        factionReputations: true,
        actionCooldowns: true,
      },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Check cooldown
    const existingCooldown = character.actionCooldowns.find(
      (cd) => cd.actionId === actionId && cd.expiresAt > new Date()
    );
    if (existingCooldown) {
      return NextResponse.json({ error: 'Action is on cooldown' }, { status: 400 });
    }

    // Build attribute map
    const attributesMap: Record<string, number> = {};
    for (const attr of character.attributes) {
      attributesMap[attr.attributeId] = attr.currentValue;
    }

    // Build powers list
    const powersList = character.powers.map((p) => p.powerId);

    // Check energy (handle rest action which restores energy)
    const energyCost = action.energyCost;
    if (energyCost > 0 && character.currentEnergy < energyCost) {
      return NextResponse.json({ error: 'Not enough energy' }, { status: 400 });
    }

    // Check level requirement
    if (action.minLevel && character.level < action.minLevel) {
      return NextResponse.json({ error: 'Level too low' }, { status: 400 });
    }

    // Check attribute requirements
    if (action.requiredAttributes) {
      const unmet = action.requiredAttributes.find(
        (req) => (attributesMap[req.attributeId] || 0) < req.minValue
      );
      if (unmet) {
        return NextResponse.json(
          { error: `Requires ${unmet.attributeId} ${unmet.minValue}` },
          { status: 400 }
        );
      }
    }

    // Check power requirements
    if (action.requiredPowers?.length) {
      const hasPower = action.requiredPowers.some((p) => powersList.includes(p));
      if (!hasPower) {
        return NextResponse.json({ error: 'Missing required power' }, { status: 400 });
      }
    }

    // Apply action effects
    const effects = applyActionEffects(action, {}, attributesMap);

    // Build faction reputation map
    const factionReputations: Record<string, number> = {};
    for (const rep of character.factionReputations) {
      factionReputations[rep.factionId] = rep.reputation;
    }

    // Calculate cascading reputation changes
    const allReputationChanges: Record<string, number> = {};
    for (const [factionId, change] of Object.entries(effects.reputationChanges)) {
      const faction = getFactionById(factionId);
      if (!faction) continue;

      const cascadeChanges = calculateReputationImpact(faction, change, factionReputations);
      for (const [cascadeFactionId, cascadeChange] of Object.entries(cascadeChanges)) {
        allReputationChanges[cascadeFactionId] =
          (allReputationChanges[cascadeFactionId] || 0) + cascadeChange;
      }
    }

    // Check for encounter
    const encounterTriggered = rollForEncounter(action);
    let encounter: EncounterTemplate | null = null;
    let isCachedEncounter = false;
    let cachedEncounterId: string | null = null;

    if (encounterTriggered) {
      const encounterType = selectEncounterType(action);
      const difficulty = getEncounterDifficulty(action);
      const involvedFactions = action.likelyFactions;
      const location = action.locationTypes[0];

      // 1) Try cache first
      encounter = await findCachedEncounter(encounterType, difficulty, involvedFactions, location);

      if (encounter) {
        console.log('[Encounter] Using cached encounter:', encounter.id);
        isCachedEncounter = true;
        cachedEncounterId = encounter.id;
      }

      // 2) Generate with AI if no cache hit
      if (!encounter) {
        console.log('[Encounter] Generating with AI...');

        // IMPORTANT: Lazy import to prevent build-time evaluation crashes on Vercel
        const { generateEncounterForAction, toEncounterTemplate } = await import(
          '@/app/lib/ai/encounter-generator'
        );

        const aiEncounter = await generateEncounterForAction(
          character,
          actionId,
          encounterType,
          difficulty,
          involvedFactions,
          location
        );

        if (aiEncounter) {
          encounter = toEncounterTemplate(aiEncounter);

          // Cache the successful generation
          cachedEncounterId = await cacheEncounter(encounter, involvedFactions, location);
          if (cachedEncounterId) {
            isCachedEncounter = true;
            // Update encounter ID to use cached ID for resolution
            encounter = { ...encounter, id: cachedEncounterId };
          }

          console.log('[Encounter] AI generated and cached:', encounter.id);
        }
      }

      // 3) Fallback to templates if AI failed
      if (!encounter) {
        console.log('[Encounter] Falling back to templates...');
        const availableEncounters = getAvailableEncounters(
          encounterType,
          difficulty,
          character.level,
          attributesMap.reputation || 0,
          attributesMap.notoriety || 0,
          involvedFactions,
          location
        );
        encounter = selectRandomEncounter(availableEncounters);
      }
    }

    // Calculate new energy (handle rest which restores energy)
    const newEnergy = Math.max(
      0,
      Math.min(character.maxEnergy, character.currentEnergy - energyCost)
    );

    // Calculate XP and check for level up
    const xpGained = action.baseXPReward;
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
    const result = await prisma.$transaction(async (tx) => {
      // Update character stats including XP
      await tx.character.update({
        where: { id: character.id },
        data: {
          currentEnergy: newEnergy,
          currentXp: newXp,
          level: newLevel,
          maxHp: leveledUp ? character.maxHp + 10 : character.maxHp,
          maxEnergy: leveledUp ? character.maxEnergy + 5 : character.maxEnergy,
          money: character.money + action.baseMoneyReward,
        },
      });

      // Update attributes
      for (const [attrId, growth] of Object.entries(effects.attributeGrowth)) {
        await tx.characterAttribute.updateMany({
          where: {
            characterId: character.id,
            attributeId: attrId,
          },
          data: {
            currentValue: {
              increment: growth,
            },
          },
        });
      }

      // Update faction reputations
      for (const [factionId, change] of Object.entries(allReputationChanges)) {
        await tx.factionReputation.updateMany({
          where: {
            characterId: character.id,
            factionId,
          },
          data: {
            reputation: {
              increment: change,
            },
          },
        });
      }

      // Set cooldown if applicable
      const cooldownExpiry = getCooldownExpiry(action, new Date());
      if (cooldownExpiry) {
        await tx.actionCooldown.upsert({
          where: {
            characterId_actionId: {
              characterId: character.id,
              actionId,
            },
          },
          create: {
            characterId: character.id,
            actionId,
            expiresAt: cooldownExpiry,
          },
          update: {
            expiresAt: cooldownExpiry,
          },
        });
      }

      // Create story event if no encounter (encounters create their own events)
      if (!encounter) {
        await tx.storyEvent.create({
          data: {
            characterId: character.id,
            eventType: 'action',
            summary: `Performed ${action.name}`,
            narrativeWeight: 3,
            tags: [action.category, actionId],
          },
        });
      }

      // Create level up event if applicable
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

      return {
        energySpent: energyCost,
        newEnergy,
        xpGained,
        newXp,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        reputationChanges: allReputationChanges,
        attributeGrowth: effects.attributeGrowth,
        moneyGained: action.baseMoneyReward,
        encounterTriggered: !!encounter,
        encounter,
        isCachedEncounter,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Action execution error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
