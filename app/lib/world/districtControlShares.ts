/**
 * District Control Shares System
 *
 * Multi-faction share-based control for districts.
 * Each controllable faction has a share (0..100), plus an "uncontrolled" share.
 * Sum of all shares always equals 100.
 *
 * Control gains:
 * 1. Decrease uncontrolled first
 * 2. If uncontrolled == 0, decrease the faction with highest share (excluding gainer)
 *
 * Control losses:
 * - Increase uncontrolled by the loss amount
 */

import { prisma } from '@/app/lib/db';
import { controllableFactions, getFactionById } from '@/app/data/factions';
import { getDistrictById } from '@/app/data/districts';

// ============================================================
// Types
// ============================================================

export type ControlUpdateReason = 'primary' | 'ripple' | 'counter' | 'death';

export interface DistrictShares {
  [controllerId: string]: number; // controllerId is factionId or 'uncontrolled'
}

export interface DistrictLeader {
  leaderFactionId: string | null; // null if no clear leader
  leaderShare: number;
  status: 'controlled' | 'contested';
}

export interface ShareUpdateResult {
  districtId: string;
  districtName: string;
  reason: ControlUpdateReason;
  factionId: string;
  factionName: string;
  deltaRequested: number;
  deltaApplied: number;
  sharesBefore: DistrictShares;
  sharesAfter: DistrictShares;
  leaderBefore: DistrictLeader;
  leaderAfter: DistrictLeader;
  donorFactionId?: string; // If uncontrolled was 0, which faction donated
  donorAmount?: number;
}

// ============================================================
// Constants
// ============================================================

const UNCONTROLLED_ID = 'uncontrolled';
const LEADER_THRESHOLD = 50; // Faction needs >= 50% to be "in control"

// Get controllable faction IDs (cached)
const CONTROLLABLE_FACTION_IDS = controllableFactions.map(f => f.id);

// ============================================================
// Helpers
// ============================================================

/**
 * Clamp a value to [0, 100]
 */
