import { describe, it, expect } from 'vitest';
import {
  emptyLeverage,
  clampLeverage,
  addLeverage,
  leverageFromPrep,
  leverageFromFocus,
  spendLeverage,
  clampResourceWithOvercap,
  applyDecay,
  computeLeverageUpdate,
  isFollowUpActionId,
  computeHeatUpdate,
  powerToLeverageType,
  LEVERAGE_OVERCAP_MAX,
  type LeverageState,
} from '../leverage';
import type { PrepSelection } from '@/app/lib/game-logic/combat/types';

describe('emptyLeverage', () => {
  it('returns all zeros', () => {
    expect(emptyLeverage()).toEqual({ control: 0, stability: 0, position: 0 });
  });
});

describe('clampLeverage', () => {
  it('clamps each type to [0, 2]', () => {
    expect(clampLeverage({ control: 5, stability: -3, position: 1 })).toEqual({
      control: 2,
      stability: 0,
      position: 1,
    });
  });

  it('never returns a total above 6 even for extreme inputs', () => {
    const result = clampLeverage({ control: 999, stability: 999, position: 999 });
    expect(result).toEqual({ control: 2, stability: 2, position: 2 });
    expect(result.control + result.stability + result.position).toBeLessThanOrEqual(6);
  });
});

describe('addLeverage', () => {
  it('adds respecting the per-type cap', () => {
    expect(addLeverage(emptyLeverage(), 'control')).toEqual({ control: 1, stability: 0, position: 0 });
    const atCap: LeverageState = { control: 2, stability: 0, position: 0 };
    expect(addLeverage(atCap, 'control')).toEqual({ control: 2, stability: 0, position: 0 });
  });
});

describe('leverageFromPrep', () => {
  it('maps momentum to stability and intel to control', () => {
    expect(leverageFromPrep({ type: 'momentum' } as PrepSelection).type).toBe('stability');
    expect(leverageFromPrep({ type: 'intel' } as PrepSelection).type).toBe('control');
  });

  it('maps a power prep by its mechanics hint when present', () => {
    // super_strength has mechanics.startingResourceBonus = { resource: 'control' }, which
    // takes priority over its physical category (which would otherwise map to 'stability')
    const grant = leverageFromPrep({ type: 'power', powerId: 'super_strength' } as PrepSelection);
    expect(grant.type).toBe('control');
    expect(grant.source).toContain('super_strength');
  });
});

describe('leverageFromFocus', () => {
  it('returns null when focusModifier is not positive', () => {
    expect(leverageFromFocus('awareness', 0)).toBeNull();
    expect(leverageFromFocus('awareness', -1)).toBeNull();
  });

  it('maps non-power focus modes per the fixed table', () => {
    expect(leverageFromFocus('awareness', 1)!.type).toBe('control');
    expect(leverageFromFocus('aggression', 1)!.type).toBe('stability');
    expect(leverageFromFocus('defense', 1)!.type).toBe('stability');
    expect(leverageFromFocus('power', 1)!.type).toBe('position'); // no prepPowerId given
  });

  it('derives from the selected prep power when focus mode is power', () => {
    const grant = leverageFromFocus('power', 1, 'super_strength');
    expect(grant!.type).toBe('control');
  });
});

describe('spendLeverage', () => {
  it('returns null when insufficient', () => {
    expect(spendLeverage(emptyLeverage(), 'control')).toBeNull();
  });

  it('decrements the given type when sufficient', () => {
    const state: LeverageState = { control: 1, stability: 0, position: 0 };
    expect(spendLeverage(state, 'control')).toEqual({ control: 0, stability: 0, position: 0 });
  });
});

describe('clampResourceWithOvercap', () => {
  it('bounds to [0, 7] and matches the exported constant', () => {
    expect(clampResourceWithOvercap(-5)).toBe(0);
    expect(clampResourceWithOvercap(100)).toBe(LEVERAGE_OVERCAP_MAX);
    expect(LEVERAGE_OVERCAP_MAX).toBe(7);
  });
});

describe('applyDecay', () => {
  it('does not decay unless actionCounter is a multiple of 3', () => {
    const state: LeverageState = { control: 1, stability: 0, position: 0 };
    expect(applyDecay(state, 1).decayed).toBe(false);
    expect(applyDecay(state, 2).decayed).toBe(false);
  });

  it('does not decay an empty pool even on a decay tick', () => {
    const result = applyDecay(emptyLeverage(), 3);
    expect(result.decayed).toBe(false);
  });

  it('removes 1 from the highest pool on a decay tick, priority control>stability>position on ties', () => {
    const tied: LeverageState = { control: 1, stability: 1, position: 1 };
    const result = applyDecay(tied, 3);
    expect(result.decayed).toBe(true);
    expect(result.decayedType).toBe('control');
    expect(result.leverage).toEqual({ control: 0, stability: 1, position: 1 });
  });

  it('removes from the actual highest pool, not just priority order', () => {
    const skewed: LeverageState = { control: 0, stability: 2, position: 1 };
    const result = applyDecay(skewed, 6);
    expect(result.decayedType).toBe('stability');
    expect(result.leverage).toEqual({ control: 0, stability: 1, position: 1 });
  });
});

