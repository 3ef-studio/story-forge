import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { getKnownNPCs } from '@/app/lib/game-logic/npc-manager';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const knownNPCs = await getKnownNPCs(character.id);

    return NextResponse.json({
      success: true,
      npcs: knownNPCs.map((mem) => ({
        id: mem.npc.id,
        name: mem.npc.name,
        alias: mem.npc.alias,
        role: mem.npc.role,
        description: mem.npc.description,
        visualDescription: mem.npc.visualDescription,
        personality: mem.npc.personality,
        factionId: mem.npc.factionId,
        familiarity: mem.familiarity,
        familiarityLabel: mem.familiarityLabel,
        disposition: mem.disposition,
        dispositionLabel: mem.dispositionLabel,
        lastSeenAt: mem.lastSeenAt,
        notes: mem.notes,
      })),
    });
  } catch (error) {
    console.error('NPC fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch NPCs' }, { status: 500 });
  }
}
