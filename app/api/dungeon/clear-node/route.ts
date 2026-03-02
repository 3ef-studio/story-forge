/**
 * POST /api/dungeon/clear-node
 *
 * Mark a dungeon node as cleared after resolving an encounter.
 * - Updates session clearedNodeIds
 * - Called after combat/trap/event resolution
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  DUNGEON_ENABLED,
  getActiveSession,
  markNodeCleared,
  buildMinimapDTO,
  checkCompletion,
} from '@/app/lib/dungeon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ClearNodeRequestBody {
  nodeId: string;
}

interface ClearNodeResponse {
  success: boolean;
  isComplete?: boolean;
  minimap?: {
    floorId: string;
    districtId: string;
    depth: number;
    width: number;
    height: number;
    currentNodeId: string;
    nodes: Array<unknown>;
    edges: Array<unknown>;
    sessionState: string;
  };
  error?: string;
}

function isClearNodeRequestBody(value: unknown): value is ClearNodeRequestBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.nodeId === 'string' && v.nodeId.length > 0;
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

    if (!isClearNodeRequestBody(rawBody)) {
      return NextResponse.json(
        { error: 'Missing or invalid nodeId' },
        { status: 400 }
      );
    }

    const { nodeId } = rawBody;

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

    // Mark node as cleared
    await markNodeCleared(activeSession.id, nodeId);

    // Check if dungeon is now complete (boss cleared)
    const isComplete = await checkCompletion(activeSession.id);

    // Get updated minimap
    const minimap = await buildMinimapDTO(activeSession.id);

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Dungeon] Node cleared: session=${activeSession.id} node=${nodeId} ` +
        `complete=${isComplete}`
      );
    }

    return NextResponse.json({
      success: true,
      isComplete,
      minimap: minimap ?? undefined,
    } as ClearNodeResponse);
  } catch (error) {
    console.error('Dungeon clear-node error:', error);
    return NextResponse.json(
      { error: 'An error occurred clearing the node' },
      { status: 500 }
    );
  }
}
