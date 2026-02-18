import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { getOriginById, initializeCharacterFromOrigin, getDeityById, type DeityId } from '@/app/data/new-origins';
import { factions } from '@/app/data/factions';
import { attributes } from '@/app/data/attributes';
import { initializeGoalsForNewCharacter } from '@/app/lib/game-logic/goal-manager';
import { getStarterPowers, getPowerById } from '@/app/data/powers';
import { getArchetypeById } from '@/app/data/archetypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const { name, originId, extraPowerId, archetypeId, deityId } = body;

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

    // Validate deity if required
    let validatedDeityId: DeityId | null = null;
    if (origin.requiresDeitySelection) {
      if (!deityId) {
        return NextResponse.json(
          { error: 'This origin requires a patron deity selection' },
          { status: 400 }
        );
      }
      const deity = getDeityById(deityId);
      if (!deity) {
        return NextResponse.json(
          { error: 'Invalid deity selected' },
          { status: 400 }
        );
      }
      // Verify deity is available for this origin
      if (!origin.deityOptions?.includes(deityId)) {
        return NextResponse.json(
          { error: 'Selected deity is not available for this origin' },
          { status: 400 }
        );
      }
      validatedDeityId = deityId;
    }

    // Validate extra power
    if (!extraPowerId) {
      return NextResponse.json(
        { error: 'Extra power must be selected' },
        { status: 400 }
      );
    }

    const extraPower = getPowerById(extraPowerId);
    if (!extraPower) {
      return NextResponse.json(
        { error: 'Invalid extra power selected' },
        { status: 400 }
      );
    }

    // Ensure extra power is a starter power and not already granted by origin
    const starterPowerIds = getStarterPowers().map((p) => p.id);
    if (!starterPowerIds.includes(extraPowerId)) {
      return NextResponse.json(
        { error: 'Selected power is not available as a starter power' },
        { status: 400 }
      );
    }

    if (origin.startingPowers.includes(extraPowerId)) {
      return NextResponse.json(
        { error: 'Selected power is already granted by your origin' },
        { status: 400 }
      );
    }

    // Validate archetype
    if (!archetypeId) {
      return NextResponse.json(
        { error: 'Character archetype must be selected' },
        { status: 400 }
      );
    }

    const archetype = getArchetypeById(archetypeId);
    if (!archetype) {
      return NextResponse.json(
        { error: 'Invalid archetype selected' },
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

    // Initialize character data from origin (with deity support)
    const characterData = initializeCharacterFromOrigin(origin, name, validatedDeityId ?? undefined);

    // Combine origin powers with extra power (dedupe)
    const allPowerIds = [...new Set([...characterData.powers, extraPowerId])];

    // Create character and all related data in a transaction
    const character = await prisma.$transaction(async (tx) => {
      // Create the character with deity/alignment support
      const newCharacter = await tx.character.create({
        data: {
          userId: session.user.id,
          name: characterData.name,
          originId: characterData.originId,
          characterType: archetypeId,
          level: 1,
          currentXp: 0,
          currentHp: 100,
          maxHp: 100,
          currentEnergy: 100,
          maxEnergy: 100,
          money: 0,
          // Deity/Alignment fields
          patronDeityId: characterData.patronDeityId,
          alignmentValue: characterData.alignmentValue,
        },
      });

      // Create character attributes with archetype bonuses applied
      const attributeRecords = attributes.map((attr) => {
        const baseValue = characterData.attributes[attr.id] || attr.baseValue;
        const archetypeBonus = archetype.attributeBonuses[attr.id] || 0;
        return {
          characterId: newCharacter.id,
          attributeId: attr.id,
          currentValue: baseValue + archetypeBonus,
        };
      });

      await tx.characterAttribute.createMany({
        data: attributeRecords,
      });

      // Create character powers (origin powers + extra power)
      if (allPowerIds.length > 0) {
        const powerRecords = allPowerIds.map((powerId) => ({
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

    // Initialize starting goals for the character (pass power IDs for validation)
    await initializeGoalsForNewCharacter(character.id, originId, allPowerIds);

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
