/**
 * Escalation and Victory System
 *
 * Handles:
 * 1. Tier calculation based on city share (determines faction power level)
 * 2. Win condition detection (faction leads all districts with >70% for 2 turns)
 * 3. Victory streak tracking and persistence
 *
 * Tier effects are consumed by world reactions (counter delta, ripple bias).
 * Victory state is persisted in WorldState and returned to client.
 */

import { prisma } from '@/app/lib/db';
import { controllableFactions, getFactionById } from '@/app/data/factions';
import { districts } from '@/app/data/districts';
import type { DistrictShares, DistrictLeader } from './districtControlShares';
import { computeDistrictLeader, getAllDistrictShares } from './districtControlShares';

// ============================================================
// Types
// ============================================================

export type FactionTier = 0 | 1 | 2 | 3;

export interface FactionTierInfo {
  factionId: string;
  factionName: string;
  cityShare: number; // 0-100 percentage
  tier: FactionTier;
}

export interface DistrictLeaderInfo {
  districtId: string;
  leaderFactionId: string | null;
  leaderShare: number;
  hasSecondPlace: boolean; // true if there's a tie or close second
  secondPlaceFactionId: string | null;
  secondPlaceShare: number;
}

export interface VictoryCheckResult {
  victory: boolean;
  winnerFactionId: string | null;
  winnerFactionName: string | null;
  winStreakFactionId: string | null;
  winStreakCount: number;
  wonAtTurn: number | null;
  worldTurn: number;
  candidateFactionId: string | null; // Faction that meets conditions this turn
}

export interface EscalationState {
  worldTurn: number;
  factionTiers: FactionTierInfo[];
  districtLeaders: DistrictLeaderInfo[];
  victoryState: VictoryCheckResult;
}

// ============================================================
// Constants
// ============================================================

const CONTROLLABLE_FACTION_IDS = controllableFactions.map(f => f.id);

// Tier thresholds (city share percentage)
const TIER_THRESHOLDS = {
  TIER_1: 35, // 35% to < 50%
  TIER_2: 50, // 50% to < 65%
  TIER_3: 65, // >= 65%
};

// Win condition constants
const WIN_SHARE_THRESHOLD = 70; // Must have > 70% in each district
const WIN_STREAK_REQUIRED = 2; // Must maintain for 2 consecutive turns

// ============================================================
// Tier Calculation
// ============================================================

/**
 * Compute city share for a faction.
 * cityShare = average of faction's share across all districts
 */
export function computeFactionCityShare(
  factionId: string,
  districtSharesMap: Map<string, DistrictShares>
): number {
  let totalShare = 0;
  let districtCount = 0;

  for (const [, shares] of districtSharesMap) {
    totalShare += shares[factionId] ?? 0;
    districtCount++;
  }

  if (districtCount === 0) return 0;
  return totalShare / districtCount;
}

/**
 * Compute city shares for all controllable factions.
 */
export function computeAllCityShares(
  districtSharesMap: Map<string, DistrictShares>
): Map<string, number> {
  const cityShares = new Map<string, number>();

  for (const factionId of CONTROLLABLE_FACTION_IDS) {
    cityShares.set(factionId, computeFactionCityShare(factionId, districtSharesMap));
  }

  return cityShares;
}

/**
 * Determine tier for a faction based on city share.
 */
export function computeFactionTier(cityShare: number): FactionTier {
  if (cityShare >= TIER_THRESHOLDS.TIER_3) return 3;
  if (cityShare >= TIER_THRESHOLDS.TIER_2) return 2;
  if (cityShare >= TIER_THRESHOLDS.TIER_1) return 1;
  return 0;
}

/**
 * Get tier label for display.
 */
export function getTierLabel(tier: FactionTier): string {
  switch (tier) {
    case 0: return 'Minor';
    case 1: return 'Rising';
    case 2: return 'Major';
    case 3: return 'Dominant';
  }
}

