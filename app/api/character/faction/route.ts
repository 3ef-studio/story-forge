/**
 * API Route: Character Faction Membership
 *
 * POST /api/character/faction - Join a faction
 * DELETE /api/character/faction - Leave current faction
 */

import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { controllableFactions } from '@/app/data/factions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Valid faction IDs that can be joined
const JOINABLE_FACTION_IDS = new Set(controllableFactions.map(f => f.id));

/**
 * POST: Join a faction
 * Body: { factionId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { factionId } = body;

    if (!factionId || typeof factionId !== 'string') {
      return NextResponse.json(
        { error: 'factionId is required' },
        { status: 400 }
      );
    }

    // Validate faction is joinable
    if (!JOINABLE_FACTION_IDS.has(factionId)) {
      return NextResponse.json(
        { error: 'Invalid faction. Only controllable factions can be joined.' },
        { status: 400 }
      );
    }

    // Get character
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      select: { id: true, factionId: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Check if already in a faction
    if (character.factionId) {
      return NextResponse.json(
        { error: 'Already a member of a faction. Leave your current faction first.' },
        { status: 400 }
      );
    }

    // Join the faction
    await prisma.character.update({
      where: { id: character.id },
      data: { factionId },
    });

    // Get faction details for response
    const faction = controllableFactions.find(f => f.id === factionId);

    return NextResponse.json({
      success: true,
      factionId,
      factionName: faction?.name ?? factionId,
      message: `Joined ${faction?.name ?? factionId}`,
    });
  } catch (error) {
    console.error('[Faction API] Join error:', error);
    return NextResponse.json(
      { error: 'Failed to join faction' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Leave current faction
 */
export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get character
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      select: { id: true, factionId: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Check if in a faction
    if (!character.factionId) {
      return NextResponse.json(
        { error: 'Not a member of any faction' },
        { status: 400 }
      );
    }

    const previousFactionId = character.factionId;
    const previousFaction = controllableFactions.find(f => f.id === previousFactionId);

    // Leave the faction
    await prisma.character.update({
      where: { id: character.id },
      data: { factionId: null },
    });

    return NextResponse.json({
      success: true,
      previousFactionId,
      message: `Left ${previousFaction?.name ?? previousFactionId}`,
    });
  } catch (error) {
    console.error('[Faction API] Leave error:', error);
    return NextResponse.json(
      { error: 'Failed to leave faction' },
      { status: 500 }
    );
  }
}
