import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { getDistrictById } from '@/app/data/districts';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { districtId } = body;

    if (!districtId || !getDistrictById(districtId)) {
      return NextResponse.json(
        { error: 'Invalid district' },
        { status: 400 }
      );
    }

    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    await prisma.character.update({
      where: { id: character.id },
      data: { currentDistrict: districtId },
    });

    return NextResponse.json({
      success: true,
      currentDistrict: districtId,
    });
  } catch (error) {
    console.error('District update error:', error);
    return NextResponse.json(
      { error: 'Failed to update district' },
      { status: 500 }
    );
  }
}
