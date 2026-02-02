import { describe, it, expect } from 'vitest';
import {
  deriveEncounterContext,
  computeStartingBonuses,
  computeMoveBonus,
} from '../build-bonuses';
import type { PlayerBuildSnapshot, EncounterContext } from '../types';

// --- Helpers ---

function makeBuild(overrides?: Partial<PlayerBuildSnapshot>): PlayerBuildSnapshot {
  return {
    level: 5,
    attributes: {
      strength: 50,
      agility: 50,
      intelligence: 50,
      charisma: 50,
      willpower: 50,
      perception: 50,
      endurance: 50,
      stealth: 50,
      reputation: 50,
      notoriety: 50,
    },
    powers: [],
    ...overrides,
  };
}

function combatContext(): EncounterContext {
  return { type: 'combat', difficultyTier: 'medium', tags: [], stakes: 'medium' };
}

function socialContext(): EncounterContext {
  return { type: 'social', difficultyTier: 'medium', tags: [], stakes: 'medium' };
}

function stealthContext(): EncounterContext {
  return { type: 'stealth', difficultyTier: 'medium', tags: [], stakes: 'medium' };
}

// --- deriveEncounterContext ---

describe('deriveEncounterContext', () => {
  it('maps known categories correctly', () => {
    expect(deriveEncounterContext('combat', 5, []).type).toBe('combat');
    expect(deriveEncounterContext('social', 5, []).type).toBe('social');
    expect(deriveEncounterContext('stealth', 5, []).type).toBe('stealth');
    expect(deriveEncounterContext('investigation', 5, []).type).toBe('investigation');
    expect(deriveEncounterContext('infiltration', 5, []).type).toBe('stealth');
    expect(deriveEncounterContext('negotiation', 5, []).type).toBe('social');
  });

  it('defaults unknown categories to combat', () => {
    expect(deriveEncounterContext('random_thing', 5, []).type).toBe('combat');
    expect(deriveEncounterContext('', 5, []).type).toBe('combat');
  });

  it('maps difficulty to correct tiers', () => {
    expect(deriveEncounterContext('combat', 1, []).difficultyTier).toBe('low');
    expect(deriveEncounterContext('combat', 3, []).difficultyTier).toBe('low');
    expect(deriveEncounterContext('combat', 4, []).difficultyTier).toBe('medium');
    expect(deriveEncounterContext('combat', 7, []).difficultyTier).toBe('medium');
    expect(deriveEncounterContext('combat', 8, []).difficultyTier).toBe('high');
    expect(deriveEncounterContext('combat', 10, []).difficultyTier).toBe('high');
  });

  it('preserves tags', () => {
    const ctx = deriveEncounterContext('combat', 5, ['enforcer', 'boss']);
    expect(ctx.tags).toEqual(['enforcer', 'boss']);
  });
});

// --- computeStartingBonuses ---

describe('computeStartingBonuses', () => {
  it('returns no bonuses for default (50) attributes', () => {
    const build = makeBuild();
    const result = computeStartingBonuses(build, combatContext());
    expect(result.entries).toHaveLength(0);
    expect(result.finalBonus).toEqual({});
  });

  it('gives control +1 for high strength in combat', () => {
    const build = makeBuild({ attributes: { ...makeBuild().attributes, strength: 70 } });
    const result = computeStartingBonuses(build, combatContext());
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.finalBonus.control).toBe(1);
  });

  it('gives no bonus for high strength in social encounter', () => {
    const build = makeBuild({ attributes: { ...makeBuild().attributes, strength: 70 } });
    const result = computeStartingBonuses(build, socialContext());
    // Strength has combat affinity only
    const strengthEntries = result.entries.filter(e => e.source === 'attr:strength');
    expect(strengthEntries).toHaveLength(0);
  });

  it('gives no bonus for low attributes even if affinity matches', () => {
    const build = makeBuild({ attributes: { ...makeBuild().attributes, strength: 40 } });
    const result = computeStartingBonuses(build, combatContext());
    const strengthEntries = result.entries.filter(e => e.source === 'attr:strength');
    expect(strengthEntries).toHaveLength(0);
  });

  it('caps total bonus per resource at +2', () => {
    // Give multiple attributes high values that all contribute to the same resource
    const build = makeBuild({
      attributes: {
        ...makeBuild().attributes,
        strength: 90,     // combat: control +1
        intelligence: 90, // investigation: control +1 (not combat)
        charisma: 90,     // social: control +1 (not combat)
        willpower: 90,    // combat: stability +1
        endurance: 90,    // combat: stability +1
      },
    });
    const result = computeStartingBonuses(build, combatContext());
    // Control: only strength contributes in combat → +1
    // Stability: willpower + endurance both in combat → capped at +2
    expect(result.finalBonus.stability).toBeLessThanOrEqual(2);
  });

  it('applies power bonuses when level >= 4', () => {
    const build = makeBuild({
      powers: [{ powerId: 'super_strength', level: 5 }],
    });
    const result = computeStartingBonuses(build, combatContext());
    const powerEntries = result.entries.filter(e => e.source === 'power:super_strength');
    expect(powerEntries.length).toBe(1);
    expect(powerEntries[0].resource).toBe('control');
  });

  it('does NOT apply power bonuses when level < 4', () => {
    const build = makeBuild({
      powers: [{ powerId: 'super_strength', level: 2 }],
    });
    const result = computeStartingBonuses(build, combatContext());
    const powerEntries = result.entries.filter(e => e.source === 'power:super_strength');
    expect(powerEntries).toHaveLength(0);
  });

  it('respects power encounter type affinity', () => {
    const build = makeBuild({
      powers: [{ powerId: 'telepathy', level: 5 }],
    });
    // Telepathy has social + investigation affinity, not combat
    const combatResult = computeStartingBonuses(build, combatContext());
    const socialResult = computeStartingBonuses(build, socialContext());
    expect(combatResult.entries.filter(e => e.source === 'power:telepathy')).toHaveLength(0);
    expect(socialResult.entries.filter(e => e.source === 'power:telepathy').length).toBeGreaterThan(0);
  });
});