function clamp(value: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Initialize default shares: 100% uncontrolled, 0% for all factions
 */
export function createDefaultShares(): DistrictShares {
  const shares: DistrictShares = {
    [UNCONTROLLED_ID]: 100,
  };
  for (const factionId of CONTROLLABLE_FACTION_IDS) {
    shares[factionId] = 0;
  }
  return shares;
}

/**
 * Normalize shares to ensure they sum to exactly 100.
 * Handles floating point issues and ensures integers.
 */
function normalizeShares(shares: DistrictShares): DistrictShares {
  const result: DistrictShares = {};
  let total = 0;

  // First pass: clamp all values to [0, 100] and round to integers
  for (const [key, value] of Object.entries(shares)) {
    result[key] = clamp(Math.round(value));
    total += result[key];
  }

  // If sum != 100, adjust uncontrolled (or largest share if uncontrolled is 0)
  if (total !== 100) {
    const diff = 100 - total;
    if (result[UNCONTROLLED_ID] !== undefined && result[UNCONTROLLED_ID] + diff >= 0) {
      result[UNCONTROLLED_ID] = clamp(result[UNCONTROLLED_ID] + diff);
    } else {
      // Find the largest share to adjust
      let maxKey = UNCONTROLLED_ID;
      let maxVal = result[UNCONTROLLED_ID] ?? 0;
      for (const [key, val] of Object.entries(result)) {
        if (val > maxVal) {
          maxKey = key;
          maxVal = val;
        }
      }
      result[maxKey] = clamp(result[maxKey] + diff);
    }
  }

  return result;
}

/**
 * Migrate old-format district state to new share-based format.
 * Old format: controllingFactionId + controlValue
 * New format: shares JSON
 *
 * Migration rules:
 * - If controllingFactionId is set: that faction gets controlValue, uncontrolled gets rest
 * - If controllingFactionId is null: uncontrolled gets 100, others get 0
 */
function migrateOldFormat(
  controllingFactionId: string | null,
  controlValue: number
): DistrictShares {
  const shares = createDefaultShares();

  if (controllingFactionId && CONTROLLABLE_FACTION_IDS.includes(controllingFactionId)) {
    // Old format had this faction controlling with controlValue
    const factionShare = clamp(controlValue);
    shares[controllingFactionId] = factionShare;
    shares[UNCONTROLLED_ID] = 100 - factionShare;
  }
  // else: district was contested, keep 100% uncontrolled

  return normalizeShares(shares);
}

/**
 * Parse shares from database (JSON field) or migrate from old format.
 */
function parseShares(
  sharesJson: unknown,
  controllingFactionId: string | null,
  controlValue: number
): DistrictShares {
  if (sharesJson && typeof sharesJson === 'object' && !Array.isArray(sharesJson)) {
    // Already in new format
    const parsed = sharesJson as Record<string, unknown>;
    const shares: DistrictShares = {};

    // Ensure all controllable factions and uncontrolled are present
    shares[UNCONTROLLED_ID] = typeof parsed[UNCONTROLLED_ID] === 'number'
      ? parsed[UNCONTROLLED_ID]
      : 0;

    for (const factionId of CONTROLLABLE_FACTION_IDS) {
      shares[factionId] = typeof parsed[factionId] === 'number'
        ? parsed[factionId]
        : 0;
    }

    return normalizeShares(shares);
  }

  // Migrate from old format
  return migrateOldFormat(controllingFactionId, controlValue);
}

/**
 * Compute the district leader from shares.
 */
export function computeDistrictLeader(shares: DistrictShares): DistrictLeader {
  let maxFactionId: string | null = null;
  let maxShare = 0;

  // Find the faction with the highest share (excluding uncontrolled)
  for (const factionId of CONTROLLABLE_FACTION_IDS) {
    const share = shares[factionId] ?? 0;
    if (share > maxShare) {
      maxShare = share;
      maxFactionId = factionId;
    }
  }

  // Determine status
  const status: 'controlled' | 'contested' = maxShare >= LEADER_THRESHOLD
    ? 'controlled'
    : 'contested';

  return {
    leaderFactionId: maxFactionId,
    leaderShare: maxShare,
    status,
  };
}

// ============================================================
// Main API
// ============================================================

/**
 * Get or initialize district shares for a given scope and district.
 * Handles lazy migration from old format if needed.
 */
export async function getOrInitDistrictShares(
  scopeId: string, // characterId
  districtId: string
): Promise<{ shares: DistrictShares; leader: DistrictLeader }> {
  let districtState = await prisma.districtState.findUnique({
    where: {
      characterId_districtId: { characterId: scopeId, districtId },
    },
  });

  if (!districtState) {
    // District state doesn't exist - create with default shares
    const shares = createDefaultShares();
    const leader = computeDistrictLeader(shares);

    districtState = await prisma.districtState.create({
      data: {
        characterId: scopeId,
        districtId,
        controllingFactionId: leader.leaderFactionId,
        controlValue: leader.leaderShare,
        instability: 0,
        shares: shares as object,
      },
    });

    return { shares, leader };
  }

  // Parse or migrate shares
  const shares = parseShares(
    districtState.shares,
    districtState.controllingFactionId,
    districtState.controlValue
  );
  const leader = computeDistrictLeader(shares);

  // If we migrated (shares was null), persist the new format
  if (!districtState.shares) {
    await prisma.districtState.update({
      where: {
        characterId_districtId: { characterId: scopeId, districtId },
      },
      data: {
        shares: shares as object,
        controllingFactionId: leader.leaderFactionId,
        controlValue: leader.leaderShare,
      },
    });
  }

  return { shares, leader };
}

/**
 * Apply a control GAIN to a district.
 * The gaining faction increases its share.
 *
 * Algorithm:
 * 1. Take from uncontrolled first (up to uncontrolled amount)
 * 2. If remaining > 0, take from the faction with highest share (excluding gainer)
 * 3. Increase gaining faction by total taken
 */
export async function applyControlGain(
  scopeId: string,
  districtId: string,
  gainingFactionId: string,
  delta: number,
  reason: ControlUpdateReason
): Promise<ShareUpdateResult> {
  // Get current shares
  const { shares: sharesBefore, leader: leaderBefore } = await getOrInitDistrictShares(scopeId, districtId);

  // Copy shares for modification
  const sharesAfter = { ...sharesBefore };

  // Validate faction
  if (!CONTROLLABLE_FACTION_IDS.includes(gainingFactionId)) {
    throw new Error(`Invalid gaining faction: ${gainingFactionId}`);
  }

  // Calculate how much to take
  const positiveDelta = Math.abs(delta);
  let remaining = positiveDelta;
  let donorFactionId: string | undefined;
  let donorAmount: number | undefined;

  // 1. Take from uncontrolled first
  const uncontrolledShare = sharesAfter[UNCONTROLLED_ID] ?? 0;
  const takeFromUncontrolled = Math.min(uncontrolledShare, remaining);
  sharesAfter[UNCONTROLLED_ID] = uncontrolledShare - takeFromUncontrolled;
  remaining -= takeFromUncontrolled;

  // 2. If remaining > 0, take from highest-share faction (excluding gainer)
  if (remaining > 0) {
    // Find the faction with highest share (excluding gaining faction)
    let maxShare = 0;
    let donorId: string | null = null;

    for (const factionId of CONTROLLABLE_FACTION_IDS) {
      if (factionId === gainingFactionId) continue;
      const share = sharesAfter[factionId] ?? 0;
      if (share > maxShare) {
        maxShare = share;
        donorId = factionId;
      }
    }

    if (donorId && maxShare > 0) {
      const takeFromDonor = Math.min(maxShare, remaining);
      sharesAfter[donorId] = (sharesAfter[donorId] ?? 0) - takeFromDonor;
      remaining -= takeFromDonor;
      donorFactionId = donorId;
      donorAmount = takeFromDonor;
    }
  }

  // 3. Increase gaining faction
  const actualGain = positiveDelta - remaining;
  sharesAfter[gainingFactionId] = (sharesAfter[gainingFactionId] ?? 0) + actualGain;

  // Normalize to ensure sum = 100
  const normalizedShares = normalizeShares(sharesAfter);
  const leaderAfter = computeDistrictLeader(normalizedShares);

  // Persist to database
  await prisma.districtState.update({
    where: {
      characterId_districtId: { characterId: scopeId, districtId },
    },
    data: {
      shares: normalizedShares as object,
      controllingFactionId: leaderAfter.leaderFactionId,
      controlValue: leaderAfter.leaderShare,
    },
  });

  // Build result
  const district = getDistrictById(districtId);
  const faction = getFactionById(gainingFactionId);

  console.log(
    `[DistrictShares] GAIN: ${faction?.shortName ?? gainingFactionId} +${actualGain} in ${district?.name ?? districtId} (${reason}). ` +
    `Leader: ${leaderAfter.leaderFactionId ?? 'none'} ${leaderAfter.leaderShare}% (${leaderAfter.status})`
  );

  return {
    districtId,
    districtName: district?.name ?? districtId,
    reason,
    factionId: gainingFactionId,
    factionName: faction?.name ?? gainingFactionId,
    deltaRequested: delta,
    deltaApplied: actualGain,
    sharesBefore,
    sharesAfter: normalizedShares,
    leaderBefore,
    leaderAfter,
    donorFactionId,
    donorAmount,
  };
}

/**
 * Apply a control LOSS to a district.
 * The losing faction decreases its share, uncontrolled increases.
 *
 * Algorithm:
 * 1. Take from losing faction (up to its current share)
 * 2. Add to uncontrolled
 */
export async function applyControlLoss(
  scopeId: string,
  districtId: string,
  losingFactionId: string,
  delta: number,
  reason: ControlUpdateReason
): Promise<ShareUpdateResult> {
  // Get current shares
  const { shares: sharesBefore, leader: leaderBefore } = await getOrInitDistrictShares(scopeId, districtId);

  // Copy shares for modification
  const sharesAfter = { ...sharesBefore };

  // Validate faction
  if (!CONTROLLABLE_FACTION_IDS.includes(losingFactionId)) {
    throw new Error(`Invalid losing faction: ${losingFactionId}`);
  }

  // Calculate how much to take
  const positiveDelta = Math.abs(delta);
  const currentShare = sharesAfter[losingFactionId] ?? 0;
  const actualLoss = Math.min(currentShare, positiveDelta);

  // 1. Decrease losing faction
  sharesAfter[losingFactionId] = currentShare - actualLoss;

  // 2. Increase uncontrolled
  sharesAfter[UNCONTROLLED_ID] = (sharesAfter[UNCONTROLLED_ID] ?? 0) + actualLoss;

  // Normalize to ensure sum = 100
  const normalizedShares = normalizeShares(sharesAfter);
  const leaderAfter = computeDistrictLeader(normalizedShares);

  // Persist to database
  await prisma.districtState.update({
    where: {
      characterId_districtId: { characterId: scopeId, districtId },
    },
    data: {
      shares: normalizedShares as object,
      controllingFactionId: leaderAfter.leaderFactionId,
      controlValue: leaderAfter.leaderShare,
    },
  });

  // Build result
  const district = getDistrictById(districtId);
  const faction = getFactionById(losingFactionId);

  console.log(
    `[DistrictShares] LOSS: ${faction?.shortName ?? losingFactionId} -${actualLoss} in ${district?.name ?? districtId} (${reason}). ` +
    `Leader: ${leaderAfter.leaderFactionId ?? 'none'} ${leaderAfter.leaderShare}% (${leaderAfter.status})`
  );

  return {
    districtId,
    districtName: district?.name ?? districtId,
    reason,
    factionId: losingFactionId,
    factionName: faction?.name ?? losingFactionId,
    deltaRequested: -Math.abs(delta), // Negative to indicate loss
    deltaApplied: -actualLoss,
    sharesBefore,
    sharesAfter: normalizedShares,
    leaderBefore,
    leaderAfter,
  };
}

/**
 * Get all district shares for a character scope.
 * Useful for map display and city control computation.
 */
export async function getAllDistrictShares(
  scopeId: string
): Promise<Array<{
  districtId: string;
  shares: DistrictShares;
  leader: DistrictLeader;
  instability: number;
}>> {
  const districtStates = await prisma.districtState.findMany({
    where: { characterId: scopeId },
  });

  const results = [];

  for (const state of districtStates) {
    const shares = parseShares(
      state.shares,
      state.controllingFactionId,
      state.controlValue
    );
    const leader = computeDistrictLeader(shares);

    // If we migrated, persist
    if (!state.shares) {
      await prisma.districtState.update({
        where: {
          characterId_districtId: { characterId: scopeId, districtId: state.districtId },
        },
        data: {
          shares: shares as object,
          controllingFactionId: leader.leaderFactionId,
          controlValue: leader.leaderShare,
        },
      });
    }

    results.push({
      districtId: state.districtId,
      shares,
      leader,
      instability: state.instability,
    });
  }

  return results;
}

/**
 * Initialize all districts for a new character with default shares.
 */
export async function initializeAllDistrictShares(
  scopeId: string,
  defaultStates: Array<{
    districtId: string;
    factionId: string | null;
    controlValue: number;
    instability: number;
  }>
): Promise<void> {
  for (const state of defaultStates) {
    // Convert old-style defaults to new shares
    const shares = migrateOldFormat(state.factionId, state.controlValue);
    const leader = computeDistrictLeader(shares);

    await prisma.districtState.upsert({
      where: {
        characterId_districtId: { characterId: scopeId, districtId: state.districtId },
      },
      create: {
        characterId: scopeId,
        districtId: state.districtId,
        controllingFactionId: leader.leaderFactionId,
        controlValue: leader.leaderShare,
        instability: state.instability,
        shares: shares as object,
      },
      update: {
        // Only update if shares don't exist yet
        shares: shares as object,
        controllingFactionId: leader.leaderFactionId,
        controlValue: leader.leaderShare,
      },
    });
  }

  console.log(`[DistrictShares] Initialized ${defaultStates.length} districts for scope ${scopeId}`);
}
