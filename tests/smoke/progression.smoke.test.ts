/**
 * Smoke: character progression & economy.
 *
 * Leverage/heat, alignment, intent, energy regen, powers, consumables, store.
 * Checks ranges and round-trips, not exact tuning values.
 */
import { describe, it, expect } from 'vitest';
import {
  emptyLeverage,
  addLeverage,
  spendLeverage,
  computeLeverageUpdate,
  computeHeatUpdate,
} from '@/app/lib/game-logic/leverage';
import {
  applyAlignmentDelta,
  updateAlignmentValue,
  getAlignmentTier,
} from '@/app/lib/game-logic/alignment';
import {
  INTENT_MIN,
  INTENT_MAX,
  applyIntentDelta,
  computeIntentDelta,
  getIntentBand,
} from '@/app/lib/game-logic/intent';
import { computeEnergyRegen } from '@/app/lib/game-logic/energy-regen';
import { calculatePowerXpGain, processPowerProgression } from '@/app/lib/game-logic/power-progression';
import { canUsePower } from '@/app/lib/game-logic/power-gating';
import {
  MAX_CONSUMABLES,
  addConsumable,
  createConsumable,
  parseConsumables,
  removeConsumable,
} from '@/app/lib/game-logic/consumables';
import { generateStoreOffer, parseStoreOffer, maybeRefreshStore } from '@/app/lib/game-logic/store';
import { deities } from '@/app/data/new-origins';
import { powers } from '@/app/data/powers';

describe('smoke: leverage & heat', () => {
  it('gain → spend round-trips and stays within caps', () => {
    let lev = emptyLeverage();
    for (let i = 0; i < 10; i++) lev = addLeverage(lev, 'control');
    expect(lev.control).toBeGreaterThan(0);
    expect(lev.control + lev.stability + lev.position).toBeLessThanOrEqual(3);

    const spent = spendLeverage(lev, 'control');
    expect(spent?.control).toBe(lev.control - 1);
    expect(spendLeverage(emptyLeverage(), 'control')).toBeNull();
  });

  it('computeLeverageUpdate advances the action counter and never goes negative', () => {
    const r = computeLeverageUpdate({
      dbLeverage: { control: 1, stability: 0, position: 0 },
      dbActionCounter: 2,
      prepSelection: { type: 'momentum' },
      focusMode: null,
      focusModifier: 0,
      prepPowerId: undefined,
      leverageSpent: { control: 5, stability: 0, position: 0 },
    });
    expect(r.newActionCounter).toBe(3);
    for (const v of Object.values(r.finalLeverage)) expect(v).toBeGreaterThanOrEqual(0);
  });

  it('heat stays within [0, 10]', () => {
    expect(computeHeatUpdate({ currentHeat: 10, actionId: 'fup_x', newActionCounter: 1, isFollowUp: true }).newHeat).toBe(10);
    expect(computeHeatUpdate({ currentHeat: 1, actionId: 'rest_recover', newActionCounter: 1, isRest: true }).newHeat).toBe(0);
  });
});

describe('smoke: alignment & intent', () => {
  it('alignment deltas apply and clamp to 0..100 for every deity', () => {
    expect(deities.length).toBeGreaterThan(0);
    for (const deity of deities) {
      const delta = applyAlignmentDelta(
        { actionTags: [...deity.favoredActions], outcome: 'success', collateral: false, deceptionUsed: false },
        deity,
      );
      expect(delta).toBeGreaterThan(0); // favored actions should move alignment up
      expect(updateAlignmentValue(99, 50)).toBeLessThanOrEqual(100);
      expect(updateAlignmentValue(1, -50)).toBeGreaterThanOrEqual(0);
    }
    expect(updateAlignmentValue(null, 10)).toBeNull(); // non-divine origins stay unbound
    expect(getAlignmentTier(null)).toBe('neutral');
  });

  it('intent score clamps and maps to a band', () => {
    expect(applyIntentDelta(INTENT_MAX, computeIntentDelta('heroic', 10))).toBe(INTENT_MAX);
    expect(applyIntentDelta(INTENT_MIN, computeIntentDelta('villainous', 10))).toBe(INTENT_MIN);
    expect(getIntentBand(INTENT_MAX)).toBe('hero');
    expect(getIntentBand(INTENT_MIN)).toBe('villain');
  });
});

describe('smoke: energy regen', () => {
  it('regenerates over time without exceeding max', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const r = computeEnergyRegen({ currentEnergy: 10, maxEnergy: 100, lastEnergyRegenAt: dayAgo }, now);
    expect(r.newEnergy).toBeGreaterThan(10);
    expect(r.newEnergy).toBeLessThanOrEqual(100);

    const full = computeEnergyRegen({ currentEnergy: 100, maxEnergy: 100, lastEnergyRegenAt: dayAgo }, now);
    expect(full.newEnergy).toBe(100);
  });
});

describe('smoke: powers', () => {
  it('XP gain levels a power without regressing', () => {
    const power = powers[0];
    const xp = calculatePowerXpGain(5, true);
    expect(xp).toBeGreaterThan(0);

    const r = processPowerProgression(
      power,
      { powerId: power.id, currentLevel: 1, currentXp: 0, timesUsed: 0 },
      xp * 100,
    );
    expect(r.levelAfter).toBeGreaterThanOrEqual(r.levelBefore);
    expect(r.xpGained).toBe(xp * 100);
  });

  it('power gating answers for every power', () => {
    for (const p of powers) {
      expect(typeof canUsePower(p.id, 80).canUse).toBe('boolean');
      expect(canUsePower(p.id, null).canUse).toBe(true); // non-divine characters are never gated
    }
  });
});

describe('smoke: consumables & store', () => {
  it('inventory respects MAX_CONSUMABLES and survives a JSON round-trip', () => {
    let inv = parseConsumables([]);
    for (let i = 0; i < MAX_CONSUMABLES + 2; i++) inv = addConsumable(inv, createConsumable('stim_patch'));
    expect(inv).toHaveLength(MAX_CONSUMABLES);

    const roundTripped = parseConsumables(JSON.parse(JSON.stringify(inv)));
    expect(roundTripped).toEqual(inv);
    expect(removeConsumable(inv, inv[0].id)).toHaveLength(MAX_CONSUMABLES - 1);
  });

  it('store offer is generated, parseable, and refreshes', () => {
    const offer = generateStoreOffer();
    expect(offer.length).toBeGreaterThan(0);
    for (const o of offer) expect(o.price).toBeGreaterThan(0);
    expect(parseStoreOffer(JSON.parse(JSON.stringify(offer)))).toEqual(offer);

    const refreshed = maybeRefreshStore([], 0);
    expect(refreshed.shouldRefresh).toBe(true);
    expect(refreshed.newOffer.length).toBeGreaterThan(0);
  });
});
