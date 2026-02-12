/**
 * API Route: District State
 *
 * GET /api/district-state
 * Returns all district states for the current character, initializing if necessary.
 * Also includes city-level control summary for controllable factions.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { getDistrictStates } from '@/app/lib/game-logic/district-state';
import { computeCityControl } from '@/app/lib/world/cityControl';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get character for this user
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Get district states (will initialize if needed)
    const districtStates = await getDistrictStates(character.id);

    // Compute city-level control summary
    const cityControl = computeCityControl(districtStates);

    return NextResponse.json({
      success: true,
      districtStates,
      cityControl,
    });
  } catch (error) {
    console.error('[DistrictState API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch district states' },
      { status: 500 }
    );
  }
}
