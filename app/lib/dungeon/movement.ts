/**
 * Dungeon Movement System
 *
 * Handles player movement through the dungeon graph:
 * - Edge validation
 * - Corridor auto-traversal
 * - Node discovery
 * - Encounter triggering
 */

import { prisma } from '@/app/lib/db';
import type {
  DungeonSession,
  DungeonNode,
  DungeonEdge,
  DungeonContentType,
} from '@prisma/client';
import type { MoveResult } from './types';
import { getTrapDifficulty, perceptionCheck, TRAP_DIFFICULTY_VALUES } from './trap';

// ============================================================
// Session Helpers
// ============================================================

export async function getActiveSession(
  characterId: string,
  districtId?: string
): Promise<DungeonSession | null> {
  return prisma.dungeonSession.findFirst({
    where: {
      characterId,
      state: 'ACTIVE',
      ...(districtId ? { districtId } : {}),
    },
  });
}

export async function getSessionWithFloor(sessionId: string) {
  return prisma.dungeonSession.findUnique({
    where: { id: sessionId },
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

// ============================================================
// Movement Logic
// ============================================================

/**
 * Get all edges connected to a node (bidirectional)
 */
function getConnectedEdges(
  nodeId: string,
  edges: DungeonEdge[]
): DungeonEdge[] {
  return edges.filter(
    (e) => e.fromNodeId === nodeId || e.toNodeId === nodeId
  );
}

/**
 * Get the other node in an edge
 */
function getOtherNodeId(edge: DungeonEdge, currentNodeId: string): string {
  return edge.fromNodeId === currentNodeId ? edge.toNodeId : edge.fromNodeId;
}

/**
 * Check if an edge is discovered by the player
 */
function isEdgeDiscovered(
  edge: DungeonEdge,
  session: DungeonSession
): boolean {
  // Non-secret edges are always "discovered"
  if (edge.type !== 'SECRET') return true;
  return session.discoveredEdgeIds.includes(edge.id);
}

/**
 * Check if movement to target node is valid
 */
function canMoveTo(
  currentNodeId: string,
  targetNodeId: string,
  edges: DungeonEdge[],
  session: DungeonSession
): { valid: boolean; edge?: DungeonEdge; error?: string } {
  // Find edge connecting current to target
  const edge = edges.find(
    (e) =>
      (e.fromNodeId === currentNodeId && e.toNodeId === targetNodeId) ||
      (e.toNodeId === currentNodeId && e.fromNodeId === targetNodeId)
  );

  if (!edge) {
    return { valid: false, error: 'No path exists to that room' };
  }

  // Check if edge is discovered (for secret passages)
  if (!isEdgeDiscovered(edge, session)) {
    return { valid: false, error: 'No visible path to that room' };
  }

  // Check if edge is locked (future feature)
  if (edge.type === 'LOCKED') {
    return { valid: false, error: 'The passage is locked' };
  }

  return { valid: true, edge };
}

/**
 * Auto-traverse corridors
 *
 * If moving from a non-corridor to a corridor, automatically
 * continue to the next non-corridor node if there's only one exit.
 * This makes corridors "pass-through" rather than stops.
 */
function findTraversalPath(
  startNodeId: string,
  targetNodeId: string,
  nodes: DungeonNode[],
  edges: DungeonEdge[],
  session: DungeonSession
): { path: string[]; finalNodeId: string; encounterNodes: string[] } {
  const path: string[] = [targetNodeId];
  const encounterNodes: string[] = [];
  let currentId = targetNodeId;

  const targetNode = nodes.find((n) => n.id === targetNodeId);
  if (!targetNode) {
    return { path, finalNodeId: targetNodeId, encounterNodes };
  }

  // If target is a corridor with content, note it for encounter
  if (targetNode.type === 'CORRIDOR' && targetNode.contentType) {
    encounterNodes.push(targetNodeId);
  }

  // Auto-traverse corridors
  if (targetNode.type === 'CORRIDOR') {
    const visited = new Set<string>([startNodeId, targetNodeId]);

    while (true) {
      const currentNode = nodes.find((n) => n.id === currentId);
      if (!currentNode || currentNode.type !== 'CORRIDOR') break;

      // Find connected edges (excluding where we came from)
      const connectedEdges = getConnectedEdges(currentId, edges).filter(
        (e) => isEdgeDiscovered(e, session)
      );

      // Find next nodes we can move to
      const nextNodeIds = connectedEdges
        .map((e) => getOtherNodeId(e, currentId))
        .filter((id) => !visited.has(id));

      // If only one exit (besides where we came from), continue
      if (nextNodeIds.length === 1) {
        const nextId = nextNodeIds[0];
        const nextNode = nodes.find((n) => n.id === nextId);

        path.push(nextId);
        visited.add(nextId);

        // Check for encounters in traversed corridors
        if (nextNode?.type === 'CORRIDOR' && nextNode.contentType) {
          encounterNodes.push(nextId);
        }

        currentId = nextId;

        // If we reached a non-corridor, stop
        if (nextNode && nextNode.type !== 'CORRIDOR') {
          break;
        }
      } else {
        // Multiple exits or dead end - stop here
        break;
      }
    }
  }

  return { path, finalNodeId: currentId, encounterNodes };
}

/**
 * Discover adjacent nodes and edges when entering a new node
 */
function discoverAdjacent(
  nodeId: string,
  nodes: DungeonNode[],
  edges: DungeonEdge[],
  session: DungeonSession
): { newNodes: string[]; newEdges: string[] } {
  const newNodes: string[] = [];
  const newEdges: string[] = [];

  // Get all edges from this node (except secret ones)
  const connectedEdges = getConnectedEdges(nodeId, edges).filter(
    (e) => e.type !== 'SECRET'
  );

  for (const edge of connectedEdges) {
    // Discover the edge
    if (!session.discoveredEdgeIds.includes(edge.id)) {
      newEdges.push(edge.id);
    }

    // Discover the connected node
    const otherId = getOtherNodeId(edge, nodeId);
    if (!session.discoveredNodeIds.includes(otherId)) {
      newNodes.push(otherId);
    }
  }

  return { newNodes, newEdges };
}

// ============================================================
// Main Movement Function
// ============================================================

export async function dungeonMove(
  characterId: string,
  targetNodeId: string
): Promise<MoveResult> {
  // Get active session
  const session = await prisma.dungeonSession.findFirst({
    where: {
      characterId,
      state: 'ACTIVE',
    },
    include: {
      floor: {
        include: {
          nodes: true,
          edges: true,
        },
      },
      character: {
        include: {
          attributes: true,
        },
      },
    },
  });

  if (!session) {
    return { success: false, error: 'No active dungeon session' };
  }

  const { nodes, edges } = session.floor;
  const currentNodeId = session.currentNodeId;

  // Validate movement
  const moveCheck = canMoveTo(currentNodeId, targetNodeId, edges, session);
  if (!moveCheck.valid) {
    return { success: false, error: moveCheck.error };
  }

  // Calculate traversal path (auto-traverse corridors)
  const { path, finalNodeId, encounterNodes } = findTraversalPath(
    currentNodeId,
    targetNodeId,
    nodes,
    edges,
    session
  );

  // Discover adjacent rooms from final position
  const { newNodes, newEdges } = discoverAdjacent(
    finalNodeId,
    nodes,
    edges,
    session
  );

  // Also discover all nodes in the path
  const allNewNodes = [...new Set([...path, ...newNodes])].filter(
    (id) => !session.discoveredNodeIds.includes(id)
  );
  const allNewEdges = [...new Set(newEdges)].filter(
    (id) => !session.discoveredEdgeIds.includes(id)
  );

  // Get the final node for encounter info
  const finalNode = nodes.find((n) => n.id === finalNodeId);

  // Determine encounter (prioritize corridor encounters, then final room)
  let encounter: MoveResult['encounter'] = null;

  // Check for corridor encounters first (traps/ambushes)
  if (encounterNodes.length > 0) {
    const firstEncounterNodeId = encounterNodes[0];
    const encounterNode = nodes.find((n) => n.id === firstEncounterNodeId);
    if (encounterNode?.contentType && !session.clearedNodeIds.includes(firstEncounterNodeId)) {
      encounter = {
        type: encounterNode.contentType,
        isBoss: encounterNode.isBoss,
        nodeId: firstEncounterNodeId,
      };
    }
  }

  // If no corridor encounter, check final node
  if (!encounter && finalNode?.contentType && !session.clearedNodeIds.includes(finalNodeId)) {
    encounter = {
      type: finalNode.contentType,
      isBoss: finalNode.isBoss,
      nodeId: finalNodeId,
    };
  }

  // For TRAP encounters: run perception check to determine if player detects it
  if (encounter?.type === 'TRAP') {
    const depth = session.floor.depth;
    const trapDifficulty = getTrapDifficulty(depth);

    const attributeMap: Record<string, number> = {};
    for (const attr of session.character.attributes) {
      attributeMap[attr.attributeId] = attr.currentValue;
    }
    const perception = attributeMap.perception ?? attributeMap.intelligence ?? 50;

    const detection = perceptionCheck(perception, trapDifficulty);

    encounter = {
      ...encounter,
      trapDifficulty,
      trapDetected: detection.success,
      trapPerceptionRoll: detection.roll,
      trapPerceptionTotal: detection.total,
      trapDifficultyValue: TRAP_DIFFICULTY_VALUES[trapDifficulty],
    };
  }

  // Update session
  await prisma.dungeonSession.update({
    where: { id: session.id },
    data: {
      currentNodeId: finalNodeId,
      discoveredNodeIds: [...session.discoveredNodeIds, ...allNewNodes],
      discoveredEdgeIds: [...session.discoveredEdgeIds, ...allNewEdges],
    },
  });

  return {
    success: true,
    newNodeId: finalNodeId,
    traversedNodes: path,
    encounter,
    discoveredNodes: allNewNodes,
    discoveredEdges: allNewEdges,
  };
}

/**
 * Mark a node as cleared after encounter resolution
 */
export async function markNodeCleared(
  sessionId: string,
  nodeId: string
): Promise<void> {
  const session = await prisma.dungeonSession.findUnique({
    where: { id: sessionId },
  });

  if (session && !session.clearedNodeIds.includes(nodeId)) {
    await prisma.dungeonSession.update({
      where: { id: sessionId },
      data: {
        clearedNodeIds: [...session.clearedNodeIds, nodeId],
      },
    });
  }
}

/**
 * Get available moves from current position
 */
export async function getAvailableMoves(
  sessionId: string
): Promise<{ nodeId: string; type: string; isSecret: boolean }[]> {
  const session = await getSessionWithFloor(sessionId);
  if (!session) return [];

  const { nodes, edges } = session.floor;
  const connectedEdges = getConnectedEdges(session.currentNodeId, edges);

  return connectedEdges
    .filter((e) => isEdgeDiscovered(e, session))
    .map((e) => {
      const targetId = getOtherNodeId(e, session.currentNodeId);
      const targetNode = nodes.find((n) => n.id === targetId);
      return {
        nodeId: targetId,
        type: targetNode?.type || 'UNKNOWN',
        isSecret: e.type === 'SECRET',
      };
    });
}
