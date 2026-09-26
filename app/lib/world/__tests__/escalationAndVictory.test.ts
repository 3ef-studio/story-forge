import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DistrictShares } from '../districtControlShares';

// --- Mocked Prisma for the stateful WorldState win-streak logic ---
// Only `prisma.worldState.*` is used by the functions under test here; districtState
// is not touched by updateVictoryStreakAndWinner, so it doesn't need mocking.
const { worldStateStore } = vi.hoisted(() => ({
  worldStateStore: new Map<string, Record<string, unknown>>(),
}));

vi.mock('@/app/lib/db', () => ({
  prisma: {
    worldState: {
      findUnique: vi.fn(async ({ where }: { where: { scopeId: string } }) => {
        return worldStateStore.get(where.scopeId) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const rec = { id: 'ws_' + data.scopeId, ...data };
        worldStateStore.set(data.scopeId as string, rec);
        return rec;
      }),
      update: vi.fn(async ({ where, data }: { where: { scopeId: string }; data: Record<string, unknown> }) => {
        const existing = worldStateStore.get(where.scopeId) ?? {};
        const rec = { ...existing, ...data };
        worldStateStore.set(where.scopeId, rec);
        return rec;
      }),
    },
  },
}));

import {
  computeFactionCityShare,
  computeAllCityShares,
  computeFactionTier,
  getTierLabel,
  computeFactionTiers,
  analyzeDistrictLeaders,
  checkWinCandidate,
  getCounterDeltaModifier,
  getRippleFavorChance,
  getEnemyTierDifficultyModifier,
  getFactionTierById,
  updateVictoryStreakAndWinner,
} from '../escalationAndVictory';

// Real controllable faction ids (see app/data/factions.ts controllableFactions)
const SYNDICATE = 'syndicate';
const GUARDIAN = 'guardian_initiative';
const VIGILANTE = 'vigilante_network';

function sharesMap(entries: Record<string, DistrictShares>): Map<string, DistrictShares> {
  return new Map(Object.entries(entries));
}

describe('computeFactionCityShare / computeAllCityShares', () => {
  it('averages a faction share across all districts', () => {
    const map = sharesMap({
      downtown: { [SYNDICATE]: 60, uncontrolled: 40 },
      industrial: { [SYNDICATE]: 20, uncontrolled: 80 },
    });
    expect(computeFactionCityShare(SYNDICATE, map)).toBe(40);
  });

  it('returns 0 for a faction with no presence anywhere', () => {
    const map = sharesMap({ downtown: { [SYNDICATE]: 100 } });
    expect(computeFactionCityShare(GUARDIAN, map)).toBe(0);
  });

  it('returns 0 when there are no districts at all', () => {
    expect(computeFactionCityShare(SYNDICATE, new Map())).toBe(0);
  });

  it('computes city shares for every controllable faction', () => {
    const map = sharesMap({ downtown: { [SYNDICATE]: 100 } });
    const result = computeAllCityShares(map);
    expect(result.get(SYNDICATE)).toBe(100);
    expect(result.get(GUARDIAN)).toBe(0);
  });
});

describe('computeFactionTier / getTierLabel', () => {
  it('classifies tier boundaries correctly (1:35, 2:50, 3:65)', () => {
    expect(computeFactionTier(0)).toBe(0);
    expect(computeFactionTier(34.9)).toBe(0);
    expect(computeFactionTier(35)).toBe(1);
    expect(computeFactionTier(49.9)).toBe(1);
    expect(computeFactionTier(50)).toBe(2);
    expect(computeFactionTier(64.9)).toBe(2);
    expect(computeFactionTier(65)).toBe(3);
    expect(computeFactionTier(100)).toBe(3);
  });

  it('labels each tier', () => {
    expect(getTierLabel(0)).toBe('Minor');
    expect(getTierLabel(1)).toBe('Rising');
    expect(getTierLabel(2)).toBe('Major');
    expect(getTierLabel(3)).toBe('Dominant');
  });
});

