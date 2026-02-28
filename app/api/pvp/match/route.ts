/**
 * GET /api/pvp/match?id=<matchId>
 *
 * Returns the full match transcript for a specific PvP match.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const matchId = url.searchParams.get('id');

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID required' }, { status: 400 });
    }

    const match = await prisma.pvpMatch.findUnique({
      where: { id: matchId },
      include: {
        attackerCharacter: {
          select: { id: true, name: true, userId: true },
        },
        defenderCharacter: {
          select: { id: true, name: true },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Verify user was a participant
    const userCharacter = await prisma.character.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!userCharacter) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const isParticipant =
      match.attackerCharacterId === userCharacter.id ||
      match.defenderCharacterId === userCharacter.id;

    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      id: match.id,
      mode: match.mode.toLowerCase(),
      attackerName: match.attackerCharacter.name,
      defenderName: match.defenderCharacter.name,
      attackerRatingBefore: match.attackerRatingBefore,
      defenderRatingBefore: match.defenderRatingBefore,
      attackerRatingAfter: match.attackerRatingAfter,
      defenderRatingAfter: match.defenderRatingAfter,
      ratingDelta: match.ratingDeltaAttacker,
      result: match.result,
      transcript: match.transcriptJson,
      createdAt: match.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Match fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch match' },
      { status: 500 }
    );
  }
}
