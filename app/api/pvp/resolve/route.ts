/**
 * POST /api/pvp/resolve
 *
 * Resolves a Fight Club match after the player completes the conflict UI.
 * - Validates the match belongs to the user
 * - Updates ratings (ranked only)
 * - Records the final result and transcript
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { calculateEloUpdate } from '@/app/lib/game-logic/pvp';
import type { PvpResolveRequest, PvpResolveResult } from '@/app/lib/game-logic/pvp/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isPvpResolveRequest(value: unknown): value is PvpResolveRequest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;

  if (typeof v.matchId !== 'string') return false;
  if (!v.conflictResult || typeof v.conflictResult !== 'object') return false;

  const cr = v.conflictResult as Record<string, unknown>;
  if (!['player_victory', 'opponent_victory', 'stalemate'].includes(cr.outcome as string)) return false;
  if (typeof cr.turnsPlayed !== 'number') return false;

  return true;
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

    if (!isPvpResolveRequest(rawBody)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { matchId, conflictResult, turnTimeline } = rawBody;

    // Load the match and verify ownership
    const match = await prisma.pvpMatch.findUnique({
      where: { id: matchId },
      include: {
        attackerCharacter: {
          select: { id: true, userId: true, pvpRating: true, pvpWins: true, pvpLosses: true, pvpMatches: true },
        },
        defenderCharacter: {
          select: { id: true, pvpRating: true, pvpWins: true, pvpLosses: true, pvpMatches: true },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Verify the user owns the attacker character
    if (match.attackerCharacter.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if match is already resolved (not pending)
    const transcriptData = match.transcriptJson as { pending?: boolean } | null;
    if (!transcriptData?.pending) {
      return NextResponse.json({ error: 'Match already resolved' }, { status: 400 });
    }

    // Determine win/loss from attacker's perspective
    const attackerWon = conflictResult.outcome === 'player_victory';
    const result = attackerWon ? 'WIN' : 'LOSS';

    // Calculate Elo updates (only for ranked)
    const isRanked = match.mode === 'RANKED';
    let eloUpdate = {
      attackerNewRating: match.attackerRatingBefore,
      defenderNewRating: match.defenderRatingBefore,
      attackerDelta: 0,
      defenderDelta: 0,
    };

    if (isRanked) {
      eloUpdate = calculateEloUpdate(
        match.attackerRatingBefore,
        match.defenderRatingBefore,
        attackerWon
      );
    }

    // Build transcript for storage
    const transcript = {
      outcome: conflictResult.outcome,
      turnsPlayed: conflictResult.turnsPlayed,
      playerFinalResources: conflictResult.playerFinalResources,
      opponentFinalResources: conflictResult.opponentFinalResources,
      turnTimeline: turnTimeline || [],
    };

    // Update everything in a transaction
    await prisma.$transaction(async (tx) => {
      // Update match record
      await tx.pvpMatch.update({
        where: { id: matchId },
        data: {
          result: result,
          attackerRatingAfter: eloUpdate.attackerNewRating,
          defenderRatingAfter: eloUpdate.defenderNewRating,
          ratingDeltaAttacker: eloUpdate.attackerDelta,
          transcriptJson: transcript,
        },
      });

      // Update ratings and W/L for ranked matches
      if (isRanked) {
        // Update attacker
        await tx.character.update({
          where: { id: match.attackerCharacterId },
          data: {
            pvpRating: eloUpdate.attackerNewRating,
            pvpWins: attackerWon ? { increment: 1 } : undefined,
            pvpLosses: !attackerWon ? { increment: 1 } : undefined,
            pvpMatches: { increment: 1 },
          },
        });

        // Update defender
        await tx.character.update({
          where: { id: match.defenderCharacterId },
          data: {
            pvpRating: eloUpdate.defenderNewRating,
            pvpWins: !attackerWon ? { increment: 1 } : undefined,
            pvpLosses: attackerWon ? { increment: 1 } : undefined,
            pvpMatches: { increment: 1 },
          },
        });
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[FightClub] Match resolved: ${result} (delta: ${eloUpdate.attackerDelta})`
      );
    }

    return NextResponse.json({
      success: true,
      result,
      ratingDelta: eloUpdate.attackerDelta,
      newRating: eloUpdate.attackerNewRating,
    } as PvpResolveResult);
  } catch (error) {
    console.error('PvP resolve error:', error);
    return NextResponse.json(
      { error: 'An error occurred during resolution' },
      { status: 500 }
    );
  }
}