/**
 * Compute tiers for all controllable factions.
 */
export function computeFactionTiers(
  districtSharesMap: Map<string, DistrictShares>
): FactionTierInfo[] {
  const cityShares = computeAllCityShares(districtSharesMap);
  const tiers: FactionTierInfo[] = [];

  for (const factionId of CONTROLLABLE_FACTION_IDS) {
    const faction = getFactionById(factionId);
    const cityShare = cityShares.get(factionId) ?? 0;
    const tier = computeFactionTier(cityShare);

    tiers.push({
      factionId,
      factionName: faction?.name ?? factionId,
      cityShare: Math.round(cityShare * 10) / 10, // Round to 1 decimal
      tier,
    });
  }

  // Sort by city share descending
  tiers.sort((a, b) => b.cityShare - a.cityShare);

  return tiers;
}

// ============================================================
// District Leader Analysis
// ============================================================

/**
 * Analyze district leaders with tie detection.
 * For win condition, we need to ensure there's no tie.
 */
export function analyzeDistrictLeaders(
  districtSharesMap: Map<string, DistrictShares>
): DistrictLeaderInfo[] {
  const leaders: DistrictLeaderInfo[] = [];

  for (const [districtId, shares] of districtSharesMap) {
    // Find top two factions
    const factionShares: Array<{ factionId: string; share: number }> = [];

    for (const factionId of CONTROLLABLE_FACTION_IDS) {
      factionShares.push({
        factionId,
        share: shares[factionId] ?? 0,
      });
    }

    // Sort by share descending
    factionShares.sort((a, b) => b.share - a.share);

    const first = factionShares[0];
    const second = factionShares[1];

    // Check for tie (same share as leader)
    const isTie = first && second && first.share === second.share && first.share > 0;

    leaders.push({
      districtId,
      leaderFactionId: isTie ? null : (first?.share > 0 ? first.factionId : null),
      leaderShare: first?.share ?? 0,
      hasSecondPlace: !!second && second.share > 0,
      secondPlaceFactionId: second?.factionId ?? null,
      secondPlaceShare: second?.share ?? 0,
    });
  }

  return leaders;
}

// ============================================================
// Win Condition Detection
// ============================================================

/**
 * Check if a faction meets win conditions this turn.
 * Returns the candidate faction ID or null.
 *
 * Win conditions:
 * 1. Leads ALL districts (no ties)
 * 2. Has >70% share in EACH district
 */
export function checkWinCandidate(
  districtLeaders: DistrictLeaderInfo[]
): string | null {
  if (districtLeaders.length === 0) return null;

  // Check if a single faction leads all districts with >70%
  let candidateFactionId: string | null = null;

  for (const leader of districtLeaders) {
    // Must have a clear leader (no tie)
    if (!leader.leaderFactionId) return null;

    // Must have >70% share
    if (leader.leaderShare <= WIN_SHARE_THRESHOLD) return null;

    // Check if same faction leads all districts
    if (candidateFactionId === null) {
      candidateFactionId = leader.leaderFactionId;
    } else if (candidateFactionId !== leader.leaderFactionId) {
      return null; // Different factions lead different districts
    }
  }

  return candidateFactionId;
}

// ============================================================
// Victory State Management
// ============================================================

interface WorldStateRecord {
  id: string;
  scopeId: string;
  worldTurn: number;
  winnerFactionId: string | null;
  wonAtTurn: number | null;
  winStreakFactionId: string | null;
  winStreakCount: number;
}

/**
 * Get or create world state for a scope.
 */