describe('powerToLeverageType', () => {
  it('falls back to position for an unknown power id', () => {
    expect(powerToLeverageType('totally_not_a_real_power_id')).toBe('position');
  });

  it('prefers the mechanics starting-resource hint over the category mapping', () => {
    // physical category alone would map to 'stability' via CATEGORY_TO_LEVERAGE,
    // but super_strength's mechanics hint (control) takes priority
    expect(powerToLeverageType('super_strength')).toBe('control');
  });
});

describe('isFollowUpActionId', () => {
  it('detects the fup_ prefix', () => {
    expect(isFollowUpActionId('fup_abc123')).toBe(true);
    expect(isFollowUpActionId('rest_recover')).toBe(false);
    expect(isFollowUpActionId(undefined)).toBe(false);
  });
});

describe('computeHeatUpdate', () => {
  it('decays by 1 on a normal action', () => {
    const result = computeHeatUpdate({ currentHeat: 5, actionId: 'patrol', newActionCounter: 1 });
    expect(result).toMatchObject({ previousHeat: 5, newHeat: 4, delta: -1, reason: 'decay' });
  });

  it('does not go below 0 and reports reason "none" when already at 0', () => {
    const result = computeHeatUpdate({ currentHeat: 0, actionId: 'patrol', newActionCounter: 1 });
    expect(result).toMatchObject({ newHeat: 0, delta: 0, reason: 'none' });
  });

  it('increases by 1 on a follow-up action, capped at 10', () => {
    const normal = computeHeatUpdate({ currentHeat: 5, actionId: 'fup_x', newActionCounter: 1, isFollowUp: true });
    expect(normal).toMatchObject({ newHeat: 6, delta: 1, reason: 'followUp' });

    const capped = computeHeatUpdate({ currentHeat: 10, actionId: 'fup_x', newActionCounter: 1, isFollowUp: true });
    expect(capped).toMatchObject({ newHeat: 10, delta: 0, reason: 'followUp' });
  });

  it('decreases by 2 on a rest action, floored at 0', () => {
    const result = computeHeatUpdate({ currentHeat: 3, actionId: 'rest_recover', newActionCounter: 1, isRest: true });
    expect(result).toMatchObject({ newHeat: 1, delta: -2, reason: 'rest' });

    const floored = computeHeatUpdate({ currentHeat: 1, actionId: 'rest_recover', newActionCounter: 1, isRest: true });
    expect(floored).toMatchObject({ newHeat: 0, delta: -1, reason: 'rest' });
  });

  it('gives rest priority over follow-up when both flags are set', () => {
    const result = computeHeatUpdate({
      currentHeat: 5,
      actionId: 'fup_rest',
      newActionCounter: 1,
      isFollowUp: true,
      isRest: true,
    });
    expect(result.reason).toBe('rest');
    expect(result.newHeat).toBe(3);
  });
});

describe('computeLeverageUpdate', () => {
  const baseArgs = {
    dbLeverage: emptyLeverage(),
    dbActionCounter: 0,
    prepSelection: null as PrepSelection | null,
    focusMode: null,
    focusModifier: 0,
    prepPowerId: undefined,
    leverageSpent: emptyLeverage(),
  };

  it('grants leverage from prep and focus, increments the action counter', () => {
    const result = computeLeverageUpdate({
      ...baseArgs,
      prepSelection: { type: 'intel' } as PrepSelection, // control
      focusMode: 'aggression', // stability
      focusModifier: 2,
    });
    expect(result.gained).toEqual({ control: 1, stability: 1, position: 0 });
    expect(result.newActionCounter).toBe(1);
    expect(result.finalLeverage).toEqual({ control: 1, stability: 1, position: 0 });
  });

  it('subtracts spent leverage and floors at 0 per type', () => {
    const result = computeLeverageUpdate({
      ...baseArgs,
      dbLeverage: { control: 1, stability: 0, position: 0 },
      leverageSpent: { control: 1, stability: 1, position: 0 }, // stability over-spent
    });
    expect(result.finalLeverage).toEqual({ control: 0, stability: 0, position: 0 });
  });

  it('applies decay when the resulting action counter is a multiple of 3', () => {
    const result = computeLeverageUpdate({
      ...baseArgs,
      dbLeverage: { control: 2, stability: 0, position: 0 },
      dbActionCounter: 2, // -> newActionCounter = 3, a decay tick
    });
    expect(result.newActionCounter).toBe(3);
    expect(result.decayed).toBe(true);
    expect(result.decayedType).toBe('control');
    expect(result.finalLeverage).toEqual({ control: 1, stability: 0, position: 0 });
  });

  it('does not grant focus leverage when focusModifier is 0', () => {
    const result = computeLeverageUpdate({
      ...baseArgs,
      focusMode: 'aggression',
      focusModifier: 0,
    });
    expect(result.gained).toEqual(emptyLeverage());
  });
});
