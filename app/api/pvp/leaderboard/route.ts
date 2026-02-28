/**
 * GET /api/pvp/leaderboard
 *
 * Returns the Fight Club leaderboard.
 * - Top 100 players by default
 * - Sorted by rating desc, then wins desc
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { PVP_MIN_LEVEL, PVP_ELO_START } from '@/app/lib/game-logic/pvp';
import type { LeaderboardEntry } from '@/app/lib/game-logic/pvp/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '100', 10)));

    // Get all characters who have played at least one PvP match
    // or are level 5+ (eligible for PvP)
    const characters = await prisma.character.findMany({
      where: {
        level: { gte: PVP_MIN_LEVEL },
      },
      select: {
        id: true,
        name: true,
        pvpRating: true,
        pvpWins: true,
        pvpLosses: true,
        pvpMatches: true,
      },
      orderBy: [
        { pvpRating: 'desc' },
        { pvpWins: 'desc' },
      ],
      take: limit,
    });

    const leaderboard: LeaderboardEntry[] = characters.map((char, index) => ({
      rank: index + 1,
      characterId: char.id,
      characterName: char.name,
      rating: char.pvpRating ?? PVP_ELO_START,
      wins: char.pvpWins ?? 0,
      losses: char.pvpLosses ?? 0,
    }));

    return NextResponse.json({
      leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