async function getWorldState(scopeId: string): Promise<WorldStateRecord> {
  let worldState = await prisma.worldState.findUnique({
    where: { scopeId },
  });

  if (!worldState) {
    worldState = await prisma.worldState.create({
      data: {
        scopeId,
        worldTurn: 0,
        winnerFactionId: null,
        wonAtTurn: null,
        winStreakFactionId: null,
        winStreakCount: 0,
      },
    });
  }

  return {
    id: worldState.id,
    scopeId: worldState.scopeId,
    worldTurn: worldState.worldTurn,
    winnerFactionId: (worldState as { winnerFactionId?: string | null }).winnerFactionId ?? null,
    wonAtTurn: (worldState as { wonAtTurn?: number | null }).wonAtTurn ?? null,
    winStreakFactionId: (worldState as { winStreakFactionId?: string | null }).winStreakFactionId ?? null,
    winStreakCount: (worldState as { winStreakCount?: number }).winStreakCount ?? 0,
  };
}

/**
 * Update victory streak and check for winner.
 * Called after each encounter resolution, after world updates.
 */
export async function updateVictoryStreakAndWinner(
  scopeId: string,
  districtLeaders: DistrictLeaderInfo[]
): Promise<VictoryCheckResult> {
  const worldState = await getWorldState(scopeId);

  // If already won, return current state
  if (worldState.winnerFactionId) {
    const winnerFaction = getFactionById(worldState.winnerFactionId);
    return {
      victory: true,
      winnerFactionId: worldState.winnerFactionId,
      winnerFactionName: winnerFaction?.name ?? worldState.winnerFactionId,
      winStreakFactionId: worldState.winStreakFactionId,
      winStreakCount: worldState.winStreakCount,
      wonAtTurn: worldState.wonAtTurn,
      worldTurn: worldState.worldTurn,
      candidateFactionId: null,
    };
  }

  // Increment world turn
  const newWorldTurn = worldState.worldTurn + 1;

  // Check for win candidate
  const candidateFactionId = checkWinCandidate(districtLeaders);

  // Update streak
  let newStreakFactionId: string | null = null;
  let newStreakCount = 0;

  if (candidateFactionId === null) {
    // No candidate - reset streak
    newStreakFactionId = null;
    newStreakCount = 0;
  } else if (candidateFactionId === worldState.winStreakFactionId) {
    // Same candidate - increment streak
    newStreakFactionId = candidateFactionId;
    newStreakCount = worldState.winStreakCount + 1;
  } else {
    // New candidate - start new streak
    newStreakFactionId = candidateFactionId;
    newStreakCount = 1;
  }

  // Check for victory
  let winnerFactionId: string | null = null;
  let wonAtTurn: number | null = null;

  if (newStreakCount >= WIN_STREAK_REQUIRED) {
    winnerFactionId = newStreakFactionId;
    wonAtTurn = newWorldTurn;
  }

  // Persist updated state
  await prisma.worldState.update({
    where: { scopeId },
    data: {
      worldTurn: newWorldTurn,
      winnerFactionId,
      wonAtTurn,
      winStreakFactionId: newStreakFactionId,
      winStreakCount: newStreakCount,
    },
  });

  const winnerFaction = winnerFactionId ? getFactionById(winnerFactionId) : null;

  console.log(
    `[Victory] Turn ${newWorldTurn}: candidate=${candidateFactionId ?? 'none'}, streak=${newStreakCount}/${WIN_STREAK_REQUIRED}, victory=${!!winnerFactionId}`
  );

  return {
    victory: !!winnerFactionId,
    winnerFactionId,
    winnerFactionName: winnerFaction?.name ?? null,
    winStreakFactionId: newStreakFactionId,
    winStreakCount: newStreakCount,
    wonAtTurn,
    worldTurn: newWorldTurn,
    candidateFactionId,
  };
}

// ============================================================
// Tier Effects (for world reactions)
// ============================================================

/**
 * Get counter delta modifier based on faction tier.
 * Tier 1: +1, Tier 2: +2, Tier 3: +3
 */
export function getCounterDeltaModifier(tier: FactionTier): number {
  switch (tier) {
    case 3: return 3;
    case 2: return 2;
    case 1: return 1;
    default: return 0;
  }
}

