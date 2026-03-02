/**
 * POST /api/district/[id]/enter-dungeon
 *
 * Convenience endpoint for entering a dungeon in a specific district.
 * - Validates the district exists
 * - Delegates to the dungeon system
 * - Returns session and minimap
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { getDistrictById } from '@/app/data/districts';
import { DUNGEON_ENABLED, enterDungeon } from '@/app/lib/dungeon';
import type { EnterDungeonResponse } from '@/app/lib/dungeon/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    // Check feature flag
    if (!DUNGEON_ENABLED) {
      return NextResponse.json(
        { error: 'Dungeon system is not enabled' },
        { status: 403 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: districtId } = await params;

    // Validate district exists
    const district = getDistrictById(districtId);
    if (!district) {
      return NextResponse.json(
        { error: 'Invalid district' },
        { status: 400 }
      );
    }

    // Get character
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Enter or resume dungeon in this district
    const result = await enterDungeon(character.id, districtId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error } as EnterDungeonResponse,
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Dungeon] Enter via district: character=${character.id} ` +
        `district=${districtId} (${district.name}) ` +
        `session=${result.session?.id} depth=${result.session?.depth}`
      );
    }

    return NextResponse.json(result as EnterDungeonResponse);
  } catch (error) {
    console.error('District enter-dungeon error:', error);
    return NextResponse.json(
      { error: 'An error occurred entering the dungeon' },
      { status: 500 }
    );
  }
}
