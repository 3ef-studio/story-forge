/**
 * World Reactions System
 *
 * After each encounter resolution, applies:
 * 1) Ripple: a small control shift in ONE adjacent district
 * 2) Counter-move: a small control shift in ONE other district elsewhere
 *
 * Enhanced features:
 * - Weighted multi-faction counter selection (not just player's main rival)
 * - Forced "third-party" counter move every 3rd world turn
 * - Spillover ripple that sometimes benefits a third faction (30% chance)
 * - Cooldown tracking to prevent same faction acting repeatedly
 *
 * This is a post-resolution world reaction step. It does NOT change
 * encounter/combat selection or resolution math.
 */

import { prisma } from '@/app/lib/db';
import { districts, getDistrictById, getAdjacentDistrictIds, type DistrictId } from '@/app/data/districts';
import { controllableFactions, getFactionById, type Faction } from '@/app/data/factions';
import { getDistrictStates, canFactionControlDistrict, type EncounterOutcome, type DistrictShares, type DistrictLeader } from '@/app/lib/game-logic/district-state';
import { applyControlModifier } from './applyDistrictModifiers';
import { createSeededRng, weightedSelect, checkProbability } from './seededRng';
import {
  applyControlGain,
  applyControlLoss,
  getOrInitDistrictShares,
} from './districtControlShares';

// ============================================================
// Types
// ============================================================

export type WorldUpdateReason = 'primary' | 'ripple' | 'counter';

export interface WorldReactionUpdate {
  districtId: string;
  districtName: string;
  delta: number;
  deltaApplied: number;
  previousControlValue: number;
  newControlValue: number;
  previousControllingFactionId: string | null;
  controllingFactionId: string | null;
  controllingFactionName: string | null;
  reason: WorldUpdateReason;
  factionId: string;
  factionName: string;
  sharesAfter: DistrictShares;
  leaderAfter: DistrictLeader;
}

export interface WorldReactionsResult {
  rippleUpdate: WorldReactionUpdate | null;
  counterUpdate: WorldReactionUpdate | null;
}

export interface ApplyWorldReactionsInput {
  characterId: string;
  encounterDistrictId: string;
  playerFactionId: string | null;
  outcome: EncounterOutcome;
}

interface WorldStateRecord {
  id: string;
  scopeId: string;
  worldTurn: number;
  lastCounterFactionId: string | null;
  lastCounterTurn: number | null;
}

interface DistrictStateSnapshot {
  districtId: string;
  controlValue: number;
  controllingFactionId: string | null;
}

interface FactionCityShare {
  factionId: string;
  points: number;
  share: number;
}

// ============================================================
// Constants
// ============================================================

const RIPPLE_DELTA_SUCCESS = 3;
const RIPPLE_DELTA_FAILURE = -3;
const COUNTER_DELTA = 5;

// Control thresholds (same as primary update logic)
const CONTROL_THRESHOLD_HIGH = 60;
const CONTROL_THRESHOLD_LOW = 40;

// Weight formula constants
const WEIGHT_BASE = 1.0;
const UNDERDOG_BOOST_LOW = 0.8;     // share < 20%
const UNDERDOG_BOOST_MID = 0.3;     // share < 35%
const ANTI_PLAYER_BIAS = 0.4;       // if faction is enemy of player
const AFFINITY_MULTIPLIER = 0.5;    // multiplied by district affinity
const COOLDOWN_PENALTY = 0.9;       // if acted within last 2 turns

// Ripple spillover probability
const RIPPLE_SPILLOVER_CHANCE = 0.30;

// ============================================================
// World State Management
// ============================================================

/**
 * Get or create the WorldState for a character scope.
 * Returns the current worldTurn and cooldown info.
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
        lastCounterFactionId: null,
        lastCounterTurn: null,
      },
    });
  }

  return worldState as WorldStateRecord;
}

/**
 * Increment worldTurn and update cooldown tracking.
 */
