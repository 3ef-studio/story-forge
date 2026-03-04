/**
 * Dungeon System Types
 *
 * Type definitions for the dungeon subsystem including
 * nodes, edges, floors, sessions, and DTOs.
 */

import type {
  DungeonFloor,
  DungeonNode,
  DungeonEdge,
  DungeonSession,
  DungeonNodeType,
  DungeonEdgeType,
  DungeonContentType,
  DungeonNodeState,
  DungeonSessionState,
} from '@prisma/client';

// Re-export Prisma types for convenience
export type {
  DungeonFloor,
  DungeonNode,
  DungeonEdge,
  DungeonSession,
  DungeonNodeType,
  DungeonEdgeType,
  DungeonContentType,
  DungeonNodeState,
  DungeonSessionState,
};

// ============================================================
// Generation Types
// ============================================================

export interface GenerationConfig {
  minChambers: number;
  maxChambers: number;
  minCorridors: number;
  maxCorridors: number;
  hasBoss: boolean;
  hasStairs: boolean;
  hasSecret: boolean;
  extraEdges: number; // For creating loops
  width: number;
  height: number;
}

export interface NodePlacement {
  type: DungeonNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  contentType: DungeonContentType | null;
  isBoss: boolean;
  label?: string;
}

export interface EdgePlacement {
  fromIndex: number;
  toIndex: number;
  type: DungeonEdgeType;
}

export interface GeneratedFloor {
  districtId: string;
  depth: number;
  width: number;
  height: number;
  seed: number;
  nodes: NodePlacement[];
  edges: EdgePlacement[];
}

// ============================================================
// Session Types
// ============================================================

export interface SessionWithRelations extends DungeonSession {
  floor: DungeonFloor & {
    nodes: DungeonNode[];
    edges: DungeonEdge[];
  };
}

export interface NodeWithState extends DungeonNode {
  state: DungeonNodeState;
  isDiscovered: boolean;
}

export interface EdgeWithState extends DungeonEdge {
  isDiscovered: boolean;
}

// ============================================================
// Movement Types
// ============================================================

export interface TrapEncounterInfo {
  trapDifficulty: 'EASY' | 'NORMAL' | 'HARD';
  trapDetected: boolean;
  trapPerceptionRoll: number;
  trapPerceptionTotal: number;
  trapDifficultyValue: number;
}

export interface MoveResult {
  success: boolean;
  error?: string;
  newNodeId?: string;
  traversedNodes?: string[]; // For corridor auto-traversal
  encounter?: {
    type: DungeonContentType;
    isBoss: boolean;
    nodeId: string;
  } & Partial<TrapEncounterInfo> | null;
  discoveredNodes?: string[];
  discoveredEdges?: string[];
}

export interface SearchResult {
  success: boolean;
  error?: string;
  discovered?: {
    edgeId: string;
    fromNodeId: string;
    toNodeId: string;
  };
  statUsed?: string;
  rollResult?: number;
  target?: number;
}

// ============================================================
// Minimap DTO Types
// ============================================================

export interface MinimapNodeDTO {
  id: string;
  type: DungeonNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  state: DungeonNodeState;
  contentType: DungeonContentType | null;
  isBoss: boolean;
  label?: string;
  isCurrent: boolean;
}

export interface MinimapEdgeDTO {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: DungeonEdgeType;
}

export interface MinimapDTO {
  floorId: string;
  districtId: string;
  depth: number;
  width: number;
  height: number;
  currentNodeId: string;
  nodes: MinimapNodeDTO[];
  edges: MinimapEdgeDTO[];
  sessionState: DungeonSessionState;
}

// ============================================================
// API Response Types
// ============================================================

export interface EnterDungeonResponse {
  success: boolean;
  error?: string;
  session?: {
    id: string;
    districtId: string;
    floorId: string;
    depth: number;
    currentNodeId: string;
    state: DungeonSessionState;
  };
  minimap?: MinimapDTO;
}

export interface DungeonMoveResponse {
  success: boolean;
  error?: string;
  move?: MoveResult;
  minimap?: MinimapDTO;
}

export interface DungeonSearchResponse {
  success: boolean;
  error?: string;
  search?: SearchResult;
  minimap?: MinimapDTO;
}

export interface DungeonCompletionResult {
  success: boolean;
  xpReward: number;
  goldReward: number;
  factionImpact?: {
    factionId: string;
    delta: number;
  };
}
