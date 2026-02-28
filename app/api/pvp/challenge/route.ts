/**
 * POST /api/pvp/challenge
 *
 * Initiates a Fight Club (PvP) challenge.
 * - Finds a suitable opponent
 * - Deducts energy
 * - Creates a pending match record
 * - Returns attacker/defender snapshots for conflict UI
 *
 * The actual combat is resolved via /api/pvp/resolve after the player
 * plays through the conflict UI.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  PVP_ENERGY_COST,
  PVP_MIN_LEVEL,
  PVP_ELO_START,
  buildCombatantSnapshot,
  findEligibleDefender,
} from '@/app/lib/game-logic/pvp';
import type { PvpMode, PvpChallengeResult } from '@/app/lib/game-logic/pvp/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChallengeRequestBody {
  mode: PvpMode;
}

function isChallengeRequestBody(value: unknown): value is ChallengeRequestBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.mode === 'ranked' || v.mode === 'unranked';
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!isChallengeRequestBody(rawBody)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "ranked" or "unranked".' },
        { status: 400 }
      );
    }

    const { mode } = rawBody;

    // Load attacker's character
    const attackerCharacter = await prisma.character.findUnique({
      where: { userId: session.user.id },
      include: {
        attributes: true,
        powers: true,
      },
    });

    if (!attackerCharacter) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Validate attacker eligibility
    if (attackerCharacter.level < PVP_MIN_LEVEL) {
      return NextResponse.json(
        { error: `Level ${PVP_MIN_LEVEL}+ required for Fight Club` },
        { status: 400 }
      );
    }

    if (attackerCharacter.currentEnergy < PVP_ENERGY_COST) {
      return NextResponse.json(
        { error: `Not enough energy. Need ${PVP_ENERGY_COST}, have ${attackerCharacter.currentEnergy}.` },
        { status: 400 }
      );
    }

    // Build attacker snapshot
    const attackerSnapshot = await buildCombatantSnapshot(attackerCharacter.id);
    if (!attackerSnapshot) {
      return NextResponse.json({ error: 'Failed to build attacker snapshot' }, { status: 500 });
    }

    // Find eligible defender
    const attackerRating = (attackerCharacter as { pvpRating?: number }).pvpRating ?? PVP_ELO_START;
    const matchmakingResult = await findEligibleDefender(
      attackerCharacter.id,
      attackerRating,
      mode
    );

    if (!matchmakingResult.found || !matchmakingResult.defender) {
      // No match found - don't deduct energy
      return NextResponse.json({
        success: false,
        error: matchmakingResult.error || 'No eligible opponents found',
      } as PvpChallengeResult);
    }

    const defenderSnapshot = matchmakingResult.defender;

    // Create pending match and deduct energy in a transaction
    const matchRecord = await prisma.$transaction(async (tx) => {
      // Deduct energy from attacker
      await tx.character.update({
        where: { id: attackerCharacter.id },
        data: {
          currentEnergy: attackerCharacter.currentEnergy - PVP_ENERGY_COST,
        },
      });

      // Create match record with PENDING status (result will be set by /resolve)
      // We store initial ratings but don't update them yet
      const match = await tx.pvpMatch.create({
        data: {
          mode: mode === 'ranked' ? 'RANKED' : 'UNRANKED',
          attackerCharacterId: attackerCharacter.id,
          defenderCharacterId: defenderSnapshot.characterId,
          attackerRatingBefore: attackerRating,
          defenderRatingBefore: defenderSnapshot.pvpRating,
          // These will be updated when resolved
          attackerRatingAfter: attackerRating,
          defenderRatingAfter: defenderSnapshot.pvpRating,
          ratingDeltaAttacker: 0,
          // Use WIN as placeholder - will be updated by resolve endpoint
          result: 'WIN',
          transcriptJson: { pending: true },
        },
      });

      return match;
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[FightClub] ${mode.toUpperCase()} match initiated: ${attackerSnapshot.characterName} vs ${defenderSnapshot.characterName} (matchId: ${matchRecord.id})`
      );
    }

    // Return snapshots so frontend can start conflict UI
    return NextResponse.json({
      success: true,
      matchId: matchRecord.id,
      mode,
      attacker: attackerSnapshot,
      defender: defenderSnapshot,
    } as PvpChallengeResult);
  } catch (error) {
    console.error('PvP challenge error:', error);
    return NextResponse.json(
      { error: 'An error occurred during the challenge' },
      { status: 500 }
    );
  }
}