async function updateWorldState(
  scopeId: string,
  newTurn: number,
  counterFactionId: string | null
): Promise<void> {
  await prisma.worldState.update({
    where: { scopeId },
    data: {
      worldTurn: newTurn,
      lastCounterFactionId: counterFactionId,
      lastCounterTurn: counterFactionId ? newTurn : undefined,
    },
  });
}

// ============================================================
// City Share Computation
// ============================================================

/**
 * Compute city control shares for each controllable faction.
 * Share = sum(controlValue) for districts where controllingFactionId == factionId
 */
function computeCityShares(
  districtStates: DistrictStateSnapshot[]
): FactionCityShare[] {
  const factionPoints: Record<string, number> = {};

  // Initialize all controllable factions with 0 points
  for (const faction of controllableFactions) {
    factionPoints[faction.id] = 0;
  }

  // Sum up points for each controlling faction
  for (const state of districtStates) {
    if (state.controllingFactionId && factionPoints[state.controllingFactionId] !== undefined) {
      factionPoints[state.controllingFactionId] += state.controlValue;
    }
  }

  // Compute total points
  const totalPoints = Object.values(factionPoints).reduce((sum, p) => sum + p, 0);

  // Build shares array
  return controllableFactions.map(faction => ({
    factionId: faction.id,
    points: factionPoints[faction.id],
    share: totalPoints > 0 ? factionPoints[faction.id] / totalPoints : 0,
  }));
}

// ============================================================
// Weighted Counter Faction Selection
// ============================================================

/**
 * Compute weight for a candidate counter faction.
 */
function computeFactionWeight(
  faction: Faction,
  cityShares: FactionCityShare[],
  playerFactionId: string,
  targetDistrictId: string,
  worldState: WorldStateRecord
): number {
  // Get faction's city share
  const shareInfo = cityShares.find(s => s.factionId === faction.id);
  const share = shareInfo?.share ?? 0;

  // Base weight
  let weight = WEIGHT_BASE;

  // Underdog boost
  if (share < 0.20) {
    weight += UNDERDOG_BOOST_LOW;
  } else if (share < 0.35) {
    weight += UNDERDOG_BOOST_MID;
  }

  // Anti-player bias (if faction is enemy of player's faction)
  const playerFaction = getFactionById(playerFactionId);
  if (playerFaction?.enemies?.includes(faction.id)) {
    weight += ANTI_PLAYER_BIAS;
  }

  // Affinity boost from target district
  const district = getDistrictById(targetDistrictId);
  if (district?.factionAffinities) {
    const affinity = district.factionAffinities[faction.id] ?? 0;
    weight += affinity * AFFINITY_MULTIPLIER;
  }

  // Cooldown penalty
  if (
    worldState.lastCounterFactionId === faction.id &&
    worldState.lastCounterTurn !== null &&
    (worldState.worldTurn - worldState.lastCounterTurn) <= 2
  ) {
    weight -= COOLDOWN_PENALTY;
  }

  return Math.max(0, weight);
}

/**
 * Select a counter faction using weighted selection.
 *
 * @param candidates - Array of candidate factions
 * @param cityShares - City control shares
 * @param playerFactionId - Player's faction ID
 * @param targetDistrictId - The district being targeted
 * @param worldState - Current world state
 * @param rng - Seeded RNG function
 */
function selectCounterFaction(
  candidates: Faction[],
  cityShares: FactionCityShare[],
  playerFactionId: string,
  targetDistrictId: string,
  worldState: WorldStateRecord,
  rng: () => number
): Faction | null {
  if (candidates.length === 0) return null;

  const weights = candidates.map(faction =>
    computeFactionWeight(faction, cityShares, playerFactionId, targetDistrictId, worldState)
  );

  return weightedSelect(candidates, weights, rng);
}

/**
 * Get the "main rival" faction for the player.
 * This is the first enemy in the enemies list that can control districts.
 */
