import { describe, it, expect, vi, afterEach } from 'vitest';

// --- Mocked Prisma: capture what generateDungeonFloor would persist, without a DB ---
// generateDungeonFloor's only external dependency is prisma.$transaction + the three
// create() calls inside it; everything else (layout, connectivity, content assignment)
// is pure, in-memory logic driven by the module-internal SeededRandom class.
const { capturedNodes, capturedEdges } = vi.hoisted(() => ({
  capturedNodes: [] as Array<{ id: string; type: string; contentType: string | null; isBoss: boolean; x: number; y: number; width: number; height: number; label?: string }>,
  capturedEdges: [] as Array<{ id: string; fromNodeId: string; toNodeId: string; type: string }>,
}));

type TxCreateArgs<T> = { data: T };

vi.mock('@/app/lib/db', () => ({
  prisma: {
    $transaction: async (
      fn: (tx: {
        dungeonFloor: { create: (args: TxCreateArgs<Record<string, unknown>>) => Promise<Record<string, unknown>> };
        dungeonNode: { create: (args: TxCreateArgs<Record<string, unknown>>) => Promise<Record<string, unknown>> };
        dungeonEdge: { create: (args: TxCreateArgs<Record<string, unknown>>) => Promise<Record<string, unknown>> };
      }) => Promise<unknown>
    ) => {
      let nodeSeq = 0;
      let edgeSeq = 0;
      const tx = {
        dungeonFloor: {
          create: async ({ data }: TxCreateArgs<Record<string, unknown>>) => ({ id: 'floor_1', ...data }),
        },
        dungeonNode: {
          create: async ({ data }: TxCreateArgs<Record<string, unknown>>) => {
            const rec = { id: `node_${++nodeSeq}`, ...data } as (typeof capturedNodes)[number];
            capturedNodes.push(rec);
            return rec;
          },
        },
        dungeonEdge: {
          create: async ({ data }: TxCreateArgs<Record<string, unknown>>) => {
            const rec = { id: `edge_${++edgeSeq}`, ...data } as (typeof capturedEdges)[number];
            capturedEdges.push(rec);
            return rec;
          },
        },
      };
      return fn(tx);
    },
  },
}));

import { generateDungeonFloor, DEFAULT_CONFIG } from '../generator';

afterEach(() => {
  vi.restoreAllMocks();
  capturedNodes.length = 0;
  capturedEdges.length = 0;
});

/** Builds an id -> node lookup and asserts every non-SECRET node is reachable from
 * STAIRS using only OPEN edges (mirrors normal player movement, which never crosses
 * an undiscovered SECRET edge). */
