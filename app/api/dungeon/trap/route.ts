/**
 * POST /api/dungeon/trap
 *
 * Resolve a trap encounter. Possible actions:
 *   - "trigger"  → trap fires; apply HP damage and mark node cleared
 *   - "disarm"   → roll avg(INT,AGI) vs difficulty; success clears node, failure triggers damage
 *   - "retreat"  → move character back to previous node; trap node stays uncleared
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  DUNGEON_ENABLED,
  getActiveSession,
  buildMinimapDTO,
  triggerTrap,
  disarmTrap,
  retreatFromTrap,
  failDungeon,
} from '@/app/lib/dungeon';
import type { TrapDifficulty, TrapActionResult } from '@/app/lib/dungeon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TrapAction = 'trigger' | 'disarm' | 'retreat';

interface TrapRequestBody {
  action: TrapAction;
  nodeId?: string;            // required for trigger / disarm
  difficulty?: TrapDifficulty; // required for trigger / disarm
  previousNodeId?: string;    // required for retreat
}

function isValidBody(value: unknown): value is TrapRequestBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!['trigger', 'disarm', 'retreat'].includes(v.action as string)) return false;
  return true;
}

export interface TrapResponse {
  success: boolean;
  error?: string;
  result?: TrapActionResult;
  dungeonFailed?: boolean;
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

    if (!isValidBody(rawBody)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { action, nodeId, difficulty, previousNodeId } = rawBody;

    // Get character with attributes (needed for disarm)
    const character = await prisma.character.findUnique({
      where: { userId: authSession.user.id },
      include: { attributes: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Get active session with floor data (needed for retreat validation)
    const activeSession = await getActiveSession(character.id);
    if (!activeSession) {
      return NextResponse.json({ error: 'No active dungeon session' }, { status: 400 });
    }

    let result: TrapActionResult;

    if (action === 'retreat') {
      if (!previousNodeId || typeof previousNodeId !== 'string') {
        return NextResponse.json({ error: 'previousNodeId required for retreat' }, { status: 400 });
      }

      // Validate previousNodeId is a real, adjacent node in the floor.
      // Prevents clients from teleporting to arbitrary nodes.
      const floor = activeSession.floor;
      const nodeExistsInFloor = floor.nodes.some((n) => n.id === previousNodeId);
      if (!nodeExistsInFloor) {
        return NextResponse.json({ error: 'Invalid previousNodeId: node not in this floor' }, { status: 400 });
      }

      const isAdjacent = floor.edges.some(
        (e) =>
          (e.fromNodeId === activeSession.currentNodeId && e.toNodeId === previousNodeId) ||
          (e.toNodeId === activeSession.currentNodeId && e.fromNodeId === previousNodeId)
      );
      if (!isAdjacent) {
        return NextResponse.json({ error: 'Invalid previousNodeId: not adjacent to current node' }, { status: 400 });
      }

      result = await retreatFromTrap(activeSession.id, previousNodeId);

    } else {
      // trigger or disarm require nodeId and difficulty
      if (!nodeId || typeof nodeId !== 'string') {
        return NextResponse.json({ error: 'nodeId required' }, { status: 400 });
      }
      if (!difficulty || !(['EASY', 'NORMAL', 'HARD'] as string[]).includes(difficulty)) {
        return NextResponse.json({ error: 'Valid difficulty required (EASY/NORMAL/HARD)' }, { status: 400 });
      }

      if (action === 'trigger') {
        result = await triggerTrap(character.id, activeSession.id, nodeId, difficulty);
      } else {
        // disarm — resolve attributes server-side, never trust the client
        const attributeMap: Record<string, number> = {};
        for (const attr of character.attributes) {
          attributeMap[attr.attributeId] = attr.currentValue;
        }
        const intelligence = attributeMap.intelligence ?? attributeMap.perception ?? 50;
        const agility = attributeMap.agility ?? attributeMap.dexterity ?? 50;

        result = await disarmTrap(character.id, activeSession.id, nodeId, difficulty, intelligence, agility);
      }
    }

    // If damage brought HP to 0, fail the dungeon session
    let dungeonFailed = false;
    if (result.characterDied) {
      await failDungeon(activeSession.id);
      dungeonFailed = true;
    }

    // Build updated minimap (will be null if session was just failed, that's ok)
    const minimap = dungeonFailed ? undefined : await buildMinimapDTO(activeSession.id);

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Dungeon] Trap: character=${character.id} action=${action} ` +
        `difficulty=${difficulty ?? 'n/a'} dungeonFailed=${dungeonFailed} result=${JSON.stringify(result)}`
      );
    }

    return NextResponse.json({
      success: true,
      result,
      dungeonFailed,
      minimap,
    } as TrapResponse);

  } catch (error) {
    console.error('Dungeon trap error:', error);
    return NextResponse.json({ error: 'An error occurred resolving the trap' }, { status: 500 });
  }
}