function getMainRival(playerFactionId: string): string | null {
  const playerFaction = getFactionById(playerFactionId);
  if (!playerFaction?.enemies) return null;

  for (const enemyId of playerFaction.enemies) {
    if (canFactionControlDistrict(enemyId)) {
      return enemyId;
    }
  }

  return null;
}

/**
 * Select counter faction with third-party forcing every 3 turns.
 */
function selectCounterFactionWithThirdParty(
  playerFactionId: string,
  cityShares: FactionCityShare[],
  targetDistrictId: string,
  worldState: WorldStateRecord,
  rng: () => number
): Faction | null {
  const isThirdPartyTurn = worldState.worldTurn % 3 === 0;
  const mainRivalId = getMainRival(playerFactionId);

  // Get all candidate factions (excluding player)
  let candidates = controllableFactions.filter(f => f.id !== playerFactionId);

  if (candidates.length === 0) return null;

  // On third-party turns, exclude the main rival if possible
  if (isThirdPartyTurn && mainRivalId) {
    const thirdPartyCandidates = candidates.filter(f => f.id !== mainRivalId);
    if (thirdPartyCandidates.length > 0) {
      candidates = thirdPartyCandidates;
      console.log(`[WorldReactions] Third-party turn (turn ${worldState.worldTurn}): excluding main rival ${mainRivalId}`);
    }
  }

  return selectCounterFaction(candidates, cityShares, playerFactionId, targetDistrictId, worldState, rng);
}

// ============================================================
// Ripple Faction Selection (Spillover)
// ============================================================

/**
 * Select which faction the ripple effect benefits/harms.
 *
 * 70% chance: player faction
 * 30% chance: a third faction (selected by affinity/weight)
 */
function selectRippleFaction(
  playerFactionId: string,
  targetDistrictId: string,
  rng: () => number
): Faction | null {
  const playerFaction = getFactionById(playerFactionId);
  if (!playerFaction) return null;

  // Check if spillover occurs
  if (!checkProbability(RIPPLE_SPILLOVER_CHANCE, rng)) {
    return playerFaction; // 70% case: player faction
  }

  // 30% case: select a third faction
  const thirdPartyCandidates = controllableFactions.filter(f => f.id !== playerFactionId);
  if (thirdPartyCandidates.length === 0) return playerFaction;

  // Weight by district affinity
  const district = getDistrictById(targetDistrictId);
  const weights = thirdPartyCandidates.map(faction => {
    let weight = 1.0;
    if (district?.factionAffinities) {
      const affinity = district.factionAffinities[faction.id] ?? 0;
      weight += affinity * 2.0; // Boost affinity influence for ripple
    }
    return Math.max(0.1, weight); // Ensure minimum weight
  });

  const selected = weightedSelect(thirdPartyCandidates, weights, rng);
  if (selected) {
    console.log(`[WorldReactions] Ripple spillover to ${selected.shortName} in ${district?.name ?? targetDistrictId}`);
  }
  return selected ?? playerFaction;
}

// ============================================================
// Helpers
// ============================================================

// ============================================================
// Target Selection Logic
// ============================================================

/**
 * Pick which adjacent district to apply the ripple effect to.
 *
 * Priority:
 * 1. Prefer contested/neutral districts (controllingFactionId == null)
 * 2. Else pick the one closest to takeover threshold
 * 3. Deterministic tie-breaker (first in stable order)
 */
