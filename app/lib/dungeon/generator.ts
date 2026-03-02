/**
 * Dungeon Generator Service
 *
 * Generates procedural dungeon floors with:
 * - Graph-based room connectivity
 * - Multiple node types (chambers, corridors, boss, etc.)
 * - Loop creation for alternate paths
 * - Secret passages
 * - Content assignment (combat, traps, treasure, etc.)
 */

import { prisma } from '@/app/lib/db';
import type {
  GenerationConfig,
  NodePlacement,
  EdgePlacement,
  GeneratedFloor,
} from './types';
import type {
  DungeonNodeType,
  DungeonEdgeType,
  DungeonContentType,
  DungeonFloor,
} from '@prisma/client';

// ============================================================
// Constants
// ============================================================

const DEFAULT_CONFIG: GenerationConfig = {
  minChambers: 6,
  maxChambers: 10,
  minCorridors: 3,
  maxCorridors: 6,
  hasBoss: true,
  hasStairs: true,
  hasSecret: true,
  extraEdges: 2,
  width: 800,
  height: 600,
};

const NODE_SIZES: Record<DungeonNodeType, { width: number; height: number }> = {
  CHAMBER: { width: 100, height: 80 },
  CORRIDOR: { width: 60, height: 40 },
  JUNCTION: { width: 50, height: 50 },
  BOSS: { width: 140, height: 120 },
  STAIRS: { width: 80, height: 60 },
  SECRET: { width: 70, height: 50 },
};

// ============================================================
// Seeded Random Number Generator
// ============================================================

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

// ============================================================
// Geometry Helpers
// ============================================================

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectsOverlap(a: Rect, b: Rect, padding = 20): boolean {
  return !(
    a.x + a.width + padding < b.x ||
    b.x + b.width + padding < a.x ||
    a.y + a.height + padding < b.y ||
    b.y + b.height + padding < a.y
  );
}

function findNonOverlappingPosition(
  rng: SeededRandom,
  existing: Rect[],
  size: { width: number; height: number },
  bounds: { width: number; height: number },
  maxAttempts = 100
): { x: number; y: number } | null {
  for (let i = 0; i < maxAttempts; i++) {
    const x = rng.nextInt(20, bounds.width - size.width - 20);
    const y = rng.nextInt(20, bounds.height - size.height - 20);
    const candidate: Rect = { x, y, ...size };

    if (!existing.some((r) => rectsOverlap(r, candidate))) {
      return { x, y };
    }
  }
  return null;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

// ============================================================
// Graph Connectivity
// ============================================================

class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(x: number, y: number): boolean {
    const px = this.find(x);
    const py = this.find(y);

    if (px === py) return false;

    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py;
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px;
    } else {
      this.parent[py] = px;
      this.rank[px]++;
    }
    return true;
  }

  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }

  allConnected(): boolean {
    const root = this.find(0);
    for (let i = 1; i < this.parent.length; i++) {
      if (this.find(i) !== root) return false;
    }
    return true;
  }
}

// ============================================================
// Generator Core
// ============================================================

function generateNodes(
  rng: SeededRandom,
  config: GenerationConfig
): NodePlacement[] {
  const nodes: NodePlacement[] = [];
  const placed: Rect[] = [];

  // Helper to place a node
  const placeNode = (
    type: DungeonNodeType,
    contentType: DungeonContentType | null = null,
    isBoss = false,
    label?: string
  ): boolean => {
    const size = NODE_SIZES[type];
    const pos = findNonOverlappingPosition(rng, placed, size, {
      width: config.width,
      height: config.height,
    });

    if (!pos) return false;

    nodes.push({
      type,
      x: pos.x,
      y: pos.y,
      width: size.width,
      height: size.height,
      contentType,
      isBoss,
      label,
    });
    placed.push({ x: pos.x, y: pos.y, ...size });
    return true;
  };

  // 1. Place STAIRS (entrance)
  if (config.hasStairs) {
    placeNode('STAIRS', null, false, 'Entrance');
  }

  // 2. Place BOSS room
  if (config.hasBoss) {
    placeNode('BOSS', 'COMBAT', true, 'Boss Chamber');
  }

  // 3. Place chambers
  const numChambers = rng.nextInt(config.minChambers, config.maxChambers);
  for (let i = 0; i < numChambers; i++) {
    placeNode('CHAMBER');
  }

  // 4. Place corridors
  const numCorridors = rng.nextInt(config.minCorridors, config.maxCorridors);
  for (let i = 0; i < numCorridors; i++) {
    placeNode('CORRIDOR');
  }

  // 5. Place secret room
  if (config.hasSecret) {
    placeNode('SECRET', 'TREASURE', false, 'Secret Cache');
  }

  return nodes;
}

