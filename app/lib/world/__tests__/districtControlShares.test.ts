import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocked Prisma districtState store ---
const { districtStore } = vi.hoisted(() => ({
  districtStore: new Map<string, Record<string, unknown>>(),
}));

function key(characterId: string, districtId: string) {
  return `${characterId}:${districtId}`;
}

vi.mock('@/app/lib/db', () => ({
  prisma: {
    districtState: {
      findUnique: vi.fn(async ({ where }: { where: { characterId_districtId: { characterId: string; districtId: string } } }) => {
        const k = key(where.characterId_districtId.characterId, where.characterId_districtId.districtId);
        return districtStore.get(k) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const k = key(data.characterId as string, data.districtId as string);
        const rec = { id: k, instability: 0, ...data };
        districtStore.set(k, rec);
        return rec;
      }),
      update: vi.fn(async ({ where, data }: { where: { characterId_districtId: { characterId: string; districtId: string } }; data: Record<string, unknown> }) => {
        const k = key(where.characterId_districtId.characterId, where.characterId_districtId.districtId);
        const existing = districtStore.get(k) ?? {};
        const rec = { ...existing, ...data };
        districtStore.set(k, rec);
        return rec;
      }),
    },
  },
}));

import {
  createDefaultShares,
  computeDistrictLeader,
  getOrInitDistrictShares,
  applyControlGain,
  applyControlLoss,
  type DistrictShares,
} from '../districtControlShares';

const SYNDICATE = 'syndicate';
const GUARDIAN = 'guardian_initiative';
const CHAR = 'char-1';
const DISTRICT = 'downtown';

