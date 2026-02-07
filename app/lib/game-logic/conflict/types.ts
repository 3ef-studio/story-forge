import type { OpponentIdentity, OpponentArchetype } from './opponent-identity';
import type { LeverageState, LeverageSpend } from '@/app/lib/game-logic/leverage';
import type { GambitResult } from '@/app/lib/game-logic/combat/types';

/** Opponent leverage pool (derived from heat + difficulty) */
export interface OpponentLeverageState {
  control: number;
  stability: number;
  position: number;
}

/** Heat effects applied at conflict start (for UI display) */
export interface HeatEffects {
  heatAtStart: number;
  /** Starting resource bonus applied to opponent (e.g., { position: 1 }) */
  heatBonusStart: Partial<ConflictResources>;
  /** Leverage pool granted to opponent from heat */
  heatBonusLeverage: OpponentLeverageState;
}

/** Log entry for opponent leverage spend events */
export interface OpponentLeverageSpendLog {
  turn: number;
  resource: keyof OpponentLeverageState;
  effect: 'boost_self' | 'drain_player';
  archetype: OpponentArchetype;
}

/** Resource triple used by both player and opponent */
export interface ConflictResources {
  control: number;
  stability: number;
  position: number;
}

// --- Encounter Context & Build types ---

export type EncounterType = 'combat' | 'social' | 'stealth' | 'investigation';

export interface EncounterContext {
  type: EncounterType;
  difficultyTier: 'low' | 'medium' | 'high';
  tags: string[];
  stakes: 'low' | 'medium' | 'high';
}

export interface PlayerBuildSnapshot {
  level: number;
  attributes: Record<string, number>;
  powers: Array<{ powerId: string; level: number }>;
}

export interface BonusBreakdownEntry {
  source: string;
  resource: keyof ConflictResources;
  delta: number;
  reason: string;
}

export interface BonusBreakdown {
  entries: BonusBreakdownEntry[];
  finalBonus: Partial<ConflictResources>;
}

export type MoveId =
  | 'pressure'
  | 'seize_control'
  | 'reposition'
  | 'stabilize'
  | 'feint'
  | 'withdraw';

export interface MoveDefinition {
  id: MoveId;
  name: string;
  description: string;
  /** Resource requirements to use this move — e.g. { control: 1 } */
  requires: Partial<ConflictResources>;
  /** Effect applied to the user of the move */
  selfEffect: Partial<ConflictResources>;
  /** Effect applied to the opponent of the user */
  opponentEffect: Partial<ConflictResources>;
  /** Counter bonus triggered when the opponent plays a specific move */
  counterBonus: {
    triggeredBy: MoveId;
    selfEffect?: Partial<ConflictResources>;
    opponentEffect?: Partial<ConflictResources>;
  } | null;
}

export interface Combatant {
  resources: ConflictResources;
  label: string;
}

export interface ConflictLogEntry {
  turn: number;
  playerMove: MoveId;
  opponentMove: MoveId;
  playerEffectText: string;
  opponentEffectText: string;
  playerSnapshot: ConflictResources;
  opponentSnapshot: ConflictResources;
  playerCounterTriggered: boolean;
  opponentCounterTriggered: boolean;
  playerMoveBonus?: BonusBreakdown;
  /** Resources at the START of this turn (for telemetry) */
  resourcesBefore?: {
    player: ConflictResources;
    opponent: ConflictResources;
  };
  /** Leverage spent this turn (for telemetry) */
  leverageSpentThisTurn?: {
    leverageType: 'control' | 'stability' | 'position';
    effectType: string;
  };
  /** Enemy leverage spent this turn (opponent leverage system) */
  enemyLeverageSpentThisTurn?: {
    resource: keyof OpponentLeverageState;
    effect: 'boost_self' | 'drain_player';
  };
}

export interface AIContext {
  encounterCategory: string;
  npcTags: string[];
  resources: ConflictResources;
  playerResources: ConflictResources;
  turn: number;
  maxTurns: number;
}

export type OpponentProfile = 'aggressive' | 'defensive' | 'cunning' | 'balanced';

export interface ConflictInit {
  encounterCategory: string;
  encounterDifficulty: number;
  npcTags: string[];
  playerLabel: string;
  opponentLabel: string;
  playerBuild?: PlayerBuildSnapshot;
  opponentIdentity?: OpponentIdentity;
  leverage?: LeverageState;
  gambitResult?: GambitResult;
  /** Player's current heat level (affects opponent starting resources and leverage) */
  heat?: number;
}

export type ConflictOutcome = 'player_victory' | 'opponent_victory' | 'stalemate';

export interface ConflictResult {
  outcome: ConflictOutcome;
  turnsPlayed: number;
  playerFinalResources: ConflictResources;
  opponentFinalResources: ConflictResources;
  collapseEvents: Array<{ turn: number; who: 'player' | 'opponent'; resource: string }>;
  conflictLog: ConflictLogEntry[];
  narrativeSummary: string;
  flags: {
    flawlessVictory: boolean;
    quickVictory: boolean;
    desperateStand: boolean;
    totalDefeat: boolean;
  };
}

export interface ConflictState {
  player: Combatant;
  opponent: Combatant;
  turn: number;
  maxTurns: number;
  log: ConflictLogEntry[];
  collapseEvents: Array<{ turn: number; who: 'player' | 'opponent'; resource: string }>;
  ended: boolean;
  category: string;
  npcTags: string[];
  opponentProfile: OpponentProfile;
  encounterContext?: EncounterContext;
  playerBuild?: PlayerBuildSnapshot;
  initBreakdown?: BonusBreakdown;
  opponentIdentity?: OpponentIdentity;
  leverage?: LeverageState;
  /** Armed leverage effect for the current turn (applied before move, cleared after) */
  armedLeverage?: LeverageSpend;
  /** Gambit result from choice selection (applied to starting resources) */
  gambitResult?: GambitResult;
  /** Heat level at the start of the conflict */
  heatAtStart?: number;
  /** Heat effects breakdown (starting bonus + leverage bonus) for UI display */
  heatEffects?: HeatEffects;
  /** Opponent's leverage pool (spent during conflict turns) */
  opponentLeverage?: OpponentLeverageState;
  /** Log of opponent leverage spend events */
  opponentLeverageLog?: OpponentLeverageSpendLog[];
}