/**
 * Get ripple favor chance based on player faction tier.
 * Default 70%, Tier 2: 80%, Tier 3: 85%
 */
export function getRippleFavorChance(playerTier: FactionTier): number {
  switch (playerTier) {
    case 3: return 0.85;
    case 2: return 0.80;
    default: return 0.70;
  }
}

/**
 * Get difficulty modifier based on enemy faction tier.
 * If leading enemy faction is Tier 3: -2% success chance
 */
export function getEnemyTierDifficultyModifier(
  playerFactionId: string | null,
  factionTiers: FactionTierInfo[]
): number {
  if (!playerFactionId) return 0;

  // Find the highest tier enemy faction
  const enemyTiers = factionTiers.filter(t => t.factionId !== playerFactionId);
  const highestEnemyTier = enemyTiers.length > 0
    ? Math.max(...enemyTiers.map(t => t.tier))
    : 0;

  // Only apply modifier if enemy is Tier 3
  if (highestEnemyTier >= 3) {
    return -0.02; // -2% success chance
  }

  return 0;
}

// ============================================================
// Full Escalation Check
// ============================================================

/**
 * Run full escalation and victory check.
 * Called after all world updates are applied.
 */
export async function runEscalationCheck(
  scopeId: string
): Promise<EscalationState> {
  // Get all district shares
  const districtSharesData = await getAllDistrictShares(scopeId);

  // Build shares map
  const districtSharesMap = new Map<string, DistrictShares>();
  for (const data of districtSharesData) {
    districtSharesMap.set(data.districtId, data.shares);
  }

  // Compute faction tiers
  const factionTiers = computeFactionTiers(districtSharesMap);

  // Analyze district leaders
  const districtLeaders = analyzeDistrictLeaders(districtSharesMap);

  // Update victory streak and check for winner
  const victoryState = await updateVictoryStreakAndWinner(scopeId, districtLeaders);

  return {
    worldTurn: victoryState.worldTurn,
    factionTiers,
    districtLeaders,
    victoryState,
  };
}

/**
 * Get current escalation state without modifying victory streak.
 * Useful for initial page load.
 */
export async function getEscalationState(
  scopeId: string
): Promise<EscalationState | null> {
  // Get all district shares
  const districtSharesData = await getAllDistrictShares(scopeId);

  if (districtSharesData.length === 0) {
    return null;
  }

  // Build shares map
  const districtSharesMap = new Map<string, DistrictShares>();
  for (const data of districtSharesData) {
    districtSharesMap.set(data.districtId, data.shares);
  }

  // Compute faction tiers
  const factionTiers = computeFactionTiers(districtSharesMap);

  // Analyze district leaders
  const districtLeaders = analyzeDistrictLeaders(districtSharesMap);

  // Get current world state (read-only)
  const worldState = await getWorldState(scopeId);
  const candidateFactionId = checkWinCandidate(districtLeaders);
  const winnerFaction = worldState.winnerFactionId ? getFactionById(worldState.winnerFactionId) : null;

  const victoryState: VictoryCheckResult = {
    victory: !!worldState.winnerFactionId,
    winnerFactionId: worldState.winnerFactionId,
    winnerFactionName: winnerFaction?.name ?? null,
    winStreakFactionId: worldState.winStreakFactionId,
    winStreakCount: worldState.winStreakCount,
    wonAtTurn: worldState.wonAtTurn,
    worldTurn: worldState.worldTurn,
    candidateFactionId,
  };

  return {
    worldTurn: worldState.worldTurn,
    factionTiers,
    districtLeaders,
    victoryState,
  };
}

/**
 * Get faction tier by ID from computed tiers.
 */
export function getFactionTierById(
  factionId: string,
  factionTiers: FactionTierInfo[]
): FactionTier {
  const tierInfo = factionTiers.find(t => t.factionId === factionId);
  return tierInfo?.tier ?? 0;
}