function pickRippleTarget(
  adjacentIds: DistrictId[],
  stateByDistrict: Map<string, { controlValue: number; controllingFactionId: string | null }>,
  rippleDelta: number
): string | null {
  if (adjacentIds.length === 0) return null;

  // Get states for adjacent districts
  const candidates = adjacentIds
    .map(id => {
      const state = stateByDistrict.get(id);
      return state ? { id, state } : null;
    })
    .filter((c): c is { id: DistrictId; state: { controlValue: number; controllingFactionId: string | null } } => c !== null);

  if (candidates.length === 0) return null;

  // Separate contested vs controlled
  const contested = candidates.filter(c => c.state.controllingFactionId === null);
  const controlled = candidates.filter(c => c.state.controllingFactionId !== null);

  // Prefer contested districts
  if (contested.length > 0) {
    // Among contested, pick the one closest to threshold
    // If rippleDelta > 0, we want to push toward 60 (control)
    // If rippleDelta < 0, we want to push toward 40 (contested stays contested)
    const target = rippleDelta > 0
      ? contested.reduce((best, c) => {
          const distToThreshold = CONTROL_THRESHOLD_HIGH - c.state.controlValue;
          const bestDist = CONTROL_THRESHOLD_HIGH - best.state.controlValue;
          return distToThreshold < bestDist ? c : best;
        })
      : contested[0]; // For negative delta, just pick first contested

    return target.id;
  }

  // No contested districts, pick controlled one closest to threshold
  if (controlled.length > 0) {
    const target = rippleDelta > 0
      ? controlled.reduce((best, c) => {
          const distToThreshold = CONTROL_THRESHOLD_HIGH - c.state.controlValue;
          const bestDist = CONTROL_THRESHOLD_HIGH - best.state.controlValue;
          return distToThreshold < bestDist ? c : best;
        })
      : controlled.reduce((best, c) => {
          const distToThreshold = c.state.controlValue - CONTROL_THRESHOLD_LOW;
          const bestDist = best.state.controlValue - CONTROL_THRESHOLD_LOW;
          return distToThreshold < bestDist ? c : best;
        });

    return target.id;
  }

  return null;
}

/**
 * Pick which district the counter faction should target.
 *
 * Constraints:
 * - Must NOT be the encounter's district
 * - Avoid the ripple district if possible
 *
 * Priority:
 * 1. Districts where controllingFactionId is null (contested)
 * 2. Districts already controlled by the counter faction (consolidation)
 * 3. Deterministic tie-breaker
 */
function pickCounterTarget(
  encounterDistrictId: string,
  rippleDistrictId: string | null,
  counterFactionId: string,
  stateByDistrict: Map<string, { controlValue: number; controllingFactionId: string | null }>
): string | null {
  // Get all district IDs from the data
  const allDistrictIds = districts.map(d => d.id);

  // Filter out encounter district and (if possible) ripple district
  const candidates = allDistrictIds.filter(id => id !== encounterDistrictId);

  // Get states for candidates
  const candidatesWithState = candidates
    .map(id => {
      const state = stateByDistrict.get(id);
      return state ? { id: id as string, state } : null;
    })
    .filter((c): c is { id: string; state: { controlValue: number; controllingFactionId: string | null } } => c !== null);

  if (candidatesWithState.length === 0) return null;

  // Separate by priority
  const contested = candidatesWithState.filter(c => c.state.controllingFactionId === null);
  const ownedByCounter = candidatesWithState.filter(c => c.state.controllingFactionId === counterFactionId);
  const otherControlled = candidatesWithState.filter(
    c => c.state.controllingFactionId !== null && c.state.controllingFactionId !== counterFactionId
  );

  // Helper to pick best from a list, avoiding ripple district if possible
  function pickBest(list: { id: string; state: { controlValue: number } }[]): string | null {
    if (list.length === 0) return null;

    // Try to avoid ripple district
    const filtered = rippleDistrictId ? list.filter(c => c.id !== rippleDistrictId) : list;
    const pool = filtered.length > 0 ? filtered : list;

    // Pick the one with lowest control value (easiest to push toward takeover)
    const best = pool.reduce((a, b) => a.state.controlValue < b.state.controlValue ? a : b);
    return best.id;
  }

  // Priority order: contested > owned by counter > other
  let result = pickBest(contested);
  if (result) return result;

  result = pickBest(ownedByCounter);
  if (result) return result;

  result = pickBest(otherControlled);
  return result;
}

// ============================================================
// Main Function
// ============================================================