describe('createDefaultShares', () => {
  it('starts 100% uncontrolled with every controllable faction at 0', () => {
    const shares = createDefaultShares();
    expect(shares.uncontrolled).toBe(100);
    expect(shares[SYNDICATE]).toBe(0);
    expect(shares[GUARDIAN]).toBe(0);
    const total = Object.values(shares).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe('computeDistrictLeader', () => {
  it('reports "controlled" status at >= 50% and "contested" below it', () => {
    const controlled = computeDistrictLeader({ uncontrolled: 40, [SYNDICATE]: 60 });
    expect(controlled).toEqual({ leaderFactionId: SYNDICATE, leaderShare: 60, status: 'controlled' });

    const contested = computeDistrictLeader({ uncontrolled: 70, [SYNDICATE]: 30 });
    expect(contested).toEqual({ leaderFactionId: SYNDICATE, leaderShare: 30, status: 'contested' });
  });

  it('returns no leader when every controllable faction is at 0', () => {
    const shares = createDefaultShares(); // 100% uncontrolled
    const leader = computeDistrictLeader(shares);
    expect(leader.leaderFactionId).toBeNull();
    expect(leader.leaderShare).toBe(0);
    expect(leader.status).toBe('contested');
  });

  it('picks the strictly-higher faction, ignoring "uncontrolled" as a candidate', () => {
    const shares = { uncontrolled: 90, [SYNDICATE]: 5, [GUARDIAN]: 5 };
    const leader = computeDistrictLeader(shares);
    // first faction in iteration order (SYNDICATE) wins the tie since GUARDIAN's 5 is not > 5
    expect(leader.leaderFactionId).toBe(SYNDICATE);
  });
});

describe('getOrInitDistrictShares (mocked Prisma)', () => {
  beforeEach(() => {
    districtStore.clear();
  });

  it('creates default shares on first access and persists them', async () => {
    const { shares, leader } = await getOrInitDistrictShares(CHAR, DISTRICT);
    expect(shares.uncontrolled).toBe(100);
    expect(leader.leaderFactionId).toBeNull();
    expect(districtStore.has(key(CHAR, DISTRICT))).toBe(true);
  });

  it('does not re-create on a second call — returns the persisted record', async () => {
    await getOrInitDistrictShares(CHAR, DISTRICT);
    const record = districtStore.get(key(CHAR, DISTRICT));
    // simulate the faction having since gained ground directly in the store
    districtStore.set(key(CHAR, DISTRICT), {
      ...record,
      shares: { uncontrolled: 20, [SYNDICATE]: 80 },
    });

    const { shares, leader } = await getOrInitDistrictShares(CHAR, DISTRICT);
    expect(shares[SYNDICATE]).toBe(80);
    expect(leader.leaderFactionId).toBe(SYNDICATE);
  });

  it('migrates a legacy record (shares: null, controllingFactionId + controlValue) into share format', async () => {
    districtStore.set(key(CHAR, DISTRICT), {
      characterId: CHAR,
      districtId: DISTRICT,
      controllingFactionId: SYNDICATE,
      controlValue: 65,
      shares: null,
    });

    const { shares, leader } = await getOrInitDistrictShares(CHAR, DISTRICT);
    expect(shares[SYNDICATE]).toBe(65);
    expect(shares.uncontrolled).toBe(35);
    expect(leader.leaderFactionId).toBe(SYNDICATE);
    // migration should persist the new shares back onto the record
    expect((districtStore.get(key(CHAR, DISTRICT)) as { shares: DistrictShares }).shares[SYNDICATE]).toBe(65);
  });
});

describe('applyControlGain (mocked Prisma)', () => {
  beforeEach(() => {
    districtStore.clear();
  });

  it('takes from uncontrolled first', async () => {
    await getOrInitDistrictShares(CHAR, DISTRICT); // seeds 100% uncontrolled
    const result = await applyControlGain(CHAR, DISTRICT, SYNDICATE, 30, 'primary');
    expect(result.sharesAfter.uncontrolled).toBe(70);
    expect(result.sharesAfter[SYNDICATE]).toBe(30);
    expect(result.deltaApplied).toBe(30);
    expect(result.donorFactionId).toBeUndefined();
  });

  it('takes from the highest-share rival faction once uncontrolled is exhausted', async () => {
    districtStore.set(key(CHAR, DISTRICT), {
      characterId: CHAR,
      districtId: DISTRICT,
      shares: { uncontrolled: 20, [SYNDICATE]: 30, [GUARDIAN]: 50 },
      controllingFactionId: GUARDIAN,
      controlValue: 50,
    });

    const result = await applyControlGain(CHAR, DISTRICT, SYNDICATE, 40, 'primary');
    // 20 from uncontrolled, remaining 20 from guardian (the highest non-gainer share)
    expect(result.sharesAfter.uncontrolled).toBe(0);
    expect(result.sharesAfter[GUARDIAN]).toBe(30);
    expect(result.sharesAfter[SYNDICATE]).toBe(70);
    expect(result.donorFactionId).toBe(GUARDIAN);
    expect(result.donorAmount).toBe(20);
    expect(result.deltaApplied).toBe(40);
  });

  it('always normalizes shares to sum to 100', async () => {
    await getOrInitDistrictShares(CHAR, DISTRICT);
    const result = await applyControlGain(CHAR, DISTRICT, SYNDICATE, 45, 'primary');
    const total = Object.values(result.sharesAfter).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('throws for a faction that cannot control districts', async () => {
    await getOrInitDistrictShares(CHAR, DISTRICT);
    await expect(applyControlGain(CHAR, DISTRICT, 'civilian_population', 10, 'primary')).rejects.toThrow();
  });
});

describe('applyControlLoss (mocked Prisma)', () => {
  beforeEach(() => {
    districtStore.clear();
  });

  it('moves the lost share to uncontrolled', async () => {
    districtStore.set(key(CHAR, DISTRICT), {
      characterId: CHAR,
      districtId: DISTRICT,
      shares: { uncontrolled: 20, [SYNDICATE]: 80 },
    });

    const result = await applyControlLoss(CHAR, DISTRICT, SYNDICATE, 30, 'primary');
    expect(result.sharesAfter[SYNDICATE]).toBe(50);
    expect(result.sharesAfter.uncontrolled).toBe(50);
    expect(result.deltaApplied).toBe(-30);
  });

  it('caps the loss at the faction current share (cannot go negative)', async () => {
    districtStore.set(key(CHAR, DISTRICT), {
      characterId: CHAR,
      districtId: DISTRICT,
      shares: { uncontrolled: 80, [SYNDICATE]: 20 },
    });

    const result = await applyControlLoss(CHAR, DISTRICT, SYNDICATE, 90, 'primary');
    expect(result.sharesAfter[SYNDICATE]).toBe(0);
    expect(result.sharesAfter.uncontrolled).toBe(100);
    expect(result.deltaApplied).toBe(-20); // only what the faction actually had
  });

  it('always normalizes shares to sum to 100', async () => {
    districtStore.set(key(CHAR, DISTRICT), {
      characterId: CHAR,
      districtId: DISTRICT,
      shares: { uncontrolled: 10, [SYNDICATE]: 90 },
    });
    const result = await applyControlLoss(CHAR, DISTRICT, SYNDICATE, 15, 'primary');
    const total = Object.values(result.sharesAfter).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});
