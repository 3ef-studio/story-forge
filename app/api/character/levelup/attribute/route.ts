import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { getAttributeById } from '@/app/data/attributes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Attribute increase amount on level up
const LEVEL_UP_ATTRIBUTE_BONUS = 2;

// Attributes that cannot be chosen for level-up bonuses
const EXCLUDED_ATTRIBUTES = ['reputation', 'notoriety'];

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { attributeId } = body;

    // Validate attributeId
    if (!attributeId || typeof attributeId !== 'string') {
      return NextResponse.json(
        { error: 'Attribute must be selected' },
        { status: 400 }
      );
    }

    const attribute = getAttributeById(attributeId);
    if (!attribute) {
      return NextResponse.json(
        { error: 'Invalid attribute selected' },
        { status: 400 }
      );
    }

    if (EXCLUDED_ATTRIBUTES.includes(attributeId)) {
      return NextResponse.json(
        { error: 'This attribute cannot be improved through level-up' },
        { status: 400 }
      );
    }

    // Get character
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      include: { attributes: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Check if character has a pending level-up attribute pick
    if (!character.pendingLevelUpAttributePick) {
      return NextResponse.json(
        { error: 'No pending level-up attribute choice' },
        { status: 400 }
      );
    }

    // Find the attribute to update
    const charAttribute = character.attributes.find(
      (a) => a.attributeId === attributeId
    );

    if (!charAttribute) {
      return NextResponse.json(
        { error: 'Character attribute not found' },
        { status: 400 }
      );
    }

    // Apply the attribute increase and clear the pending flag
    await prisma.$transaction([
      prisma.characterAttribute.update({
        where: { id: charAttribute.id },
        data: { currentValue: { increment: LEVEL_UP_ATTRIBUTE_BONUS } },
      }),
      prisma.character.update({
        where: { id: character.id },
        data: { pendingLevelUpAttributePick: false },
      }),
    ]);

    // Get updated attributes
    const updatedAttributes = await prisma.characterAttribute.findMany({
      where: { characterId: character.id },
    });

    const attributesMap: Record<string, number> = {};
    for (const attr of updatedAttributes) {
      attributesMap[attr.attributeId] = attr.currentValue;
    }

    return NextResponse.json({
      success: true,
      attributeId,
      newValue: charAttribute.currentValue + LEVEL_UP_ATTRIBUTE_BONUS,
      bonus: LEVEL_UP_ATTRIBUTE_BONUS,
      attributes: attributesMap,
    });
  } catch (error) {
    console.error('Level-up attribute error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