function assertFullyConnectedExcludingSecret(
  nodes: typeof capturedNodes,
  edges: typeof capturedEdges
) {
  const stairs = nodes.find(n => n.type === 'STAIRS');
  expect(stairs).toBeDefined();

  const adjacency = new Map<string, string[]>();
  for (const n of nodes) adjacency.set(n.id, []);
  for (const e of edges) {
    if (e.type === 'SECRET') continue;
    adjacency.get(e.fromNodeId)?.push(e.toNodeId);
    adjacency.get(e.toNodeId)?.push(e.fromNodeId);
  }

  const visited = new Set<string>([stairs!.id]);
  const queue = [stairs!.id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  const nonSecretIds = nodes.filter(n => n.type !== 'SECRET').map(n => n.id);
  for (const id of nonSecretIds) {
    expect(visited.has(id)).toBe(true);
  }
}

describe('generateDungeonFloor — structural invariants', () => {
  it('produces exactly one STAIRS, one BOSS, and one SECRET node', async () => {
    await generateDungeonFloor('downtown', 1);
    expect(capturedNodes.filter(n => n.type === 'STAIRS')).toHaveLength(1);
    expect(capturedNodes.filter(n => n.type === 'BOSS')).toHaveLength(1);
    expect(capturedNodes.filter(n => n.type === 'SECRET')).toHaveLength(1);
  });

  it('pre-tags BOSS as COMBAT/isBoss and SECRET as TREASURE, and does not overwrite them during content assignment', async () => {
    await generateDungeonFloor('downtown', 1);
    const boss = capturedNodes.find(n => n.type === 'BOSS')!;
    expect(boss.contentType).toBe('COMBAT');
    expect(boss.isBoss).toBe(true);
    const secret = capturedNodes.find(n => n.type === 'SECRET')!;
    expect(secret.contentType).toBe('TREASURE');
  });

  it('generates chamber/corridor counts within the configured bounds', async () => {
    await generateDungeonFloor('downtown', 1);
    const chambers = capturedNodes.filter(n => n.type === 'CHAMBER');
    const corridors = capturedNodes.filter(n => n.type === 'CORRIDOR');
    expect(chambers.length).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minChambers);
    expect(chambers.length).toBeLessThanOrEqual(DEFAULT_CONFIG.maxChambers);
    expect(corridors.length).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minCorridors);
    expect(corridors.length).toBeLessThanOrEqual(DEFAULT_CONFIG.maxCorridors);
  });

  it('places every node fully within the floor bounds', async () => {
    await generateDungeonFloor('downtown', 1);
    for (const node of capturedNodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(DEFAULT_CONFIG.width);
      expect(node.y + node.height).toBeLessThanOrEqual(DEFAULT_CONFIG.height);
    }
  });

  it('connects every non-secret node to STAIRS via OPEN edges (guaranteed by the MST)', async () => {
    await generateDungeonFloor('downtown', 1);
    assertFullyConnectedExcludingSecret(capturedNodes, capturedEdges);
  });

  it('connects the SECRET room via exactly one SECRET-type edge to a chamber (not stairs or boss)', async () => {
    await generateDungeonFloor('downtown', 1);
    const secret = capturedNodes.find(n => n.type === 'SECRET')!;
    const secretEdges = capturedEdges.filter(e => e.type === 'SECRET');
    expect(secretEdges).toHaveLength(1);
    const [edge] = secretEdges;
    expect([edge.fromNodeId, edge.toNodeId]).toContain(secret.id);

    const otherEndId = edge.fromNodeId === secret.id ? edge.toNodeId : edge.fromNodeId;
    const otherNode = capturedNodes.find(n => n.id === otherEndId)!;
    expect(otherNode.type).toBe('CHAMBER');
  });

  it('assigns 1-2 treasure chambers, 1 elite chamber, and 1-2 trapped corridors', async () => {
    await generateDungeonFloor('downtown', 1);
    const treasureChambers = capturedNodes.filter(n => n.type === 'CHAMBER' && n.contentType === 'TREASURE');
    const eliteChambers = capturedNodes.filter(n => n.type === 'CHAMBER' && n.contentType === 'ELITE');
    const trapCorridors = capturedNodes.filter(n => n.type === 'CORRIDOR' && n.contentType === 'TRAP');

    expect(treasureChambers.length).toBeGreaterThanOrEqual(1);
    expect(treasureChambers.length).toBeLessThanOrEqual(2);
    expect(eliteChambers).toHaveLength(1);
    expect(trapCorridors.length).toBeGreaterThanOrEqual(1);
    expect(trapCorridors.length).toBeLessThanOrEqual(2);
  });

  it('persists the floor with the requested districtId, depth, and a stored seed', async () => {
    const floor = await generateDungeonFloor('waterfront', 3);
    expect(floor.districtId).toBe('waterfront');
    expect(floor.depth).toBe(3);
    expect(typeof floor.seed).toBe('number');
  });
});

describe('generateDungeonFloor — reproducibility given a fixed seed source', () => {
  it('produces byte-identical layouts across two runs when the seed-selecting Math.random call is pinned', async () => {
    // The generator's only call to Math.random() picks the initial LCG seed;
    // everything downstream (SeededRandom) is a pure function of that seed.
    // Pinning Math.random to a constant therefore pins the entire layout.
    vi.spyOn(Math, 'random').mockReturnValue(0.314159);

    const floorA = await generateDungeonFloor('downtown', 1);
    const nodesA = [...capturedNodes];
    const edgesA = [...capturedEdges];
    capturedNodes.length = 0;
    capturedEdges.length = 0;

    const floorB = await generateDungeonFloor('downtown', 1);
    const nodesB = [...capturedNodes];
    const edgesB = [...capturedEdges];

    expect(floorA.seed).toBe(floorB.seed);
    expect(nodesA).toEqual(nodesB);
    expect(edgesA).toEqual(edgesB);
  });

  it('produces a different seed (and generally a different layout) for a different Math.random draw', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const floorA = await generateDungeonFloor('downtown', 1);

    capturedNodes.length = 0;
    capturedEdges.length = 0;

    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const floorB = await generateDungeonFloor('downtown', 1);

    expect(floorA.seed).not.toBe(floorB.seed);
  });
});