describe('computeFactionTiers', () => {
  it('sorts by city share descending and includes every controllable faction', () => {
    const map = sharesMap({
      downtown: { [SYNDICATE]: 60, [GUARDIAN]: 40 },
    });
    const tiers = computeFactionTiers(map);
    expect(tiers[0].factionId).toBe(SYNDICATE);
    expect(tiers[0].tier).toBe(2);
    const guardianEntry = tiers.find(t => t.factionId === GUARDIAN)!;
    expect(guardianEntry.tier).toBe(1);
    // every controllable faction should be represented, including 0-share ones
    expect(tiers.find(t => t.factionId === VIGILANTE)).toBeDefined();
  });
});

describe('getFactionTierById', () => {
  it('reads a specific faction tier out of a precomputed list, defaulting to 0', () => {
    const tiers = computeFactionTiers(sharesMap({ downtown: { [SYNDICATE]: 100 } }));
    expect(getFactionTierById(SYNDICATE, tiers)).toBe(3);
    expect(getFactionTierById('faction_not_in_list', tiers)).toBe(0);
  });
});

describe('analyzeDistrictLeaders', () => {
  it('identifies a clear leader', () => {
    const map = sharesMap({ downtown: { [SYNDICATE]: 60, [GUARDIAN]: 40 } });
    const [leader] = analyzeDistrictLeaders(map);
    expect(leader.leaderFactionId).toBe(SYNDICATE);
    expect(leader.leaderShare).toBe(60);
    expect(leader.secondPlaceFactionId).toBe(GUARDIAN);
  });

  it('reports no leader on a tie', () => {
    const map = sharesMap({ downtown: { [SYNDICATE]: 50, [GUARDIAN]: 50 } });
    const [leader] = analyzeDistrictLeaders(map);
    expect(leader.leaderFactionId).toBeNull();
  });

  it('reports no leader when every faction is at 0 (fully uncontrolled)', () => {
    const map = sharesMap({ downtown: { uncontrolled: 100 } });
    const [leader] = analyzeDistrictLeaders(map);
    expect(leader.leaderFactionId).toBeNull();
    expect(leader.leaderShare).toBe(0);
  });
});

describe('checkWinCandidate', () => {
  it('returns null with no districts', () => {
    expect(checkWinCandidate([])).toBeNull();
  });

  it('returns null if any district has no clear leader', () => {
    const leaders = analyzeDistrictLeaders(
      sharesMap({
        downtown: { [SYNDICATE]: 80 },
        industrial: { [SYNDICATE]: 50, [GUARDIAN]: 50 }, // tie
      })
    );
    expect(checkWinCandidate(leaders)).toBeNull();
  });

  it('returns null if the leader share is not strictly above 70', () => {
    const leaders = analyzeDistrictLeaders(sharesMap({ downtown: { [SYNDICATE]: 70 } }));
    expect(checkWinCandidate(leaders)).toBeNull();
  });

  it('returns null if different factions lead different districts, even if both are above 70', () => {
    const leaders = analyzeDistrictLeaders(
      sharesMap({
        downtown: { [SYNDICATE]: 80 },
        industrial: { [GUARDIAN]: 80 },
      })
    );
    expect(checkWinCandidate(leaders)).toBeNull();
  });

  it('returns the candidate faction when it leads every district with >70%', () => {
    const leaders = analyzeDistrictLeaders(
      sharesMap({
        downtown: { [SYNDICATE]: 71 },
        industrial: { [SYNDICATE]: 100 },
      })
    );
    expect(checkWinCandidate(leaders)).toBe(SYNDICATE);
  });
});

