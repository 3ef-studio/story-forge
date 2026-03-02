/**
 * POST /api/dungeon/move
 *
 * Move to a connected node in the dungeon.
 * - Validates movement is allowed
 * - Auto-traverses corridors
 * - Discovers adjacent nodes
 * - Triggers encounters
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  DUNGEON_ENABLED,
  dungeonMove,
  getActiveSession,
  buildMinimapDTO,
} from '@/app/lib/dungeon';
import type { DungeonMoveResponse } from '@/app/lib/dungeon/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MoveRequestBody {
  targetNodeId: string;
}

function isMoveRequestBody(value: unknown): value is MoveRequestBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.targetNodeId === 'string' && v.targetNodeId.length > 0;
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

    if (!isMoveRequestBody(rawBody)) {
      return NextResponse.json(
        { error: 'Missing or invalid targetNodeId' },
        { status: 400 }
      );
    }

    const { targetNodeId } = rawBody;

    // Get character
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Execute movement
    const moveResult = await dungeonMove(character.id, targetNodeId);

    if (!moveResult.success) {
      return NextResponse.json({
        success: false,
        error: moveResult.error,
      } as DungeonMoveResponse);
    }

    // Get updated minimap
    const activeSession = await getActiveSession(character.id);
    const minimap = activeSession
      ? await buildMinimapDTO(activeSession.id)
      : null;

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Dungeon] Move: character=${character.id} to=${moveResult.newNodeId} ` +
        `encounter=${moveResult.encounter?.type ?? 'none'}`
      );
    }

    return NextResponse.json({
      success: true,
      move: moveResult,
      minimap: minimap ?? undefined,
    } as DungeonMoveResponse);
  } catch (error) {
    console.error('Dungeon move error:', error);
    return NextResponse.json(
      { error: 'An error occurred during movement' },
      { status: 500 }
    );
  }
}
