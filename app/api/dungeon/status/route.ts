/**
 * GET /api/dungeon/status
 *
 * Get the current dungeon session status and minimap.
 * - Returns active session info
 * - Returns minimap DTO for rendering
 * - Returns available moves
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  DUNGEON_ENABLED,
  getActiveSession,
  buildMinimapDTO,
  getAvailableMoves,
  hasAdjacentSecrets,
  checkCompletion,
} from '@/app/lib/dungeon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DungeonStatusResponse {
  success: boolean;
  hasActiveSession: boolean;
  session?: {
    id: string;
    districtId: string;
    floorId: string;
    depth: number;
    currentNodeId: string;
    state: string;
  };
  minimap?: {
    floorId: string;
    districtId: string;
    depth: number;
    width: number;
    height: number;
    currentNodeId: string;
    nodes: Array<{
      id: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      state: string;
      contentType: string | null;
      isBoss: boolean;
      label?: string;
      isCurrent: boolean;
    }>;
    edges: Array<{
      id: string;
      fromNodeId: string;
      toNodeId: string;
      type: string;
    }>;
    sessionState: string;
  };
  availableMoves?: Array<{
    nodeId: string;
    type: string;
    isSecret: boolean;
  }>;
  hasAdjacentSecrets?: boolean;
  isComplete?: boolean;
  error?: string;
}

export async function GET() {
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
      return NextResponse.json({
        success: true,
        hasActiveSession: false,
      } as DungeonStatusResponse);
    }

    // Build minimap
    const minimap = await buildMinimapDTO(activeSession.id);

    // Get available moves
    const moves = await getAvailableMoves(activeSession.id);

    // Check for adjacent secrets
    const hasSecrets = await hasAdjacentSecrets(activeSession.id);

    // Check if dungeon is complete
    const isComplete = await checkCompletion(activeSession.id);

    return NextResponse.json({
      success: true,
      hasActiveSession: true,
      session: {
        id: activeSession.id,
        districtId: activeSession.districtId,
        floorId: activeSession.floorId,
        depth: activeSession.floor.depth,
        currentNodeId: activeSession.currentNodeId,
        state: activeSession.state,
      },
      minimap: minimap ?? undefined,
      availableMoves: moves,
      hasAdjacentSecrets: hasSecrets,
      isComplete,
    } as DungeonStatusResponse);
  } catch (error) {
    console.error('Dungeon status error:', error);
    return NextResponse.json(
      { error: 'An error occurred getting dungeon status' },
      { status: 500 }
    );
  }
}