describe('getCounterDeltaModifier / getRippleFavorChance / getEnemyTierDifficultyModifier', () => {
  it('scales counter delta with tier', () => {
    expect(getCounterDeltaModifier(0)).toBe(0);
    expect(getCounterDeltaModifier(1)).toBe(1);
    expect(getCounterDeltaModifier(2)).toBe(2);
    expect(getCounterDeltaModifier(3)).toBe(3);
  });

  it('scales ripple favor chance with the player faction tier', () => {
    expect(getRippleFavorChance(0)).toBe(0.70);
    expect(getRippleFavorChance(1)).toBe(0.70);
    expect(getRippleFavorChance(2)).toBe(0.80);
    expect(getRippleFavorChance(3)).toBe(0.85);
  });

  it('only penalizes success chance when an enemy faction is Tier 3', () => {
    const tiers = computeFactionTiers(sharesMap({ downtown: { [SYNDICATE]: 100 } })); // syndicate tier 3
    expect(getEnemyTierDifficultyModifier(GUARDIAN, tiers)).toBe(-0.02);
    expect(getEnemyTierDifficultyModifier(SYNDICATE, tiers)).toBe(0); // excludes self
    expect(getEnemyTierDifficultyModifier(null, tiers)).toBe(0);
  });

  it('applies no penalty when the strongest enemy is below Tier 3', () => {
    const tiers = computeFactionTiers(sharesMap({ downtown: { [SYNDICATE]: 40 } })); // tier 1
    expect(getEnemyTierDifficultyModifier(GUARDIAN, tiers)).toBe(0);
  });
});

describe('updateVictoryStreakAndWinner (win condition state machine, mocked WorldState)', () => {
  const SCOPE = 'char-test-scope';

  beforeEach(() => {
    worldStateStore.clear();
  });

  function leadersFor(share: number) {
    return analyzeDistrictLeaders(sharesMap({ downtown: { [SYNDICATE]: share } }));
  }

  it('creates world state on first call and does not declare victory on a single qualifying turn', async () => {
    const result = await updateVictoryStreakAndWinner(SCOPE, leadersFor(80));
    expect(result.victory).toBe(false);
    expect(result.winStreakFactionId).toBe(SYNDICATE);
    expect(result.winStreakCount).toBe(1);
    expect(result.worldTurn).toBe(1);
  });

  it('declares victory after 2 consecutive qualifying turns for the same faction', async () => {
    await updateVictoryStreakAndWinner(SCOPE, leadersFor(80));
    const second = await updateVictoryStreakAndWinner(SCOPE, leadersFor(90));
    expect(second.victory).toBe(true);
    expect(second.winnerFactionId).toBe(SYNDICATE);
    expect(second.wonAtTurn).toBe(2);
  });

  it('resets the streak if a turn does not qualify', async () => {
    await updateVictoryStreakAndWinner(SCOPE, leadersFor(80));
    const broken = await updateVictoryStreakAndWinner(SCOPE, leadersFor(60)); // below 70, breaks streak
    expect(broken.winStreakCount).toBe(0);
    expect(broken.winStreakFactionId).toBeNull();

    const third = await updateVictoryStreakAndWinner(SCOPE, leadersFor(80));
    expect(third.victory).toBe(false); // streak restarted, only 1 turn so far
    expect(third.winStreakCount).toBe(1);
  });

  it('restarts the streak count (not accumulates) if a different faction takes over', async () => {
    await updateVictoryStreakAndWinner(SCOPE, leadersFor(80)); // syndicate, streak 1
    const guardianLeaders = analyzeDistrictLeaders(sharesMap({ downtown: { [GUARDIAN]: 80 } }));
    const switched = await updateVictoryStreakAndWinner(SCOPE, guardianLeaders);
    expect(switched.winStreakFactionId).toBe(GUARDIAN);
    expect(switched.winStreakCount).toBe(1);
    expect(switched.victory).toBe(false);
  });

  it('freezes state once a winner exists — later calls do not change the winner', async () => {
    await updateVictoryStreakAndWinner(SCOPE, leadersFor(80));
    await updateVictoryStreakAndWinner(SCOPE, leadersFor(80)); // wins here (turn 2)

    // Even a non-qualifying turn afterward should not un-declare victory
    const after = await updateVictoryStreakAndWinner(SCOPE, leadersFor(0));
    expect(after.victory).toBe(true);
    expect(after.winnerFactionId).toBe(SYNDICATE);
  });
});
