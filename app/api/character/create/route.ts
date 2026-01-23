import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { getOriginById, initializeCharacterFromOrigin } from '@/app/data/origins';
import { factions } from '@/app/data/factions';
import { attributes } from '@/app/data/attributes';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, originId } = body;

    // Validation
    if (!name || name.length < 3 || name.length > 30) {
      return NextResponse.json(
        { error: 'Name must be between 3 and 30 characters' },
        { status: 400 }
      );
    }

    if (!originId) {
      return NextResponse.json(
        { error: 'Origin must be selected' },
        { status: 400 }
      );
    }

    const origin = getOriginById(originId);
    if (!origin) {
      return NextResponse.json(
        { error: 'Invalid origin selected' },
        { status: 400 }
      );
    }

    // Check if user already has a character
    const existingCharacter = await prisma.character.findUnique({
      where: { userId: session.user.id },
    });

    if (existingCharacter) {
      return NextResponse.json(
        { error: 'You already have a character' },
        { status: 400 }
      );
    }

    // Initialize character data from origin
    const characterData = initializeCharacterFromOrigin(origin, name);

    // Create character and all related data in a transaction
    const character = await prisma.$transaction(async (tx) => {
      // Create the character
      const newCharacter = await tx.character.create({
        data: {
          userId: session.user.id,
          name: characterData.name,
          originId: characterData.originId,
          level: 1,
          currentXp: 0,
          currentHp: 100,
          maxHp: 100,
          currentEnergy: 100,
          maxEnergy: 100,
          money: 0,
        },
      });

      // Create character attributes
      const attributeRecords = attributes.map((attr) => ({
        characterId: newCharacter.id,
        attributeId: attr.id,
        currentValue: characterData.attributes[attr.id] || attr.baseValue,
      }));

      await tx.characterAttribute.createMany({
        data: attributeRecords,
      });

      // Create character powers
      if (characterData.powers.length > 0) {
        const powerRecords = characterData.powers.map((powerId) => ({
          characterId: newCharacter.id,
          powerId,
          currentLevel: 1,
          currentXp: 0,
          timesUsed: 0,
        }));

        await tx.characterPower.createMany({
          data: powerRecords,
        });
      }

      // Create faction reputations (all factions with starting values)
      const factionRecords = factions.map((faction) => ({
        characterId: newCharacter.id,
        factionId: faction.id,
        reputation: characterData.factionReputations[faction.id] ?? faction.startingReputation,
      }));

      await tx.factionReputation.createMany({
        data: factionRecords,
      });

      // Create initial story event
      await tx.storyEvent.create({
        data: {
          characterId: newCharacter.id,
          eventType: 'origin',
          summary: `${name} emerged as a powered individual with the origin: ${origin.name}`,
          fullDescription: origin.backstory,
          narrativeWeight: 10,
          tags: ['origin', ...origin.narrativeTags],
        },
      });

      return newCharacter;
    });

    return NextResponse.json(
      {
        message: 'Character created successfully',
        characterId: character.id,
        name: character.name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Character creation error:', error);
    return NextResponse.json(
      { error: 'An error occurred during character creation' },
      { status: 500 }
    );
  }
}
