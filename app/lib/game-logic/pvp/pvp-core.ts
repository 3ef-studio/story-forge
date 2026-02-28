/**
 * Fight Club (PvP) Core Logic
 *
 * - Snapshot builder for combatants
 * - Elo rating calculator (K=24, start=1000)
 * - Matchmaking logic
 * - Combat simulation runner
 */

import { prisma } from '@/app/lib/db';
import { buildAttributeMap } from '@/app/lib/utils/character-utils';
import type { CombatantSnapshot, EloUpdate, MatchmakingResult, PvpMode } from './types';
import type { PlayerBuildSnapshot } from '../conflict/types';

// ============================================================
// Constants
// ============================================================

export const PVP_ENERGY_COST = 10;
export const PVP_MIN_LEVEL = 5;
export const PVP_ELO_START = 1000;
export const PVP_ELO_K = 24;
export const PVP_RANKED_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
export const PVP_MATCH_RETENTION_DAYS = 30;

// ============================================================
// Elo Rating Calculator
// ============================================================

/**
 * Calculate expected score using Elo formula
 * E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate Elo rating updates for both players
 * @param attackerRating - Attacker's current rating
 * @param defenderRating - Defender's current rating
 * @param attackerWon - true if attacker won
 * @returns New ratings and deltas for both players
 */
export function calculateEloUpdate(
  attackerRating: number,
  defenderRating: number,
  attackerWon: boolean
): EloUpdate {
  const expectedAttacker = expectedScore(attackerRating, defenderRating);
  const expectedDefender = expectedScore(defenderRating, attackerRating);

  const actualAttacker = attackerWon ? 1 : 0;
  const actualDefender = attackerWon ? 0 : 1;

  const attackerDelta = Math.round(PVP_ELO_K * (actualAttacker - expectedAttacker));
  const defenderDelta = Math.round(PVP_ELO_K * (actualDefender - expectedDefender));

  return {
    attackerNewRating: attackerRating + attackerDelta,
    defenderNewRating: defenderRating + defenderDelta,
    attackerDelta,
    defenderDelta,
  };
}

// ============================================================
// Snapshot Builder
// ============================================================

/**
 * Build a combatant snapshot from a character ID.
 * Uses a consistent read (transaction) to avoid in-flight updates.
 * Does not mutate any data.
 */
export async function buildCombatantSnapshot(
  characterId: string
): Promise<CombatantSnapshot | null> {
  return prisma.$transaction(async (tx) => {
    const character = await tx.character.findUnique({
      where: { id: characterId },
      include: {
        attributes: true,
        powers: true,
      },
    });

    if (!character) {
      return null;
    }

    const attributesMap = buildAttributeMap(character.attributes);

    const build: PlayerBuildSnapshot = {
      level: character.level,
      attributes: attributesMap,
      powers: character.powers.map((p) => ({
        powerId: p.powerId,
        level: p.currentLevel,
      })),
    };

    return {
      characterId: character.id,
      characterName: character.name,
      level: character.level,
      pvpRating: (character as { pvpRating?: number }).pvpRating ?? PVP_ELO_START,
      build,
    };
  }, { isolationLevel: 'RepeatableRead' });
}

// ============================================================
// Matchmaking
// ============================================================

/**
 * Fisher-Yates shuffle for fair randomization.
 * Mutates array in-place and returns it.
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Find an eligible defender for PvP.
 * - Must be level >= 5
 * - Must not be the attacker
 * - For ranked: must not have been fought by attacker in last hour
 * - Prefers rating within ±150, widening progressively
 */
