/**
 * POST /api/dungeon/abandon
 *
 * Abandon the current dungeon session.
 * - Sets session state to FAILED
 * - No rewards granted
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  DUNGEON_ENABLED,
  getActiveSession,
  abandonDungeon,
} from '@/app/lib/dungeon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AbandonResponse {
  success: boolean;
  error?: string;
}

export async function POST() {
  try {
    // Check feature flag
    if (!DUNGEON_ENABLED) {
      return NextResponse.json(
        { error: 'Dungeon system is not enabled' },
        { status: 403 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get character
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Get active session
    const activeSession = await getActiveSession(character.id);

    if (!activeSession) {
      return NextResponse.json(
        { error: 'No active dungeon session to abandon' },
        { status: 400 }
      );
    }

    // Abandon the dungeon
    await abandonDungeon(activeSession.id);

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Dungeon] Abandoned: character=${character.id} ` +
        `session=${activeSession.id} depth=${activeSession.floor.depth}`
      );
    }

    return NextResponse.json({
      success: true,
    } as AbandonResponse);
  } catch (error) {
    console.error('Dungeon abandon error:', error);
    return NextResponse.json(
      { error: 'An error occurred abandoning the dungeon' },
      { status: 500 }
    );
  }
}
