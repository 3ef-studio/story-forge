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
// Corridor Resolution Helpers
// ============================================================

/**
 * Follow a single-exit corridor chain from `fromNodeId` through `corridorId`
 * and return the ID of the first non-corridor node (or the corridor itself if
 * the chain dead-ends or branches before reaching one).
 */
function resolveCorridorTerminal(
  fromNodeId: string,
  corridorId: string,
  nodes: DungeonNode[],
  edges: DungeonEdge[],
  session: DungeonSession
): string {
  const visited = new Set<string>([fromNodeId, corridorId]);
  let currentId = corridorId;

  while (true) {
    const currentNode = nodes.find((n) => n.id === currentId);
    if (!currentNode || currentNode.type !== 'CORRIDOR') {
      return currentId;
    }

    const nextIds = getConnectedEdges(currentId, edges)
      .filter((e) => isEdgeDiscovered(e, session))
      .map((e) => getOtherNodeId(e, currentId))
      .filter((id) => !visited.has(id));

    if (nextIds.length === 1) {
      visited.add(nextIds[0]);
      currentId = nextIds[0];
    } else {
      // Dead end or multi-exit junction — stay at this corridor node
      return currentId;
    }
  }
}

/**
 * Given a `targetNodeId` that is the terminal of a corridor chain starting
 * at `currentNodeId`, return the ID of the directly-adjacent corridor that
 * is the first step in that chain.  Returns `null` if no such path exists.
 */
function findCorridorFirstStep(
  currentNodeId: string,
  targetNodeId: string,
  nodes: DungeonNode[],
  edges: DungeonEdge[],
  session: DungeonSession
): string | null {
  const connectedEdges = getConnectedEdges(currentNodeId, edges).filter((e) =>
    isEdgeDiscovered(e, session)
  );

  for (const edge of connectedEdges) {
    const neighborId = getOtherNodeId(edge, currentNodeId);
    const neighbor = nodes.find((n) => n.id === neighborId);
    if (neighbor?.type !== 'CORRIDOR') continue;

    const terminal = resolveCorridorTerminal(currentNodeId, neighborId, nodes, edges, session);
    if (terminal === targetNodeId) {
      return neighborId;
    }
  }
  return null;
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

  // Validate movement — direct edge first, then corridor-chain resolution.
  // getAvailableMoves now resolves corridors to their terminal rooms, so the
  // client may send a terminal room ID that has no direct edge from the current
  // node.  In that case we find the adjacent corridor that leads there and use
  // it as the first step for traversal.
  const directCheck = canMoveTo(currentNodeId, targetNodeId, edges, session);
  let firstStep = targetNodeId;

  if (!directCheck.valid) {
    const corridorStep = findCorridorFirstStep(
      currentNodeId,
      targetNodeId,
      nodes,
      edges,
      session
    );
    if (!corridorStep) {
      return { success: false, error: directCheck.error };
    }
    firstStep = corridorStep;
  }

  // Calculate traversal path (auto-traverse corridors from firstStep)
  const {
    path: rawPath,
    finalNodeId: rawFinalNodeId,
    encounterNodes,
  } = findTraversalPath(currentNodeId, firstStep, nodes, edges, session);

  // If a corridor encounter (e.g. a trap) lies mid-traversal, stop the
  // player at that corridor node rather than auto-walking them past it.
  // Without this, the player would land in the room beyond the trap while
  // the encounter fires from a corridor they never "stopped" in.
  let finalNodeId = rawFinalNodeId;
  let path = rawPath;
  if (encounterNodes.length > 0 && encounterNodes[0] !== rawFinalNodeId) {
    const stopIdx = rawPath.indexOf(encounterNodes[0]);
    if (stopIdx !== -1) {
      path = rawPath.slice(0, stopIdx + 1);
      finalNodeId = encounterNodes[0];
    }
  }

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

  const moves = connectedEdges
    .filter((e) => isEdgeDiscovered(e, session))
    .map((e) => {
      const adjacentId = getOtherNodeId(e, session.currentNodeId);
      const adjacentNode = nodes.find((n) => n.id === adjacentId);

      // Resolve corridors to their terminal destination so that exits always
      // display the actual room the player will land in, not a pass-through
      // corridor node.
      let targetId = adjacentId;
      if (adjacentNode?.type === 'CORRIDOR') {
        targetId = resolveCorridorTerminal(
          session.currentNodeId,
          adjacentId,
          nodes,
          edges,
          session
        );
      }

      const targetNode = nodes.find((n) => n.id === targetId);
      return {
        nodeId: targetId,
        type: targetNode?.type || 'UNKNOWN',
        isSecret: e.type === 'SECRET',
      };
    });

  // Deduplicate — multiple corridor paths could theoretically resolve to the
  // same terminal room.
  return moves.filter(
    (move, idx) => moves.findIndex((m) => m.nodeId === move.nodeId) === idx
  );
}
