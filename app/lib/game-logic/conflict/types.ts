/** Resource triple used by both player and opponent */
export interface ConflictResources {
  control: number;
  stability: number;
  position: number;
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
}
