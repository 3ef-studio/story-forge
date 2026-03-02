/**
 * Dungeon Session Management
 *
 * Handles session lifecycle:
 * - Creating new sessions
 * - Entering dungeons
 * - Completion and rewards
 */

import { prisma } from '@/app/lib/db';
import { generateDungeonFloor, getFloorWithRelations } from './generator';
import { buildMinimapDTO } from './minimap';
import type {
  EnterDungeonResponse,
  DungeonCompletionResult,
} from './types';

// ============================================================
// Constants
// ============================================================

const BASE_XP_REWARD = 50;
const BASE_GOLD_REWARD = 25;
const XP_PER_DEPTH = 25;
const GOLD_PER_DEPTH = 15;
const FACTION_CONTROL_DELTA = 2;

// ============================================================
// Session Lifecycle
// ============================================================

/**
 * Enter or resume a dungeon in a district
 */
export async function enterDungeon(
  characterId: string,
  districtId: string
): Promise<EnterDungeonResponse> {
  // Check for existing active session in this district
  const existingSession = await prisma.dungeonSession.findFirst({
    where: {
      characterId,
      districtId,
      state: 'ACTIVE',
    },
    include: {
      floor: true,
    },
  });

  if (existingSession) {
    // Resume existing session
    const minimap = await buildMinimapDTO(existingSession.id);
    return {
      success: true,
      session: {
        id: existingSession.id,
        districtId: existingSession.districtId,
        floorId: existingSession.floorId,
        depth: existingSession.floor.depth,
        currentNodeId: existingSession.currentNodeId,
        state: existingSession.state,
      },
      minimap: minimap ?? undefined,
    };
  }

  // Find the next depth to generate (or depth 1 if none)
  const lastCompletedSession = await prisma.dungeonSession.findFirst({
    where: {
      characterId,
      districtId,
      state: 'COMPLETED',
    },
    include: {
      floor: true,
    },
    orderBy: {
      floor: {
        depth: 'desc',
      },
    },
  });

  const nextDepth = lastCompletedSession
    ? lastCompletedSession.floor.depth + 1
    : 1;

  // Check if floor already exists for this depth
  let floorWithRelations = await prisma.dungeonFloor.findUnique({
    where: {
      districtId_depth: {
        districtId,
        depth: nextDepth,
      },
    },
    include: {
      nodes: true,
      edges: true,
    },
  });

  // Generate new floor if needed
  if (!floorWithRelations) {
    const newFloor = await generateDungeonFloor(districtId, nextDepth);
    floorWithRelations = await getFloorWithRelations(newFloor.id);

    if (!floorWithRelations) {
      return {
        success: false,
        error: 'Failed to generate dungeon floor',
      };
    }
  }

  const floor = floorWithRelations;

  // Find the STAIRS node (entrance)
  const stairsNode = floor.nodes.find((n) => n.type === 'STAIRS');
  if (!stairsNode) {
    return {
      success: false,
      error: 'Invalid dungeon floor - no entrance found',
    };
  }

  // Create new session
  const session = await prisma.dungeonSession.create({
    data: {
      characterId,
      districtId,
      floorId: floor.id,
      currentNodeId: stairsNode.id,
      discoveredNodeIds: [stairsNode.id],
      discoveredEdgeIds: [],
      clearedNodeIds: [],
      state: 'ACTIVE',
    },
  });

  // Discover adjacent nodes from entrance
  const adjacentEdges = floor.edges.filter(
    (e) =>
      (e.fromNodeId === stairsNode.id || e.toNodeId === stairsNode.id) &&
      e.type !== 'SECRET'
  );

  const adjacentNodeIds = adjacentEdges.map((e) =>
    e.fromNodeId === stairsNode.id ? e.toNodeId : e.fromNodeId
  );

  const edgeIds = adjacentEdges.map((e) => e.id);

  await prisma.dungeonSession.update({
    where: { id: session.id },
    data: {
      discoveredNodeIds: [stairsNode.id, ...adjacentNodeIds],
      discoveredEdgeIds: edgeIds,
    },
  });

  const minimap = await buildMinimapDTO(session.id);

  return {
    success: true,
    session: {
      id: session.id,
      districtId,
      floorId: floor.id,
      depth: floor.depth,
      currentNodeId: stairsNode.id,
      state: session.state,
    },
    minimap: minimap ?? undefined,
  };
}

/**
 * Check if dungeon is complete (boss cleared)
 */
export async function checkCompletion(
  sessionId: string
): Promise<boolean> {
  const session = await prisma.dungeonSession.findUnique({
    where: { id: sessionId },
    include: {
      floor: {
        include: {
          nodes: true,
        },
      },
    },
  });

  if (!session || session.state !== 'ACTIVE') {
    return false;
  }

  // Find boss node
  const bossNode = session.floor.nodes.find((n) => n.isBoss);
  if (!bossNode) {
    return false;
  }

  // Check if boss is cleared
  return session.clearedNodeIds.includes(bossNode.id);
}

/**
 * Complete the dungeon and grant rewards
 */
export async function completeDungeon(
  sessionId: string,
  characterId: string
): Promise<DungeonCompletionResult> {
  const session = await prisma.dungeonSession.findUnique({
    where: { id: sessionId },
    include: {
      floor: true,
    },
  });

  if (!session || session.characterId !== characterId) {
    return { success: false, xpReward: 0, goldReward: 0 };
  }

  const depth = session.floor.depth;
  const xpReward = BASE_XP_REWARD + XP_PER_DEPTH * depth;
  const goldReward = BASE_GOLD_REWARD + GOLD_PER_DEPTH * depth;

  // Mark session as completed and grant rewards
  await prisma.$transaction(async (tx) => {
    // Update session state
    await tx.dungeonSession.update({
      where: { id: sessionId },
      data: { state: 'COMPLETED' },
    });

    // Grant XP and gold
    await tx.character.update({
      where: { id: characterId },
      data: {
        currentXp: { increment: xpReward },
        money: { increment: goldReward },
      },
    });

    // Apply faction impact (boost controlling faction in district)
    const districtState = await tx.districtState.findFirst({
      where: {
        characterId,
        districtId: session.districtId,
      },
    });

    if (districtState?.controllingFactionId) {
      // This would integrate with the existing district control system
      // For MVP, just log it
      console.log(
        `[Dungeon] Completed ${session.districtId} depth ${depth}: ` +
          `+${FACTION_CONTROL_DELTA} control for ${districtState.controllingFactionId}`
      );
    }
  });

  return {
    success: true,
    xpReward,
    goldReward,
    factionImpact: undefined, // Would be set based on district state
  };
}

/**
 * Fail the dungeon (e.g., player defeated)
 */
export async function failDungeon(
  sessionId: string
): Promise<void> {
  await prisma.dungeonSession.update({
    where: { id: sessionId },
    data: { state: 'FAILED' },
  });
}

/**
 * Abandon the dungeon (player choice to exit)
 */
export async function abandonDungeon(
  sessionId: string
): Promise<void> {
  // For now, treat abandon as failed
  // Could be different in the future (partial rewards, etc.)
  await failDungeon(sessionId);
}

/**
 * Get active dungeon session for a character
 */
export async function getActiveSession(
  characterId: string,
  districtId?: string
) {
  return prisma.dungeonSession.findFirst({
    where: {
      characterId,
      state: 'ACTIVE',
      ...(districtId ? { districtId } : {}),
    },
    include: {
      floor: {
        include: {
          nodes: true,
          edges: true,
        },
      },
    },
  });
}
