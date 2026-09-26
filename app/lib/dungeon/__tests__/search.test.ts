import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// --- Mocked Prisma dungeonSession store ---
// dungeonSearch() reads via findFirst and writes via update; hasAdjacentSecrets() reads via findUnique.
const { sessionStore } = vi.hoisted(() => ({
  sessionStore: new Map<string, Record<string, unknown>>(),
}));

vi.mock('@/app/lib/db', () => ({
  prisma: {
    dungeonSession: {
      findFirst: vi.fn(async ({ where }: { where: { characterId: string; state: string } }) => {
        for (const session of sessionStore.values()) {
          if (session.characterId === where.characterId && session.state === where.state) return session;
        }
        return null;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => sessionStore.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = sessionStore.get(where.id) ?? {};
        const rec = { ...existing, ...data };
        sessionStore.set(where.id, rec);
        return rec;
      }),
    },
  },
}));

import { dungeonSearch, hasAdjacentSecrets } from '../search';

const SESSION_ID = 'sess-1';
const CHAR_ID = 'char-1';
const NODE_A = 'node-a';
const NODE_SECRET = 'node-secret';
const NODE_B = 'node-b';
const EDGE_SECRET = 'edge-secret';
const EDGE_OPEN = 'edge-open';

function seedSession(overrides: Partial<{ discoveredEdgeIds: string[]; discoveredNodeIds: string[]; agility: number; intelligence: number }> = {}) {
  const { discoveredEdgeIds = [], discoveredNodeIds = [NODE_A], agility = 50, intelligence = 50 } = overrides;
  sessionStore.set(SESSION_ID, {
    id: SESSION_ID,
    characterId: CHAR_ID,
    state: 'ACTIVE',
    currentNodeId: NODE_A,
    discoveredEdgeIds,
    discoveredNodeIds,
    floor: {
      edges: [
        { id: EDGE_SECRET, type: 'SECRET', fromNodeId: NODE_A, toNodeId: NODE_SECRET },
        { id: EDGE_OPEN, type: 'OPEN', fromNodeId: NODE_A, toNodeId: NODE_B },
      ],
      nodes: [
        { id: NODE_A, type: 'CHAMBER' },
        { id: NODE_SECRET, type: 'SECRET' },
        { id: NODE_B, type: 'CHAMBER' },
      ],
    },
    character: {
      attributes: [
        { attributeId: 'agility', currentValue: agility },
        { attributeId: 'intelligence', currentValue: intelligence },
      ],
    },
  });
}

function mockD20(roll: number) {
  // dungeonSearch's internal check does Math.floor(Math.random() * 20) + 1
  const random = (roll - 1) / 20;
  vi.spyOn(Math, 'random').mockReturnValue(random);
}

beforeEach(() => {
  sessionStore.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dungeonSearch', () => {
  it('reports no active session', async () => {
    const result = await dungeonSearch('nobody');
    expect(result).toEqual({ success: false, error: 'No active dungeon session' });
  });

  it('reports nothing found when there are no adjacent undiscovered secrets', async () => {
    seedSession({ discoveredEdgeIds: [EDGE_SECRET] }); // already discovered
    mockD20(20); // even a perfect roll shouldn't matter
    const result = await dungeonSearch(CHAR_ID);
    expect(result.success).toBe(true);
    expect(result.error).toMatch(/nothing of interest/i);
  });

  it('fails the check (DC 12) with a low roll and neutral attributes, and does not discover the edge', async () => {
    seedSession({ agility: 50, intelligence: 50 }); // both modifiers 0
    mockD20(1); // total = 1, well under DC 12
    const result = await dungeonSearch(CHAR_ID);
    expect(result.success).toBe(true); // the search action itself succeeded
    expect(result.discovered).toBeUndefined();
    expect(result.rollResult).toBe(1);
    expect(result.target).toBe(12);
    // edge should remain undiscovered in the store
    expect((sessionStore.get(SESSION_ID) as { discoveredEdgeIds: string[] }).discoveredEdgeIds).not.toContain(EDGE_SECRET);
  });

  it('uses the better of agility/intelligence as the modifier and reports which stat was used', async () => {
    seedSession({ agility: 70, intelligence: 50 }); // agility modifier +2, intelligence 0
    mockD20(10); // total = 10 + 2 = 12, meets DC exactly
    const result = await dungeonSearch(CHAR_ID);
    expect(result.statUsed).toBe('agility');
    expect(result.discovered).toBeDefined();
  });

  it('discovers the secret edge and node on a successful check, persisting to the session', async () => {
    seedSession({ agility: 70, intelligence: 50 });
    mockD20(10); // total 12, meets DC 12
    const result = await dungeonSearch(CHAR_ID);

    expect(result.success).toBe(true);
    expect(result.discovered).toEqual({ edgeId: EDGE_SECRET, fromNodeId: NODE_A, toNodeId: NODE_SECRET });

    const persisted = sessionStore.get(SESSION_ID) as { discoveredEdgeIds: string[]; discoveredNodeIds: string[] };
    expect(persisted.discoveredEdgeIds).toContain(EDGE_SECRET);
    expect(persisted.discoveredNodeIds).toContain(NODE_SECRET);
  });
});

describe('hasAdjacentSecrets', () => {
  it('is true when an undiscovered secret edge touches the current node', async () => {
    seedSession();
    expect(await hasAdjacentSecrets(SESSION_ID)).toBe(true);
  });

  it('is false once the secret edge has already been discovered', async () => {
    seedSession({ discoveredEdgeIds: [EDGE_SECRET] });
    expect(await hasAdjacentSecrets(SESSION_ID)).toBe(false);
  });

  it('is false for a nonexistent session', async () => {
    expect(await hasAdjacentSecrets('does-not-exist')).toBe(false);
  });
});
