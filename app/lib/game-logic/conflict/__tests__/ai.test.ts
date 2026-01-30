import { describe, it, expect } from 'vitest';
import { resolveProfile, selectOpponentMove } from '../ai';
import { getAvailableMoves } from '../moves';
import type { AIContext, OpponentProfile } from '../types';

describe('resolveProfile', () => {
  it('should map criminal tags to aggressive', () => {
    expect(resolveProfile(['criminal', 'thief'], 'crime')).toBe('aggressive');
    expect(resolveProfile(['enforcer'], 'combat')).toBe('aggressive');
    expect(resolveProfile(['gang'], 'social')).toBe('aggressive');
  });

  it('should map law_enforcement tags to defensive', () => {
    expect(resolveProfile(['law_enforcement'], 'enforcement')).toBe('defensive');
    expect(resolveProfile(['patrol'], 'combat')).toBe('defensive');
    expect(resolveProfile(['guardian'], 'social')).toBe('defensive');
  });

  it('should map broker/informant/tech/stealth tags to cunning', () => {
    expect(resolveProfile(['broker'], 'social')).toBe('cunning');
    expect(resolveProfile(['informant'], 'crime')).toBe('cunning');
    expect(resolveProfile(['tech'], 'exploration')).toBe('cunning');
    expect(resolveProfile(['stealth'], 'combat')).toBe('cunning');
  });

  it('should fall back to category map when no matching tags', () => {
    expect(resolveProfile([], 'combat')).toBe('aggressive');
    expect(resolveProfile([], 'enforcement')).toBe('defensive');
    expect(resolveProfile([], 'crime')).toBe('cunning');
  });

  it('should fall back to balanced as last resort', () => {
    expect(resolveProfile([], 'unknown_category')).toBe('balanced');
    expect(resolveProfile(['irrelevant_tag'], 'nonexistent')).toBe('balanced');
  });
});

describe('selectOpponentMove', () => {
  const baseCtx: AIContext = {
    encounterCategory: 'combat',
    npcTags: ['criminal'],
    resources: { control: 3, stability: 3, position: 3 },
    playerResources: { control: 3, stability: 3, position: 3 },
    turn: 1,
    maxTurns: 4,
  };

  it('should be deterministic — same context always returns same move', () => {
    const profile: OpponentProfile = 'aggressive';
    const move1 = selectOpponentMove(baseCtx, profile);
    const move2 = selectOpponentMove(baseCtx, profile);
    const move3 = selectOpponentMove(baseCtx, profile);
    expect(move1).toBe(move2);
    expect(move2).toBe(move3);
  });

  it('should always return an available move', () => {
    const profiles: OpponentProfile[] = ['aggressive', 'defensive', 'cunning', 'balanced'];

    for (const profile of profiles) {
      for (let turn = 1; turn <= 4; turn++) {
        const ctx: AIContext = {
          ...baseCtx,
          turn,
          resources: { control: 1, stability: 1, position: 1 },
        };
        const move = selectOpponentMove(ctx, profile);
        const available = getAvailableMoves(ctx.resources);
        expect(available).toContain(move);
      }
    }
  });

  it('should never pick an unavailable move with low resources', () => {
    const ctx: AIContext = {
      ...baseCtx,
      resources: { control: 0, stability: 0, position: 0 },
    };

    // With all resources at 0, only stabilize and withdraw should be available
    const available = getAvailableMoves(ctx.resources);
    expect(available).toContain('stabilize');
    expect(available).toContain('withdraw');
    expect(available).not.toContain('pressure');
    expect(available).not.toContain('seize_control');
    expect(available).not.toContain('reposition');
    expect(available).not.toContain('feint');

    const profiles: OpponentProfile[] = ['aggressive', 'defensive', 'cunning', 'balanced'];
    for (const profile of profiles) {
      const move = selectOpponentMove(ctx, profile);
      expect(available).toContain(move);
    }
  });

  it('should vary moves across different turns', () => {
    const moves = new Set<string>();
    for (let turn = 1; turn <= 10; turn++) {
      const ctx: AIContext = { ...baseCtx, turn };
      const move = selectOpponentMove(ctx, 'balanced');
      moves.add(move);
    }
    // With balanced profile and varied turns, should pick at least 2 different moves
    expect(moves.size).toBeGreaterThanOrEqual(2);
  });

  it('should work with extreme resource values', () => {
    const lowCtx: AIContext = {
      ...baseCtx,
      resources: { control: 0, stability: 1, position: 0 },
      playerResources: { control: 5, stability: 5, position: 5 },
    };
    const move = selectOpponentMove(lowCtx, 'defensive');
    const available = getAvailableMoves(lowCtx.resources);
    expect(available).toContain(move);
  });
});
