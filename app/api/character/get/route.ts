import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';

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

    // Check and apply daily energy reset
    const now = new Date();
    const lastReset = new Date(character.lastEnergyReset);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    let energyRestored = false;
    if (hoursSinceReset >= 24) {
      await prisma.character.update({
        where: { id: character.id },
        data: {
          currentEnergy: character.maxEnergy,
          lastEnergyReset: now,
        },
      });
      character.currentEnergy = character.maxEnergy;
      character.lastEnergyReset = now;
      energyRestored = true;
    }

    // Transform data for client
    const attributesMap: Record<string, number> = {};
    character.attributes.forEach((attr) => {
      attributesMap[attr.attributeId] = attr.currentValue;
    });

    const powersMap = character.powers.map((power) => ({
      powerId: power.powerId,
      level: power.currentLevel,
      xp: power.currentXp,
      timesUsed: power.timesUsed,
    }));

    const factionsMap: Record<string, number> = {};
    character.factionReputations.forEach((rep) => {
      factionsMap[rep.factionId] = rep.reputation;
    });

    const cooldownsMap: Record<string, string> = {};
    character.actionCooldowns.forEach((cd) => {
      cooldownsMap[cd.actionId] = cd.expiresAt.toISOString();
    });

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
      energyRestored,
    });
  } catch (error) {
    console.error('Get character error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
