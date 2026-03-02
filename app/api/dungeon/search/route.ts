/**
 * POST /api/dungeon/search
 *
 * Search for secret passages in the current room.
 * - Uses DEX or INT for stat checks
 * - Discovers secret edges on success
 * - Returns updated minimap
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  DUNGEON_ENABLED,
  dungeonSearch,
  getActiveSession,
  buildMinimapDTO,
} from '@/app/lib/dungeon';
import type { DungeonSearchResponse } from '@/app/lib/dungeon/types';

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

    // Execute search
    const searchResult = await dungeonSearch(character.id);

    // Get updated minimap
    const activeSession = await getActiveSession(character.id);
    const minimap = activeSession
      ? await buildMinimapDTO(activeSession.id)
      : null;

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Dungeon] Search: character=${character.id} ` +
        `found=${searchResult.discovered ? 'yes' : 'no'} ` +
        `roll=${searchResult.rollResult ?? 'n/a'}`
      );
    }

    return NextResponse.json({
      success: true,
      search: searchResult,
      minimap: minimap ?? undefined,
    } as DungeonSearchResponse);
  } catch (error) {
    console.error('Dungeon search error:', error);
    return NextResponse.json(
      { error: 'An error occurred during search' },
      { status: 500 }
    );
  }
}