// --- computeMoveBonus ---

describe('computeMoveBonus', () => {
  it('returns no bonus when no attributes qualify', () => {
    const build = makeBuild();
    const result = computeMoveBonus('pressure', build, combatContext());
    expect(result.entries).toHaveLength(0);
  });

  it('gives opp stability -1 for pressure with high strength in combat', () => {
    const build = makeBuild({ attributes: { ...makeBuild().attributes, strength: 70 } });
    const result = computeMoveBonus('pressure', build, combatContext());
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.finalBonus.stability).toBe(-1);
  });

  it('gives self position +1 for reposition with high agility in combat', () => {
    const build = makeBuild({ attributes: { ...makeBuild().attributes, agility: 70 } });
    const result = computeMoveBonus('reposition', build, combatContext());
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.finalBonus.position).toBe(1);
  });

  it('gives no bonus for wrong move', () => {
    const build = makeBuild({ attributes: { ...makeBuild().attributes, strength: 70 } });
    // Strength bonus is on pressure, not stabilize
    const result = computeMoveBonus('stabilize', build, combatContext());
    const strengthEntries = result.entries.filter(e => e.source === 'attr:strength');
    expect(strengthEntries).toHaveLength(0);
  });

  it('caps move bonus magnitude at 2', () => {
    // Multiple sources on pressure in combat
    const build = makeBuild({
      attributes: {
        ...makeBuild().attributes,
        strength: 90,    // pressure → opp stability -1
        notoriety: 90,   // pressure → opp control -1
      },
      powers: [
        { powerId: 'super_strength', level: 5 },  // pressure → opp stability -1
        { powerId: 'energy_blast', level: 5 },     // pressure → opp position -1
      ],
    });
    const result = computeMoveBonus('pressure', build, combatContext());
    // Each resource should be capped at magnitude 2
    for (const key of ['control', 'stability', 'position'] as const) {
      const val = result.finalBonus[key];
      if (val !== undefined) {
        expect(Math.abs(val)).toBeLessThanOrEqual(2);
      }
    }
  });

  it('applies power move bonuses only at level >= 4', () => {
    const buildLow = makeBuild({
      powers: [{ powerId: 'super_strength', level: 2 }],
    });
    const buildHigh = makeBuild({
      powers: [{ powerId: 'super_strength', level: 5 }],
    });
    const low = computeMoveBonus('pressure', buildLow, combatContext());
    const high = computeMoveBonus('pressure', buildHigh, combatContext());
    expect(low.entries.filter(e => e.source === 'power:super_strength')).toHaveLength(0);
    expect(high.entries.filter(e => e.source === 'power:super_strength').length).toBeGreaterThan(0);
  });
});

// --- Determinism ---

describe('determinism', () => {
  it('produces identical results for identical inputs', () => {
    const build = makeBuild({
      attributes: { ...makeBuild().attributes, strength: 80, agility: 75 },
      powers: [{ powerId: 'super_strength', level: 5 }],
    });
    const ctx = combatContext();

    const start1 = computeStartingBonuses(build, ctx);
    const start2 = computeStartingBonuses(build, ctx);
    expect(start1).toEqual(start2);

    const move1 = computeMoveBonus('pressure', build, ctx);
    const move2 = computeMoveBonus('pressure', build, ctx);
    expect(move1).toEqual(move2);
  });
});
