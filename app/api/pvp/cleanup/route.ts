/**
 * POST /api/pvp/cleanup
 *
 * Deletes PvpMatch records older than 30 days.
 * This endpoint can be called by a cron job or scheduled task.
 *
 * Requires authorization via a secret header to prevent abuse.
 */

import { NextResponse } from 'next/server';
import { cleanupOldMatches } from '@/app/lib/game-logic/pvp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Verify cleanup authorization (use CRON_SECRET or similar)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, require it for authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deletedCount = await cleanupOldMatches();

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} old PvP matches`,
    });
  } catch (error) {
    console.error('PvP cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup old matches' },
      { status: 500 }
    );
  }
}
