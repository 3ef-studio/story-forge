/**
 * Dungeon Minimap DTO
 *
 * Builds the minimap data transfer object for client rendering.
 * Only includes discovered nodes and edges.
 */

import { prisma } from '@/app/lib/db';
import type {
  MinimapDTO,
  MinimapNodeDTO,
  MinimapEdgeDTO,
} from './types';
import type { DungeonNodeState } from '@prisma/client';

// ============================================================
// State Helpers
// ============================================================

function getNodeState(
  nodeId: string,
  discoveredNodeIds: string[],
  clearedNodeIds: string[]
): DungeonNodeState {
  if (clearedNodeIds.includes(nodeId)) {
    return 'CLEARED';
  }
  if (discoveredNodeIds.includes(nodeId)) {
    return 'VISITED';
  }
  return 'UNVISITED';
}

// ============================================================
// Main DTO Builder
// ============================================================

export async function buildMinimapDTO(
  sessionId: string
): Promise<MinimapDTO | null> {
  const session = await prisma.dungeonSession.findUnique({
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

  if (!session) {
    return null;
  }

  const { floor, discoveredNodeIds, discoveredEdgeIds, clearedNodeIds, currentNodeId } = session;
  const { nodes, edges } = floor;

  // Build node DTOs - only include discovered nodes
  const minimapNodes: MinimapNodeDTO[] = nodes
    .filter((node) => discoveredNodeIds.includes(node.id))
    .map((node) => ({
      id: node.id,
      type: node.type,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      state: getNodeState(node.id, discoveredNodeIds, clearedNodeIds),
      contentType: node.contentType,
      isBoss: node.isBoss,
      label: node.label ?? undefined,
      isCurrent: node.id === currentNodeId,
    }));

  // Build edge DTOs - only include discovered edges
  // Also filter to only edges where both nodes are discovered
  const minimapEdges: MinimapEdgeDTO[] = edges
    .filter((edge) => {
      // For non-secret edges, include if both nodes are discovered
      if (edge.type !== 'SECRET') {
        return (
          discoveredNodeIds.includes(edge.fromNodeId) &&
          discoveredNodeIds.includes(edge.toNodeId)
        );
      }
      // For secret edges, must be explicitly discovered
      return discoveredEdgeIds.includes(edge.id);
    })
    .map((edge) => ({
      id: edge.id,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      type: edge.type,
    }));

  return {
    floorId: floor.id,
    districtId: floor.districtId,
    depth: floor.depth,
    width: floor.width,
    height: floor.height,
    currentNodeId,
    nodes: minimapNodes,
    edges: minimapEdges,
    sessionState: session.state,
  };
}

/**
 * Build a full floor map (for debugging/admin)
 */
export async function buildFullFloorMap(
  floorId: string
): Promise<MinimapDTO | null> {
  const floor = await prisma.dungeonFloor.findUnique({
    where: { id: floorId },
    include: {
      nodes: true,
      edges: true,
    },
  });

  if (!floor) {
    return null;
  }

  const minimapNodes: MinimapNodeDTO[] = floor.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    state: 'UNVISITED' as DungeonNodeState,
    contentType: node.contentType,
    isBoss: node.isBoss,
    label: node.label ?? undefined,
    isCurrent: false,
  }));

  const minimapEdges: MinimapEdgeDTO[] = floor.edges.map((edge) => ({
    id: edge.id,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    type: edge.type,
  }));

  return {
    floorId: floor.id,
    districtId: floor.districtId,
    depth: floor.depth,
    width: floor.width,
    height: floor.height,
    currentNodeId: '',
    nodes: minimapNodes,
    edges: minimapEdges,
    sessionState: 'ACTIVE',
  };
}
