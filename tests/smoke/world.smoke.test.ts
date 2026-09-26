/**
 * Smoke: world simulation & dungeons.
 *
 * District control shares, city control, faction tiers, the win condition,
 * district modifiers, seeded RNG, and dungeon trap checks.
 *
 * Several of these helpers live in modules that also import Prisma. That's
 * fine: app/lib/db.ts only constructs the client on first use, and nothing
 * here calls a DB-backed function.
 */
import { describe, it, expect } from 'vitest';
import {
  createDefaultShares,
  computeDistrictLeader,
  type DistrictShares,
} from '@/app/lib/world/districtControlShares';
import {
  computeAllCityShares,
  computeFactionTier,
  analyzeDistrictLeaders,
  checkWinCandidate,
} from '@/app/lib/world/escalationAndVictory';
import { computeCityControl } from '@/app/lib/world/cityControl';
import type { DistrictStateWithMetadata } from '@/app/lib/game-logic/district-state';
import { computeModifiedDelta } from '@/app/lib/world/applyDistrictModifiers';
import { createSeededRng, weightedSelect } from '@/app/lib/world/seededRng';
import { getTrapDifficulty, perceptionCheck, disarmCheck, TRAP_DIFFICULTY_VALUES } from '@/app/lib/dungeon/trap';
import { controllableFactions } from '@/app/data/factions';
import { districts } from '@/app/data/districts';

const sum = (s: DistrictShares) => Object.values(s).reduce((a, b) => a + b, 0);

/** Every district fully owned by one faction. */
function dominatedMap(factionId: string): Map<string, DistrictShares> {
  const map = new Map<string, DistrictShares>();
  for (const d of districts) {
    const shares = createDefaultShares();
    shares.uncontrolled = 10;
    shares[factionId] = 90;
    map.set(d.id, shares);
  }
  return map;
}

describe('smoke: district control & victory', () => {
  it('default shares sum to 100 and have no leader', () => {
    const shares = createDefaultShares();
    expect(sum(shares)).toBe(100);
    expect(computeDistrictLeader(shares).leaderFactionId).toBeNull();
  });

  it('city shares, tiers and win detection agree on a dominated city', () => {
    const winner = controllableFactions[0].id;
    const map = dominatedMap(winner);

    const cityShares = computeAllCityShares(map);
    expect(cityShares.get(winner)).toBeGreaterThan(70);
    expect(computeFactionTier(cityShares.get(winner)!)).toBe(3);

    expect(checkWinCandidate(analyzeDistrictLeaders(map))).toBe(winner);
  });

  it('an untouched city has no winner', () => {
    const map = new Map(districts.map((d) => [d.id, createDefaultShares()]));
    expect(checkWinCandidate(analyzeDistrictLeaders(map))).toBeNull();
    for (const share of computeAllCityShares(map).values()) expect(computeFactionTier(share)).toBe(0);
  });

  it('computeCityControl percentages add up to 100', () => {
    const map = dominatedMap(controllableFactions[0].id);
    const states = [...map.values()].map((shares) => ({ shares }) as unknown as DistrictStateWithMetadata);
    const summary = computeCityControl(states);
    const total = summary.factions.reduce((a, f) => a + f.percent, 0) + summary.uncontrolledPercent;
    expect(total).toBeCloseTo(100, 5);
  });

  it('district modifiers preserve sign and stay within ±50', () => {
    for (const d of districts) {
      for (const kind of ['primary', 'ripple', 'counter', 'death', 'instability'] as const) {
        const up = computeModifiedDelta({ baseDelta: 10, districtId: d.id, kind });
        const down = computeModifiedDelta({ baseDelta: -10, districtId: d.id, kind });
        expect(up).toBeGreaterThanOrEqual(0);
        expect(down).toBeLessThanOrEqual(0);
        expect(Math.abs(up)).toBeLessThanOrEqual(50);
        expect(Math.abs(down)).toBeLessThanOrEqual(50);
      }
    }
  });
});

describe('smoke: seeded RNG', () => {
  it('same seed → same sequence; different seed → different sequence', () => {
    const draw = (seed: string) => {
      const rng = createSeededRng(seed);
      return Array.from({ length: 5 }, () => rng());
    };
    expect(draw('smoke')).toEqual(draw('smoke'));
    expect(draw('smoke')).not.toEqual(draw('other'));
    for (const v of draw('smoke')) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('weightedSelect only picks items with weight', () => {
    const rng = createSeededRng('weights');
    for (let i = 0; i < 20; i++) expect(weightedSelect(['a', 'b'], [0, 1], rng)).toBe('b');
  });
});

describe('smoke: dungeon traps', () => {
  it('difficulty scales with depth', () => {
    const dcs = [1, 2, 5].map((depth) => TRAP_DIFFICULTY_VALUES[getTrapDifficulty(depth)]);
    expect(dcs[0]).toBeLessThanOrEqual(dcs[1]);
    expect(dcs[1]).toBeLessThanOrEqual(dcs[2]);
  });

  it('perception and disarm checks return consistent results', () => {
    for (const diff of ['EASY', 'NORMAL', 'HARD'] as const) {
      const p = perceptionCheck(50, diff);
      expect(p.total).toBe(p.attributeValue + p.roll);
      expect(p.success).toBe(p.total >= p.difficulty);

      const d = disarmCheck(50, 50, diff);
      expect(d.success).toBe(d.total >= d.difficulty);
    }
  });
});
