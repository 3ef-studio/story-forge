import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { getActiveGoals, getGoalChoices } from '@/app/lib/game-logic/goal-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get character
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Get active goals
    const activeGoals = await getActiveGoals(character.id);

    // Get available choices if player needs to pick a new goal
    const needsChoice = activeGoals.length < 2;
    const choices = needsChoice ? await getGoalChoices(character.id) : [];

    return NextResponse.json({
      activeGoals,
      needsChoice,
      choices,
    });
  } catch (error) {
    console.error('Goals fetch error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
