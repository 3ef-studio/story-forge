/**
 * Fight Club (PvP) Types
 */

import type { PlayerBuildSnapshot, ConflictResult } from '../conflict/types';

export type PvpMode = 'ranked' | 'unranked';

export interface CombatantSnapshot {
  characterId: string;
  characterName: string;
  level: number;
  pvpRating: number;
  build: PlayerBuildSnapshot;
}

/**
 * Response from /api/pvp/challenge
 * Returns defender info so frontend can start conflict UI
 */
export interface PvpChallengeResult {
  success: boolean;
  error?: string;
  // When successful, includes data to start conflict
  matchId?: string;
  mode?: PvpMode;
  attacker?: CombatantSnapshot;
  defender?: CombatantSnapshot;
}

/**
 * Request body for /api/pvp/resolve
 * Submitted after player completes the conflict
 */
export interface PvpResolveRequest {
  matchId: string;
  conflictResult: {
    outcome: 'player_victory' | 'opponent_victory' | 'stalemate';
    turnsPlayed: number;
    playerFinalResources: { control: number; stability: number; position: number };
    opponentFinalResources: { control: number; stability: number; position: number };
  };
  turnTimeline?: Array<{
    turn: number;
    playerMove: string;
    opponentMove: string;
  }>;
}

/**
 * Response from /api/pvp/resolve
 */
export interface PvpResolveResult {
  success: boolean;
  result?: 'WIN' | 'LOSS';
  ratingDelta?: number;
  newRating?: number;
  error?: string;
}

export interface EloUpdate {
  attackerNewRating: number;
  defenderNewRating: number;
  attackerDelta: number;
  defenderDelta: number;
}

export interface MatchmakingResult {
  found: boolean;
  defender?: CombatantSnapshot;
  error?: string;
}

export interface LeaderboardEntry {
  rank: number;
  characterId: string;
  characterName: string;
  rating: number;
  wins: number;
  losses: number;
}
