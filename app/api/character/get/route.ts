import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  buildAttributeMap,
  buildFactionMap,
  buildCooldownMap,
  shouldRestoreEnergy,
} from '@/app/lib/utils/character-utils';

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

    // Check if energy needs restoration (read-only check)
    // Actual reset happens during action execution (POST) to keep GET idempotent
    const energyNeedsReset = shouldRestoreEnergy(character.lastEnergyReset);

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

    return NextResponse.json({
      character: {
        id: character.id,
        name: character.name,
        originId: character.originId,
        level: character.level,
        currentXp: character.currentXp,
        xpToNextLevel: character.level * 100,
        currentHp: character.currentHp,
        maxHp: character.maxHp,
        currentEnergy: character.currentEnergy,
        maxEnergy: character.maxEnergy,
        money: character.money,
        lastEnergyReset: character.lastEnergyReset.toISOString(),
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
      },
      energyNeedsReset,
    });
  } catch (error) {
    console.error('Get character error:', error);
    return NextResponse.json(
      { error: 'Failed to load character' },
      { status: 500 }
    );
  }
}
