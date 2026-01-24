import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { acceptGoalChoice, getActiveGoals, getGoalChoices } from '@/app/lib/game-logic/goal-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AcceptGoalBody = {
  goalTemplateId: string;
};

function isAcceptGoalBody(value: unknown): value is AcceptGoalBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.goalTemplateId === 'string';
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

    if (!isAcceptGoalBody(rawBody)) {
      return NextResponse.json(
        { error: 'Missing or invalid goalTemplateId' },
        { status: 400 }
      );
    }

    const { goalTemplateId } = rawBody;

    // Get character
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Accept the goal choice
    const newGoal = await acceptGoalChoice(character.id, goalTemplateId);

    if (!newGoal) {
      return NextResponse.json({ error: 'Failed to accept goal' }, { status: 400 });
    }

    // Get updated active goals
    const activeGoals = await getActiveGoals(character.id);

    return NextResponse.json({
      success: true,
      newGoal,
      activeGoals,
    });
  } catch (error) {
    console.error('Goal accept error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