function generateEdges(
  rng: SeededRandom,
  nodes: NodePlacement[],
  config: GenerationConfig
): EdgePlacement[] {
  const edges: EdgePlacement[] = [];
  const uf = new UnionFind(nodes.length);

  // Find stairs and boss indices
  const stairsIndex = nodes.findIndex((n) => n.type === 'STAIRS');
  const bossIndex = nodes.findIndex((n) => n.type === 'BOSS');
  const secretIndex = nodes.findIndex((n) => n.type === 'SECRET');

  // Create distance-sorted potential edges (excluding secret room initially)
  const potentialEdges: { from: number; to: number; dist: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (i === secretIndex) continue; // Handle secret separately
    for (let j = i + 1; j < nodes.length; j++) {
      if (j === secretIndex) continue;
      const dist = distance(
        { x: nodes[i].x + nodes[i].width / 2, y: nodes[i].y + nodes[i].height / 2 },
        { x: nodes[j].x + nodes[j].width / 2, y: nodes[j].y + nodes[j].height / 2 }
      );
      potentialEdges.push({ from: i, to: j, dist });
    }
  }

  // Sort by distance (Kruskal's MST approach)
  potentialEdges.sort((a, b) => a.dist - b.dist);

  // Build MST (minimum spanning tree for connectivity)
  for (const edge of potentialEdges) {
    if (uf.union(edge.from, edge.to)) {
      edges.push({ fromIndex: edge.from, toIndex: edge.to, type: 'OPEN' });
    }
  }

  // Add extra edges to create loops
  const unusedEdges = potentialEdges.filter(
    (e) =>
      !edges.some(
        (ed) =>
          (ed.fromIndex === e.from && ed.toIndex === e.to) ||
          (ed.fromIndex === e.to && ed.toIndex === e.from)
      )
  );

  const shuffledUnused = rng.shuffle(unusedEdges);
  for (let i = 0; i < Math.min(config.extraEdges, shuffledUnused.length); i++) {
    const edge = shuffledUnused[i];
    edges.push({ fromIndex: edge.from, toIndex: edge.to, type: 'OPEN' });
  }

  // Add secret passage to secret room (if exists)
  if (secretIndex >= 0 && config.hasSecret) {
    // Connect secret room to a random chamber (not stairs or boss)
    const chambers = nodes
      .map((n, i) => ({ node: n, index: i }))
      .filter(
        ({ node, index }) =>
          node.type === 'CHAMBER' && index !== stairsIndex && index !== bossIndex
      );

    if (chambers.length > 0) {
      const targetChamber = rng.pick(chambers);
      edges.push({
        fromIndex: targetChamber.index,
        toIndex: secretIndex,
        type: 'SECRET',
      });
    }
  }

  return edges;
}

function assignContent(
  rng: SeededRandom,
  nodes: NodePlacement[]
): NodePlacement[] {
  // Content assignment rules:
  // - BOSS already has combat + isBoss
  // - SECRET already has treasure
  // - STAIRS has no content
  // - CORRIDORS can have traps
  // - CHAMBERS get combat, elite, event, or treasure

  const chambers = nodes.filter(
    (n) =>
      n.type === 'CHAMBER' && !n.contentType
  );

  const corridors = nodes.filter(
    (n) => n.type === 'CORRIDOR' && !n.contentType
  );

  // Assign to chambers
  if (chambers.length > 0) {
    // 1-2 treasure rooms
    const treasureCount = Math.min(rng.nextInt(1, 2), chambers.length);
    for (let i = 0; i < treasureCount; i++) {
      const chamber = chambers.splice(rng.nextInt(0, chambers.length - 1), 1)[0];
      chamber.contentType = 'TREASURE';
      chamber.label = 'Treasure Room';
    }

    // 1 elite
    if (chambers.length > 0) {
      const elite = chambers.splice(rng.nextInt(0, chambers.length - 1), 1)[0];
      elite.contentType = 'ELITE';
      elite.label = 'Elite Guardian';
    }

    // Remaining: combat or event
    for (const chamber of chambers) {
      chamber.contentType = rng.next() < 0.7 ? 'COMBAT' : 'EVENT';
    }
  }

  // Assign traps to 1-2 corridors
  const trapCount = Math.min(rng.nextInt(1, 2), corridors.length);
  const shuffledCorridors = rng.shuffle(corridors);
  for (let i = 0; i < trapCount; i++) {
    shuffledCorridors[i].contentType = 'TRAP';
  }

  return nodes;
}

// ============================================================
// Main Export
// ============================================================

export async function generateDungeonFloor(
  districtId: string,
  depth: number,
  customConfig?: Partial<GenerationConfig>
): Promise<DungeonFloor> {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const seed = Math.floor(Math.random() * 2147483647);
  const rng = new SeededRandom(seed);

  // Generate layout
  let nodes = generateNodes(rng, config);
  const edges = generateEdges(rng, nodes, config);
  nodes = assignContent(rng, nodes);

  // Persist to database
  const floor = await prisma.$transaction(async (tx) => {
    // Create floor
    const createdFloor = await tx.dungeonFloor.create({
      data: {
        districtId,
        depth,
        width: config.width,
        height: config.height,
        seed,
      },
    });

    // Create nodes
    const createdNodes = await Promise.all(
      nodes.map((node) =>
        tx.dungeonNode.create({
          data: {
            floorId: createdFloor.id,
            type: node.type,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            contentType: node.contentType,
            isBoss: node.isBoss,
            label: node.label,
          },
        })
      )
    );

    // Create edges (map indices to actual IDs)
    await Promise.all(
      edges.map((edge) =>
        tx.dungeonEdge.create({
          data: {
            floorId: createdFloor.id,
            fromNodeId: createdNodes[edge.fromIndex].id,
            toNodeId: createdNodes[edge.toIndex].id,
            type: edge.type,
          },
        })
      )
    );

    return createdFloor;
  });

  return floor;
}

export async function getFloorWithRelations(floorId: string) {
  return prisma.dungeonFloor.findUnique({
    where: { id: floorId },
    include: {
      nodes: true,
      edges: true,
    },
  });
}

export { DEFAULT_CONFIG };
