/**
 * Dungeon Search System
 *
 * Handles secret door discovery:
 * - Stat-based checks (DEX or INT)
 * - Edge discovery
 * - Session state updates
 */

import { prisma } from '@/app/lib/db';
import type { SearchResult } from './types';

// ============================================================
// Constants
// ============================================================

const SEARCH_BASE_DC = 12; // Base difficulty class
const STAT_BONUS_THRESHOLD = 60; // Attribute value for +1 bonus
const STAT_PENALTY_THRESHOLD = 40; // Attribute value for -1 penalty

// ============================================================
// Search Logic
// ============================================================

/**
 * Calculate stat modifier from attribute value (0-100 scale)
 */
function getStatModifier(value: number): number {
  if (value >= STAT_BONUS_THRESHOLD) {
    return Math.floor((value - STAT_BONUS_THRESHOLD) / 10) + 1;
  }
  if (value < STAT_PENALTY_THRESHOLD) {
    return Math.floor((value - STAT_PENALTY_THRESHOLD) / 10);
  }
  return 0;
}

/**
 * Perform a search check
 */
function performSearchCheck(
  attributes: Record<string, number>,
  dc: number = SEARCH_BASE_DC
): { success: boolean; roll: number; modifier: number; total: number; statUsed: string } {
  // Use better of DEX (agility) or INT (intelligence/perception)
  const dex = attributes.agility ?? attributes.dexterity ?? 50;
  const int = attributes.intelligence ?? attributes.perception ?? 50;

  const dexMod = getStatModifier(dex);
  const intMod = getStatModifier(int);

  // Use whichever stat is better
  const statUsed = intMod >= dexMod ? 'intelligence' : 'agility';
  const modifier = Math.max(dexMod, intMod);

  // Roll d20
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + modifier;

  return {
    success: total >= dc,
    roll,
    modifier,
    total,
    statUsed,
  };
}

// ============================================================
// Main Search Function
// ============================================================

export async function dungeonSearch(
  characterId: string
): Promise<SearchResult> {
  // Get active session with floor data
  const session = await prisma.dungeonSession.findFirst({
    where: {
      characterId,
      state: 'ACTIVE',
    },
    include: {
      floor: {
        include: {
          edges: true,
          nodes: true,
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

  const { edges, nodes } = session.floor;
  const currentNodeId = session.currentNodeId;

  // Find adjacent secret edges that haven't been discovered
  const secretEdges = edges.filter((e) => {
    if (e.type !== 'SECRET') return false;
    if (session.discoveredEdgeIds.includes(e.id)) return false;
    // Check if edge connects to current node
    return e.fromNodeId === currentNodeId || e.toNodeId === currentNodeId;
  });

  if (secretEdges.length === 0) {
    return {
      success: true,
      error: 'You search carefully but find nothing of interest.',
    };
  }

  // Get character attributes
  const attributeMap: Record<string, number> = {};
  for (const attr of session.character.attributes) {
    attributeMap[attr.attributeId] = attr.currentValue;
  }

  // Perform search check
  const check = performSearchCheck(attributeMap);

  if (!check.success) {
    return {
      success: true, // Action succeeded, but didn't find anything
      statUsed: check.statUsed,
      rollResult: check.roll,
      target: SEARCH_BASE_DC,
    };
  }

  // Success - discover a secret edge
  const discoveredEdge = secretEdges[0]; // Take first one
  const otherNodeId =
    discoveredEdge.fromNodeId === currentNodeId
      ? discoveredEdge.toNodeId
      : discoveredEdge.fromNodeId;

  // Get the secret node for info
  const secretNode = nodes.find((n) => n.id === otherNodeId);

  // Update session with discovered edge and node
  const newDiscoveredEdges = [...session.discoveredEdgeIds, discoveredEdge.id];
  const newDiscoveredNodes = session.discoveredNodeIds.includes(otherNodeId)
    ? session.discoveredNodeIds
    : [...session.discoveredNodeIds, otherNodeId];

  await prisma.dungeonSession.update({
    where: { id: session.id },
    data: {
      discoveredEdgeIds: newDiscoveredEdges,
      discoveredNodeIds: newDiscoveredNodes,
    },
  });

  return {
    success: true,
    discovered: {
      edgeId: discoveredEdge.id,
      fromNodeId: discoveredEdge.fromNodeId,
      toNodeId: discoveredEdge.toNodeId,
    },
    statUsed: check.statUsed,
    rollResult: check.roll,
    target: SEARCH_BASE_DC,
  };
}

/**
 * Check if there are undiscovered secrets adjacent to current position
 */
export async function hasAdjacentSecrets(
  sessionId: string
): Promise<boolean> {
  const session = await prisma.dungeonSession.findUnique({
    where: { id: sessionId },
    include: {
      floor: {
        include: {
          edges: true,
        },
      },
    },
  });

  if (!session) return false;

  const { edges } = session.floor;
  const currentNodeId = session.currentNodeId;

  return edges.some((e) => {
    if (e.type !== 'SECRET') return false;
    if (session.discoveredEdgeIds.includes(e.id)) return false;
    return e.fromNodeId === currentNodeId || e.toNodeId === currentNodeId;
  });
}
