/**
 * POST /api/dungeon/treasure
 *
 * Resolve a TREASURE node encounter.
 * - Calculates a gold reward that scales with floor depth and includes
 *   randomised variance (±20% around the base value).
 * - Credits the gold to the character.
 * - Marks the node as cleared.
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

// ============================================================
// Reward Formula
// ============================================================

const TREASURE_BASE_GOLD = 10;       // gold at depth 1 before variance
const TREASURE_GOLD_PER_DEPTH = 8;   // additional gold per depth level
const TREASURE_VARIANCE = 0.4;       // ±20% of base (0.8× … 1.2× multiplier)

/**
 * Calculate gold reward for a treasure node.
 * Formula: round((base + depth * perDepth) * uniform(0.8, 1.2))
 *
 * Depth 1:  14 – 22 gold
 * Depth 2:  21 – 31 gold
 * Depth 3:  27 – 41 gold
 * Depth 4:  34 – 50 gold
 * Depth 5:  40 – 60 gold
 */
function calculateTreasureGold(depth: number): number {
  const base = TREASURE_BASE_GOLD + TREASURE_GOLD_PER_DEPTH * depth;
  const low = 1 - TREASURE_VARIANCE / 2;
  const multiplier = low + Math.random() * TREASURE_VARIANCE;
  return Math.max(1, Math.round(base * multiplier));
}

// ============================================================
// Route
// ============================================================

export interface TreasureResponse {
  success: boolean;
  error?: string;
  goldReward?: number;
  isComplete?: boolean;
  minimap?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (!DUNGEON_ENABLED) {
      return NextResponse.json({ error: 'Dungeon system is not enabled' }, { status: 403 });
    }

    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (
      !rawBody ||
      typeof rawBody !== 'object' ||
      typeof (rawBody as Record<string, unknown>).nodeId !== 'string'
    ) {
      return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
    }

    const { nodeId } = rawBody as { nodeId: string };

    const character = await prisma.character.findUnique({
      where: { userId: authSession.user.id },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const activeSession = await getActiveSession(character.id);
    if (!activeSession) {
      return NextResponse.json({ error: 'No active dungeon session' }, { status: 400 });
    }

    const depth = activeSession.floor.depth;
    const goldReward = calculateTreasureGold(depth);

    // Grant gold and mark node cleared in parallel
    await Promise.all([
      prisma.character.update({
        where: { id: character.id },
        data: { money: { increment: goldReward } },
      }),
      markNodeCleared(activeSession.id, nodeId),
    ]);

    const [isComplete, minimap] = await Promise.all([
      checkCompletion(activeSession.id),
      buildMinimapDTO(activeSession.id),
    ]);

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Dungeon] Treasure: character=${character.id} depth=${depth} ` +
        `goldReward=${goldReward}`
      );
    }

    return NextResponse.json({
      success: true,
      goldReward,
      isComplete,
      minimap,
    } as TreasureResponse);
  } catch (error) {
    console.error('Dungeon treasure error:', error);
    return NextResponse.json(
      { error: 'An error occurred resolving the treasure' },
      { status: 500 }
    );
  }
}