export async function findEligibleDefender(
  attackerId: string,
  attackerRating: number,
  mode: PvpMode
): Promise<MatchmakingResult> {
  const debug = process.env.NODE_ENV === 'development';

  // Get all eligible characters (level >= 5, not attacker)
  const eligibleCharacters = await prisma.character.findMany({
    where: {
      id: { not: attackerId },
      level: { gte: PVP_MIN_LEVEL },
    },
    select: {
      id: true,
      name: true,
      level: true,
      pvpRating: true,
    },
  });

  if (debug) {
    console.log(`[PvP Matchmaking] Attacker: ${attackerId}, Rating: ${attackerRating}, Mode: ${mode}`);
    console.log(`[PvP Matchmaking] Eligible characters (level >= ${PVP_MIN_LEVEL}):`,
      eligibleCharacters.map(c => ({ id: c.id, name: c.name, level: c.level, rating: c.pvpRating })));
  }

  if (eligibleCharacters.length === 0) {
    // Also check how many total characters exist for debugging
    if (debug) {
      const allOthers = await prisma.character.findMany({
        where: { id: { not: attackerId } },
        select: { id: true, name: true, level: true },
      });
      console.log(`[PvP Matchmaking] All other characters (any level):`, allOthers);
    }
    return { found: false, error: 'No eligible opponents found' };
  }

  // For ranked mode, filter out characters on cooldown
  let candidates = eligibleCharacters;
  if (mode === 'ranked') {
    const cooldownCutoff = new Date(Date.now() - PVP_RANKED_COOLDOWN_MS);

    // Get recent matches against this attacker
    const recentMatches = await prisma.pvpMatch.findMany({
      where: {
        attackerCharacterId: attackerId,
        mode: 'RANKED',
        createdAt: { gte: cooldownCutoff },
      },
      select: { defenderCharacterId: true },
    });

    if (debug) {
      console.log(`[PvP Matchmaking] Recent ranked matches (cooldown):`, recentMatches);
    }

    const recentDefenderIds = new Set(recentMatches.map((m) => m.defenderCharacterId));
    candidates = eligibleCharacters.filter((c) => !recentDefenderIds.has(c.id));

    if (debug) {
      console.log(`[PvP Matchmaking] Candidates after cooldown filter:`,
        candidates.map(c => ({ id: c.id, name: c.name })));
    }

    if (candidates.length === 0) {
      return { found: false, error: 'All opponents on cooldown. Try unranked or wait.' };
    }
  }

  // Map candidates with rating distance
  const withDistance = candidates.map((c) => ({
    ...c,
    ratingDistance: Math.abs((c.pvpRating ?? PVP_ELO_START) - attackerRating),
  }));

  if (debug) {
    console.log(`[PvP Matchmaking] Final candidates with distance:`,
      withDistance.map(c => ({ id: c.id, name: c.name, distance: c.ratingDistance })));
  }

  // Matchmaking tiers: ±150, ±300, ±500, then any
  const tiers = [150, 300, 500, Infinity];

  for (const maxDistance of tiers) {
    const tierCandidates = withDistance.filter((c) => c.ratingDistance <= maxDistance);
    if (tierCandidates.length > 0) {
      if (debug) {
        console.log(`[PvP Matchmaking] Tier ±${maxDistance}: ${tierCandidates.length} candidates`);
      }

      // Shuffle candidates for fair random selection
      shuffleArray(tierCandidates);

      if (debug) {
        console.log(`[PvP Matchmaking] After shuffle:`,
          tierCandidates.map(c => c.name));
      }

      // Try each candidate until we find one that builds successfully
      for (const candidate of tierCandidates) {
        const snapshot = await buildCombatantSnapshot(candidate.id);
        if (snapshot) {
          if (debug) {
            console.log(`[PvP Matchmaking] Selected: ${snapshot.characterName}`);
          }
          return { found: true, defender: snapshot };
        }
      }
    }
  }

  return { found: false, error: 'No eligible opponents found' };
}

// ============================================================
// Match Record Cleanup
// ============================================================

/**
 * Delete PvP matches older than 30 days.
 * Returns count of deleted records.
 */
export async function cleanupOldMatches(): Promise<number> {
  const cutoff = new Date(Date.now() - PVP_MATCH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.pvpMatch.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  return result.count;
}
