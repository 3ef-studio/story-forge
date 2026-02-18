import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  buildAttributeMap,
  buildFactionMap,
  buildCooldownMap,
} from '@/app/lib/utils/character-utils';
import { getActiveThreadForDisplay } from '@/app/lib/game-logic/thread-manager';
import { computeEnergyRegen } from '@/app/lib/game-logic/energy-regen';
import { generateRivalForCharacter } from '@/app/lib/game-logic/rival-generator';
import { PERSONALITY_LABELS, PERSONALITY_DESCRIPTIONS, type RivalPersonality } from '@/app/data/rivals';
import { parsePendingFollowUps } from '@/app/lib/game-logic/follow-up-actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      include: {
        attributes: true,
        powers: true,
        factionReputations: true,
        inventoryItems: true,
        storyEvents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        actionCooldowns: {
          where: {
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    // Apply lazy energy regeneration (catch-up ticks)
    const regenResult = computeEnergyRegen({
      currentEnergy: character.currentEnergy,
      maxEnergy: character.maxEnergy,
      lastEnergyRegenAt: character.lastEnergyRegenAt,
    });

    if (regenResult.changed) {
      await prisma.character.update({
        where: { id: character.id },
        data: {
          currentEnergy: regenResult.newEnergy,
          lastEnergyRegenAt: regenResult.newLastEnergyRegenAt,
        },
      });
    }

    // Transform data for client using utility functions
    const attributesMap = buildAttributeMap(character.attributes);

    const powersMap = character.powers.map((power) => ({
      powerId: power.powerId,
      level: power.currentLevel,
      xp: power.currentXp,
      timesUsed: power.timesUsed,
    }));

    const factionsMap = buildFactionMap(character.factionReputations);
    const cooldownsMap = buildCooldownMap(character.actionCooldowns);

    // Get active consequence thread
    const activeThread = await getActiveThreadForDisplay(character.id);

    // Fetch or backfill rival (level 5+)
    let rival = await prisma.rival.findUnique({
      where: { characterId: character.id },
    });

    if (!rival && character.level >= 5) {
      // Backfill: create rival for existing characters who reached level 5
      const rivalInput = generateRivalForCharacter({
        characterId: character.id,
        characterLevel: character.level,
        attributes: attributesMap,
        powers: character.powers.map((p) => ({
          powerId: p.powerId,
          currentLevel: p.currentLevel,
          currentXp: p.currentXp,
          timesUsed: p.timesUsed,
        })),
        factionReputations: factionsMap,
      });

      rival = await prisma.rival.create({
        data: {
          characterId: rivalInput.characterId,
          name: rivalInput.name,
          role: rivalInput.role,
          personality: rivalInput.personality,
          level: rivalInput.level,
          attributes: rivalInput.attributes,
          powers: JSON.parse(JSON.stringify(rivalInput.powers)),
          hostility: rivalInput.hostility,
          notoriety: rivalInput.notoriety,
        },
      });
    }

    // Transform rival for client
    const rivalData = rival
      ? {
          id: rival.id,
          name: rival.name,
          role: rival.role,
          personality: rival.personality,
          personalityLabel: PERSONALITY_LABELS[rival.personality as RivalPersonality] ?? rival.personality,
          personalityDescription: PERSONALITY_DESCRIPTIONS[rival.personality as RivalPersonality] ?? '',
          level: rival.level,
          hostility: rival.hostility,
          notoriety: rival.notoriety,
          lastEncounterAt: rival.lastEncounterAt?.toISOString() ?? null,
        }
      : null;

    return NextResponse.json({
      character: {
        id: character.id,
        name: character.name,
        originId: character.originId,
        characterType: character.characterType,
        level: character.level,
        currentXp: character.currentXp,
        xpToNextLevel: character.level * 100,
        currentHp: character.currentHp,
        maxHp: character.maxHp,
        currentEnergy: regenResult.newEnergy,
        maxEnergy: character.maxEnergy,
        money: character.money,
        pendingLevelUpAttributePick: character.pendingLevelUpAttributePick,
        currentDistrict: character.currentDistrict,
        nextEnergyRegenAt: regenResult.nextEnergyRegenAt,
        energyRegenTickAmount: regenResult.tickAmount,
        attributes: attributesMap,
        powers: powersMap,
        factions: factionsMap,
        cooldowns: cooldownsMap,
        inventory: character.inventoryItems,
        storyEvents: character.storyEvents.map((event) => ({
          id: event.id,
          type: event.eventType,
          summary: event.summary,
          fullDescription: event.fullDescription,
          weight: event.narrativeWeight,
          tags: event.tags,
          createdAt: event.createdAt.toISOString(),
        })),
        activeThread,
        rival: rivalData,
        leverage: {
          control: character.leverageControl,
          stability: character.leverageStability,
          position: character.leveragePosition,
        },
        heat: character.heat ?? 0,
        actionCounter: character.actionCounter,
        followUps: parsePendingFollowUps(character.pendingFollowUps),
        factionId: character.factionId,
        intentScore: character.intentScore ?? 0,
        // Deity/Alignment system (MVP)
        patronDeityId: character.patronDeityId,
        alignmentValue: character.alignmentValue,
      },
    });
  } catch (error) {
    console.error('Get character error:', error);
    return NextResponse.json(
      { error: 'Failed to load character' },
      { status: 500 }
    );
  }
}
