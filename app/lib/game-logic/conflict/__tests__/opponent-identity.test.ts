import { describe, it, expect } from 'vitest';
import { resolveOpponentIdentity } from '../opponent-identity';
import type { OpponentIdentityInput } from '../opponent-identity';

const BASE_INPUT: OpponentIdentityInput = {
  encounterCategory: 'combat',
  encounterDifficulty: 5,
  district: 'downtown',
};

describe('resolveOpponentIdentity', () => {
  // --- Rival tests ---

  it('returns kind=rival with correct archetype for rival input', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      rival: { id: 'r1', name: 'Malice', personality: 'brute', level: 5, hostility: 50 },
    });
    expect(result.kind).toBe('rival');
    expect(result.name).toBe('Malice');
    expect(result.archetype).toBe('brute');
  });

  it('maps rival tactician → schemer', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      rival: { id: 'r2', name: 'Shade', personality: 'tactician', level: 3, hostility: 20 },
    });
    expect(result.archetype).toBe('schemer');
  });

  it('maps rival zealot → enforcer', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      rival: { id: 'r3', name: 'Beacon', personality: 'zealot', level: 4, hostility: 30 },
    });
    expect(result.archetype).toBe('enforcer');
  });

  it('maps rival sadist → wildcard', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      rival: { id: 'r4', name: 'Havoc', personality: 'sadist', level: 6, hostility: 60 },
    });
    expect(result.archetype).toBe('wildcard');
  });

  it('maps rival hunter → infiltrator', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      rival: { id: 'r5', name: 'Phantom', personality: 'hunter', level: 7, hostility: 40 },
    });
    expect(result.archetype).toBe('infiltrator');
  });

  // --- NPC tests ---

  it('returns kind=npc with tags→archetype mapping', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      npc: { id: 'n1', name: 'Grim', tags: ['enforcer', 'gang'], factionId: 'syndicate' },
    });
    expect(result.kind).toBe('npc');
    expect(result.name).toBe('Grim');
    expect(result.archetype).toBe('enforcer');
    expect(result.factionId).toBe('syndicate');
  });

  it('maps NPC broker tag → schemer', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      npc: { id: 'n2', name: 'Info', tags: ['broker', 'underworld'] },
    });
    expect(result.archetype).toBe('schemer');
  });

  it('maps NPC stealth tag → infiltrator', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      npc: { id: 'n3', name: 'Ghost', tags: ['stealth', 'hacker'] },
    });
    expect(result.archetype).toBe('infiltrator');
  });

  it('maps NPC violent tag → brute', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      npc: { id: 'n4', name: 'Smasher', tags: ['violent', 'raider'] },
    });
    expect(result.archetype).toBe('brute');
  });

  it('maps NPC security tag → controller', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      npc: { id: 'n5', name: 'Officer', tags: ['law_enforcement', 'patrol'] },
    });
    expect(result.archetype).toBe('controller');
  });

  it('defaults NPC with unknown tags to wildcard', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      npc: { id: 'n6', name: 'Random', tags: ['civilian', 'merchant'] },
    });
    expect(result.archetype).toBe('wildcard');
  });

  // --- Archetype fallback tests ---

  it('returns kind=archetype with district-based name when no rival or NPC', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      district: 'waterfront',
    });
    expect(result.kind).toBe('archetype');
    expect(result.name).toBe('Dockside Operative'); // wildcard default, waterfront→Dockside
  });

  it('uses encounter tags for archetype fallback', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      encounterTags: ['criminal', 'gang'],
      district: 'slums',
    });
    expect(result.archetype).toBe('enforcer');
    expect(result.name).toBe('Backstreet Enforcer');
  });

  it('generates fallback name with unknown district', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      district: 'some_new_district',
    });
    expect(result.name).toContain('Unknown');
  });

  // --- Priority tests ---

  it('rival overrides NPC', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      rival: { id: 'r1', name: 'Rival', personality: 'brute', level: 5, hostility: 50 },
      npc: { id: 'n1', name: 'NPC', tags: ['broker'] },
    });
    expect(result.kind).toBe('rival');
    expect(result.name).toBe('Rival');
  });

  it('NPC overrides archetype fallback', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      npc: { id: 'n1', name: 'NPC', tags: ['broker'] },
      encounterTags: ['violent'],
    });
    expect(result.kind).toBe('npc');
    expect(result.name).toBe('NPC');
  });

  // --- Threat tier tests ---

  it('calculates rival threatTier from level + hostility/25', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      rival: { id: 'r1', name: 'Test', personality: 'brute', level: 5, hostility: 75 },
    });
    // 5 + floor(75/25) = 5 + 3 = 8
    expect(result.threatTier).toBe(8);
  });

  it('clamps rival threatTier to 1-10', () => {
    const low = resolveOpponentIdentity({
      ...BASE_INPUT,
      rival: { id: 'r1', name: 'Weak', personality: 'brute', level: 0, hostility: 0 },
    });
    expect(low.threatTier).toBe(1);

    const high = resolveOpponentIdentity({
      ...BASE_INPUT,
      rival: { id: 'r2', name: 'Strong', personality: 'brute', level: 10, hostility: 100 },
    });
    expect(high.threatTier).toBe(10);
  });

  it('uses encounterDifficulty for NPC threatTier', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      encounterDifficulty: 7,
      npc: { id: 'n1', name: 'Test', tags: ['enforcer'] },
    });
    expect(result.threatTier).toBe(7);
  });

  it('uses encounterDifficulty for archetype threatTier', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      encounterDifficulty: 3,
    });
    expect(result.threatTier).toBe(3);
  });

  // --- Threat tier scaling of starting bonus ---

  it('gives no starting bonus for tier <5', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      encounterDifficulty: 3,
      npc: { id: 'n1', name: 'Weak', tags: ['enforcer'] }, // enforcer: control +1
    });
    expect(result.mechanics.startingResourceBonus).toEqual({});
  });

  it('gives base bonus (×1) for tier 5-7', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      encounterDifficulty: 6,
      npc: { id: 'n1', name: 'Mid', tags: ['enforcer'] }, // enforcer: control +1
    });
    expect(result.mechanics.startingResourceBonus).toEqual({ control: 1 });
  });

  it('gives enhanced bonus (×2) for tier 8+', () => {
    const result = resolveOpponentIdentity({
      ...BASE_INPUT,
      encounterDifficulty: 9,
      npc: { id: 'n1', name: 'Hard', tags: ['enforcer'] }, // enforcer: control +1
    });
    expect(result.mechanics.startingResourceBonus).toEqual({ control: 2 });
  });

  // --- Move bonuses always present ---

  it('includes move bonuses regardless of tier', () => {
    const low = resolveOpponentIdentity({
      ...BASE_INPUT,
      encounterDifficulty: 2,
      npc: { id: 'n1', name: 'Test', tags: ['enforcer'] },
    });
    expect(low.mechanics.moveBonuses.seize_control).toBeDefined();
  });

  // --- Determinism ---

  it('produces identical output for identical inputs', () => {
    const input: OpponentIdentityInput = {
      ...BASE_INPUT,
      rival: { id: 'r1', name: 'Rival', personality: 'hunter', level: 5, hostility: 50 },
    };
    const a = resolveOpponentIdentity(input);
    const b = resolveOpponentIdentity(input);
    expect(a).toEqual(b);
  });
});
