/**
 * POST /api/dungeon/complete
 *
 * Complete the dungeon after defeating the boss.
 * - Validates boss is cleared
 * - Grants XP and gold rewards
 * - Updates session state to COMPLETED
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  DUNGEON_ENABLED,
  getActiveSession,
  checkCompletion,
  completeDungeon,
} from '@/app/lib/dungeon';
import type { DungeonCompletionResult } from '@/app/lib/dungeon/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
        { error: 'No active dungeon session' },
        { status: 400 }
      );
    }

    // Check if dungeon can be completed (boss defeated)
    const canComplete = await checkCompletion(activeSession.id);

    if (!canComplete) {
      return NextResponse.json(
        { error: 'Dungeon cannot be completed - defeat the boss first' },
        { status: 400 }
      );
    }

    // Complete dungeon and grant rewards
    const result = await completeDungeon(activeSession.id, character.id);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to complete dungeon' },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Dungeon] Completed: character=${character.id} ` +
        `depth=${activeSession.floor.depth} ` +
        `xp=${result.xpReward} gold=${result.goldReward}`
      );
    }

    return NextResponse.json({
      success: true,
      xpReward: result.xpReward,
      goldReward: result.goldReward,
      factionImpact: result.factionImpact,
    } as DungeonCompletionResult);
  } catch (error) {
    console.error('Dungeon complete error:', error);
    return NextResponse.json(
      { error: 'An error occurred completing the dungeon' },
      { status: 500 }
    );
  }
}
