/**
 * POST /api/dungeon/enter
 *
 * Enter or resume a dungeon in a district.
 * - Checks for existing active session
 * - Creates new session if none exists
 * - Returns session info and minimap DTO
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { DUNGEON_ENABLED, enterDungeon } from '@/app/lib/dungeon';
import type { EnterDungeonResponse } from '@/app/lib/dungeon/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EnterRequestBody {
  districtId: string;
}

function isEnterRequestBody(value: unknown): value is EnterRequestBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.districtId === 'string' && v.districtId.length > 0;
}

export async function POST(request: Request) {
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

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!isEnterRequestBody(rawBody)) {
      return NextResponse.json(
        { error: 'Missing or invalid districtId' },
        { status: 400 }
      );
    }

    const { districtId } = rawBody;

    // Get character
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Enter or resume dungeon
    const result = await enterDungeon(character.id, districtId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error } as EnterDungeonResponse,
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Dungeon] Entered: character=${character.id} district=${districtId} ` +
        `session=${result.session?.id} depth=${result.session?.depth}`
      );
    }

    return NextResponse.json(result as EnterDungeonResponse);
  } catch (error) {
    console.error('Dungeon enter error:', error);
    return NextResponse.json(
      { error: 'An error occurred entering the dungeon' },
      { status: 500 }
    );
  }
}