/**
 * Apply world reactions after an encounter resolves.
 *
 * This should be called exactly once per encounter resolution,
 * immediately after the PRIMARY district update.
 *
 * @returns WorldReactionsResult with ripple and counter updates (if any)
 */
export async function applyWorldReactions(
  input: ApplyWorldReactionsInput
): Promise<WorldReactionsResult> {
  const { characterId, encounterDistrictId, playerFactionId, outcome } = input;

  const result: WorldReactionsResult = {
    rippleUpdate: null,
    counterUpdate: null,
  };

  // If character is not in a faction, no world reactions
  if (!playerFactionId) {
    return result;
  }

  // Validate faction can control districts
  if (!canFactionControlDistrict(playerFactionId)) {
    return result;
  }

  // Get or create world state for this character scope
  const worldState = await getWorldState(characterId);
  const newTurn = worldState.worldTurn + 1;

  // Create seeded RNGs for deterministic selection
  const counterRng = createSeededRng(`${characterId}-${newTurn}-counter`);
  const rippleRng = createSeededRng(`${characterId}-${newTurn}-ripple`);

  // Ensure all district states exist for this character
  await getDistrictStates(characterId);

  // Load all district states for this character
  const allDistrictStates = await prisma.districtState.findMany({
    where: { characterId },
  });

  // Create a map for quick lookup
  const stateByDistrict = new Map(
    allDistrictStates.map(s => [s.districtId, s])
  );

  // Build snapshot for city share computation
  const districtSnapshots: DistrictStateSnapshot[] = allDistrictStates.map(s => ({
    districtId: s.districtId,
    controlValue: s.controlValue,
    controllingFactionId: s.controllingFactionId,
  }));

  // Compute city control shares
  const cityShares = computeCityShares(districtSnapshots);

  // Track which district was used for ripple (to avoid using same for counter)
  let rippleDistrictId: string | null = null;

  // ============================================================
  // A) Ripple Effect (adjacent district pressure)
  // ============================================================

  const adjacentIds = getAdjacentDistrictIds(encounterDistrictId as DistrictId);

  if (adjacentIds.length > 0) {
    // Calculate base ripple delta based on outcome
    const baseRippleDelta = outcome === 'success' || outcome === 'partial'
      ? RIPPLE_DELTA_SUCCESS
      : RIPPLE_DELTA_FAILURE;

    // Pick the best adjacent district
    const targetAdjacentId = pickRippleTarget(adjacentIds, stateByDistrict, baseRippleDelta);

    if (targetAdjacentId) {
      rippleDistrictId = targetAdjacentId;

      // Get current shares for comparison
      const { shares: sharesBefore, leader: leaderBefore } = await getOrInitDistrictShares(characterId, targetAdjacentId);

      // Select which faction the ripple affects (player or third-party spillover)
      const rippleFaction = selectRippleFaction(playerFactionId, targetAdjacentId, rippleRng);
      const rippleFactionId = rippleFaction?.id ?? playerFactionId;

      // Apply district-specific modifier to the ripple delta
      const rippleDelta = applyControlModifier(baseRippleDelta, targetAdjacentId, 'ripple');

      // Apply gain or loss using share-based system
      let shareResult;
      if (rippleDelta > 0) {
        // Success: faction gains control
        shareResult = await applyControlGain(characterId, targetAdjacentId, rippleFactionId, rippleDelta, 'ripple');
      } else {
        // Failure: faction loses control
        shareResult = await applyControlLoss(characterId, targetAdjacentId, rippleFactionId, Math.abs(rippleDelta), 'ripple');
      }

      // Get display names
      const district = getDistrictById(targetAdjacentId);
      const faction = getFactionById(rippleFactionId);
      const controllingFaction = shareResult.leaderAfter.leaderFactionId
        ? getFactionById(shareResult.leaderAfter.leaderFactionId)
        : null;

      result.rippleUpdate = {
        districtId: targetAdjacentId,
        districtName: district?.name ?? targetAdjacentId,
        delta: rippleDelta,
        deltaApplied: shareResult.deltaApplied,
        previousControlValue: leaderBefore.leaderShare,
        newControlValue: shareResult.leaderAfter.leaderShare,
        previousControllingFactionId: leaderBefore.leaderFactionId,
        controllingFactionId: shareResult.leaderAfter.leaderFactionId,
        controllingFactionName: controllingFaction?.name ?? null,
        reason: 'ripple',
        factionId: rippleFactionId,
        factionName: faction?.name ?? rippleFactionId,
        sharesAfter: shareResult.sharesAfter,
        leaderAfter: shareResult.leaderAfter,
      };

      const isSpillover = rippleFactionId !== playerFactionId;
      console.log(
        `[WorldReactions] Ripple${isSpillover ? ' (spillover)' : ''}: ${faction?.shortName ?? rippleFactionId} ` +
        `${rippleDelta > 0 ? '+' : ''}${shareResult.deltaApplied} in ${district?.name ?? targetAdjacentId}`
      );
    }
  }

  // ============================================================
  // B) Counter-Move (city reacts elsewhere)
  // ============================================================

  // First, pick a target district for the counter-move (needed for affinity calculation)
  const preliminaryCounterTarget = pickCounterTarget(
    encounterDistrictId,
    rippleDistrictId,
    '', // We don't know the faction yet, but we can pick based on contested priority
    stateByDistrict
  );

  // Select counter faction using weighted system with third-party forcing
  const counterFaction = preliminaryCounterTarget
    ? selectCounterFactionWithThirdParty(
        playerFactionId,
        cityShares,
        preliminaryCounterTarget,
        worldState,
        counterRng
      )
    : null;

  if (counterFaction) {
    // Now pick the actual target district for this specific counter faction
    const counterTarget = pickCounterTarget(
      encounterDistrictId,
      rippleDistrictId,
      counterFaction.id,
      stateByDistrict
    );

    if (counterTarget) {
      // Get current shares for comparison
      const { shares: sharesBefore, leader: leaderBefore } = await getOrInitDistrictShares(characterId, counterTarget);

      // Apply district-specific modifier to the counter delta
      const counterDelta = applyControlModifier(COUNTER_DELTA, counterTarget, 'counter');

      // Apply counter gain using share-based system
      const shareResult = await applyControlGain(characterId, counterTarget, counterFaction.id, counterDelta, 'counter');

      // Get display names
      const district = getDistrictById(counterTarget);
      const controllingFaction = shareResult.leaderAfter.leaderFactionId
        ? getFactionById(shareResult.leaderAfter.leaderFactionId)
        : null;

      result.counterUpdate = {
        districtId: counterTarget,
        districtName: district?.name ?? counterTarget,
        delta: counterDelta,
        deltaApplied: shareResult.deltaApplied,
        previousControlValue: leaderBefore.leaderShare,
        newControlValue: shareResult.leaderAfter.leaderShare,
        previousControllingFactionId: leaderBefore.leaderFactionId,
        controllingFactionId: shareResult.leaderAfter.leaderFactionId,
        controllingFactionName: controllingFaction?.name ?? null,
        reason: 'counter',
        factionId: counterFaction.id,
        factionName: counterFaction.name,
        sharesAfter: shareResult.sharesAfter,
        leaderAfter: shareResult.leaderAfter,
      };

      console.log(
        `[WorldReactions] Counter (turn ${newTurn}): ${counterFaction.shortName} +${shareResult.deltaApplied} in ${district?.name ?? counterTarget}`
      );
    }
  }

  // ============================================================
  // C) Update World State
  // ============================================================

  await updateWorldState(
    characterId,
    newTurn,
    counterFaction?.id ?? null
  );

  console.log(`[WorldReactions] World turn: ${worldState.worldTurn} → ${newTurn}`);

  return result;
}
