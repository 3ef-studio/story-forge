/**
 * Dungeon System
 *
 * A procedurally generated dungeon subsystem for Story Forge.
 * Each district can contain a dungeon with multiple floors.
 *
 * Features:
 * - Graph-based room layout
 * - Multiple node types (chambers, corridors, boss, secret, etc.)
 * - Branching paths and loops
 * - Secret passage discovery
 * - Persistent exploration state
 * - Minimap rendering support
 */

// Feature flag
export const DUNGEON_ENABLED = true;

// Types
export * from './types';

// Generator
export { generateDungeonFloor, getFloorWithRelations, DEFAULT_CONFIG } from './generator';

// Movement
export {
  dungeonMove,
  markNodeCleared,
  getAvailableMoves,
  getActiveSession as getActiveMovementSession,
  getSessionWithFloor,
} from './movement';

// Search
export { dungeonSearch, hasAdjacentSecrets } from './search';

// Session Management
export {
  enterDungeon,
  checkCompletion,
  completeDungeon,
  failDungeon,
  abandonDungeon,
  getActiveSession,
} from './session';

// Minimap
export { buildMinimapDTO, buildFullFloorMap } from './minimap';

// Trap system
export {
  getTrapDifficulty,
  perceptionCheck,
  disarmCheck,
  triggerTrap,
  disarmTrap,
  retreatFromTrap,
  TRAP_DIFFICULTY_VALUES,
  TRAP_DAMAGE,
} from './trap';
export type { TrapDifficulty, TrapCheckResult, TrapActionResult } from './trap';
