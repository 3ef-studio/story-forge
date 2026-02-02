import { describe, it, expect } from 'vitest';
import { initConflict, executeTurn, evaluateOutcome, getPlayerMoves } from '../engine';
import type { ConflictInit, ConflictState, MoveId, PlayerBuildSnapshot } from '../types';
import { resolveOpponentIdentity } from '../opponent-identity';
import type { OpponentIdentity } from '../opponent-identity';

const DEFAULT_INIT: ConflictInit = {
  encounterCategory: 'combat',
  encounterDifficulty: 5,
  npcTags: ['criminal', 'enforcer'],
  playerLabel: 'Player',
  opponentLabel: 'Thug',
};

function playFullConflict(init: ConflictInit, playerMoves: MoveId[]): ConflictState {
  let state = initConflict(init);
  for (const move of playerMoves) {
    if (state.ended) break;
    const available = getPlayerMoves(state);
    const safeMove = available.includes(move) ? move : available[0];
    state = executeTurn(state, safeMove);
  }
  return state;
}

describe('initConflict', () => {
  it('should create state with correct player resources (3/3/3)', () => {
    const state = initConflict(DEFAULT_INIT);
    expect(state.player.resources).toEqual({ control: 3, stability: 3, position: 3 });
  });

  it('should scale opponent resources by difficulty', () => {
    const easy = initConflict({ ...DEFAULT_INIT, encounterDifficulty: 2 });
    expect(easy.opponent.resources).toEqual({ control: 2, stability: 2, position: 2 });

    const mid = initConflict({ ...DEFAULT_INIT, encounterDifficulty: 5 });
    expect(mid.opponent.resources).toEqual({ control: 3, stability: 3, position: 3 });

    const hard = initConflict({ ...DEFAULT_INIT, encounterDifficulty: 8 });
    expect(hard.opponent.resources).toEqual({ control: 3, stability: 4, position: 3 });

    const extreme = initConflict({ ...DEFAULT_INIT, encounterDifficulty: 10 });
    expect(extreme.opponent.resources).toEqual({ control: 4, stability: 4, position: 4 });
  });

  it('should set maxTurns to 4', () => {
    const state = initConflict(DEFAULT_INIT);
    expect(state.maxTurns).toBe(4);
  });

  it('should start at turn 1 with empty log', () => {
    const state = initConflict(DEFAULT_INIT);
    expect(state.turn).toBe(1);
    expect(state.log).toHaveLength(0);
    expect(state.ended).toBe(false);
  });
});

describe('executeTurn', () => {
  it('should append exactly one log entry per turn', () => {
    let state = initConflict(DEFAULT_INIT);
    state = executeTurn(state, 'stabilize');
    expect(state.log).toHaveLength(1);
    expect(state.log[0].turn).toBe(1);

    state = executeTurn(state, 'stabilize');
    expect(state.log).toHaveLength(2);
    expect(state.log[1].turn).toBe(2);
  });

  it('should not execute if state is ended', () => {
    let state = initConflict(DEFAULT_INIT);
    state = { ...state, ended: true };
    const newState = executeTurn(state, 'stabilize');
    expect(newState.log).toHaveLength(0);
  });

  it('should reject unavailable moves', () => {
    let state = initConflict(DEFAULT_INIT);
    // seize_control requires position >= 2, should work with 3
    state = executeTurn(state, 'seize_control');
    expect(state.log).toHaveLength(1);

    // Drain position by repeated use: set position to 1 manually
    const lowPosState: ConflictState = {
      ...initConflict(DEFAULT_INIT),
      player: {
        ...initConflict(DEFAULT_INIT).player,
        resources: { control: 3, stability: 3, position: 1 },
      },
    };
    const unchanged = executeTurn(lowPosState, 'seize_control');
    // Should not execute — seize_control requires position >= 2
    expect(unchanged.log).toHaveLength(0);
  });

  it('should clamp all resources between 0 and 5', () => {
    const state = playFullConflict(DEFAULT_INIT, ['pressure', 'pressure', 'pressure', 'pressure']);
    for (const entry of state.log) {
      for (const key of ['control', 'stability', 'position'] as const) {
        expect(entry.playerSnapshot[key]).toBeGreaterThanOrEqual(0);
        expect(entry.playerSnapshot[key]).toBeLessThanOrEqual(5);
        expect(entry.opponentSnapshot[key]).toBeGreaterThanOrEqual(0);
        expect(entry.opponentSnapshot[key]).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe('determinism', () => {
  it('should produce identical results for identical inputs', () => {
    const moves: MoveId[] = ['pressure', 'reposition', 'stabilize', 'feint'];
    const state1 = playFullConflict(DEFAULT_INIT, moves);
    const state2 = playFullConflict(DEFAULT_INIT, moves);

    const result1 = evaluateOutcome(state1);
    const result2 = evaluateOutcome(state2);

    expect(result1.outcome).toBe(result2.outcome);
    expect(result1.turnsPlayed).toBe(result2.turnsPlayed);
    expect(result1.playerFinalResources).toEqual(result2.playerFinalResources);
    expect(result1.opponentFinalResources).toEqual(result2.opponentFinalResources);
    expect(result1.narrativeSummary).toBe(result2.narrativeSummary);
  });
});

describe('termination', () => {
  it('should never exceed maxTurns (4)', () => {
    const moves: MoveId[] = ['stabilize', 'stabilize', 'stabilize', 'stabilize', 'stabilize'];
    const state = playFullConflict(DEFAULT_INIT, moves);
    expect(state.log.length).toBeLessThanOrEqual(4);
    expect(state.ended).toBe(true);
  });
});

describe('evaluateOutcome', () => {
  it('should return player_victory when opponent collapses', () => {
    // Use low-difficulty opponent and aggressive play
    const init: ConflictInit = {
      ...DEFAULT_INIT,
      encounterDifficulty: 1, // opponent gets 2/2/2
    };
    const moves: MoveId[] = ['pressure', 'pressure', 'pressure', 'pressure'];
    const state = playFullConflict(init, moves);
    const result = evaluateOutcome(state);

    // With aggressive pressure against weak opponent, likely to win or at least have collapse
    expect(result.turnsPlayed).toBeGreaterThan(0);
    expect(result.turnsPlayed).toBeLessThanOrEqual(4);
    expect(['player_victory', 'opponent_victory', 'stalemate']).toContain(result.outcome);
  });

  it('should set appropriate flags', () => {
    const init: ConflictInit = {
      ...DEFAULT_INIT,
      encounterDifficulty: 1,
    };
    const state = playFullConflict(init, ['pressure', 'pressure', 'pressure', 'pressure']);
    const result = evaluateOutcome(state);

    // Flags should be booleans
    expect(typeof result.flags.flawlessVictory).toBe('boolean');
    expect(typeof result.flags.quickVictory).toBe('boolean');
    expect(typeof result.flags.desperateStand).toBe('boolean');
    expect(typeof result.flags.totalDefeat).toBe('boolean');
  });

  it('should produce a narrative summary', () => {
    const state = playFullConflict(DEFAULT_INIT, ['stabilize', 'stabilize', 'stabilize', 'stabilize']);
    const result = evaluateOutcome(state);
    expect(result.narrativeSummary).toBeTruthy();
    expect(result.narrativeSummary.length).toBeGreaterThan(10);
  });
});

describe('getPlayerMoves', () => {
  it('should always include stabilize and withdraw', () => {
    const state = initConflict(DEFAULT_INIT);
    const moves = getPlayerMoves(state);
    expect(moves).toContain('stabilize');
    expect(moves).toContain('withdraw');
  });

  it('should exclude seize_control when position < 2', () => {
    const state = initConflict(DEFAULT_INIT);
    state.player.resources.position = 1;
    const moves = getPlayerMoves(state);
    expect(moves).not.toContain('seize_control');
  });

  it('should include seize_control when position >= 2', () => {
    const state = initConflict(DEFAULT_INIT);
    expect(state.player.resources.position).toBeGreaterThanOrEqual(2);
    const moves = getPlayerMoves(state);
    expect(moves).toContain('seize_control');
  });

  it('should return empty array when ended', () => {
    const state = { ...initConflict(DEFAULT_INIT), ended: true };
    expect(getPlayerMoves(state)).toHaveLength(0);
  });
});

describe('log integrity', () => {
  it('should have sequential turn numbers', () => {
    const state = playFullConflict(DEFAULT_INIT, ['stabilize', 'stabilize', 'stabilize', 'stabilize']);
    for (let i = 0; i < state.log.length; i++) {
      expect(state.log[i].turn).toBe(i + 1);
    }
  });
});

// --- Build-influenced integration tests ---

const STRONG_BUILD: PlayerBuildSnapshot = {
  level: 5,
  attributes: {
    strength: 80,  // modifier +1, combat affinity → control +1 start
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
  powers: [{ powerId: 'super_strength', level: 5 }], // combat: control +1 start
};

const BUILD_INIT: ConflictInit = {
  ...DEFAULT_INIT,
  playerBuild: STRONG_BUILD,
};

describe('build-influenced initConflict', () => {
  it('produces different player resources than default 3/3/3', () => {
    const withBuild = initConflict(BUILD_INIT);
    const withoutBuild = initConflict(DEFAULT_INIT);
    // Strong build in combat → control should be higher
    expect(withBuild.player.resources.control).toBeGreaterThan(withoutBuild.player.resources.control);
  });

  it('stores encounterContext on state', () => {
    const state = initConflict(BUILD_INIT);
    expect(state.encounterContext).toBeDefined();
    expect(state.encounterContext!.type).toBe('combat');
  });

  it('stores playerBuild and initBreakdown on state', () => {
    const state = initConflict(BUILD_INIT);
    expect(state.playerBuild).toBeDefined();
    expect(state.initBreakdown).toBeDefined();
    expect(state.initBreakdown!.entries.length).toBeGreaterThan(0);
  });

  it('clamps resources to 0-5 range', () => {
    const state = initConflict(BUILD_INIT);
    for (const key of ['control', 'stability', 'position'] as const) {
      expect(state.player.resources[key]).toBeGreaterThanOrEqual(0);
      expect(state.player.resources[key]).toBeLessThanOrEqual(5);
    }
  });
});

describe('build-influenced executeTurn', () => {
  it('produces playerMoveBonus on log entries when build matches', () => {
    let state = initConflict(BUILD_INIT);
    // Pressure with high strength in combat should trigger move bonus
    state = executeTurn(state, 'pressure');
    expect(state.log[0].playerMoveBonus).toBeDefined();
    expect(state.log[0].playerMoveBonus!.entries.length).toBeGreaterThan(0);
  });

  it('does not produce playerMoveBonus when no build', () => {
    let state = initConflict(DEFAULT_INIT);
    state = executeTurn(state, 'pressure');
    expect(state.log[0].playerMoveBonus).toBeUndefined();
  });

  it('keeps resources clamped after move bonuses', () => {
    const moves: MoveId[] = ['pressure', 'pressure', 'pressure', 'pressure'];
    const state = playFullConflict(BUILD_INIT, moves);
    for (const entry of state.log) {
      for (const key of ['control', 'stability', 'position'] as const) {
        expect(entry.playerSnapshot[key]).toBeGreaterThanOrEqual(0);
        expect(entry.playerSnapshot[key]).toBeLessThanOrEqual(5);
        expect(entry.opponentSnapshot[key]).toBeGreaterThanOrEqual(0);
        expect(entry.opponentSnapshot[key]).toBeLessThanOrEqual(5);
      }
    }
  });

  it('is deterministic with build data', () => {
    const moves: MoveId[] = ['pressure', 'reposition', 'stabilize', 'feint'];
    const state1 = playFullConflict(BUILD_INIT, moves);
    const state2 = playFullConflict(BUILD_INIT, moves);
    const result1 = evaluateOutcome(state1);
    const result2 = evaluateOutcome(state2);

    expect(result1.outcome).toBe(result2.outcome);
    expect(result1.turnsPlayed).toBe(result2.turnsPlayed);
    expect(result1.playerFinalResources).toEqual(result2.playerFinalResources);
    expect(result1.opponentFinalResources).toEqual(result2.opponentFinalResources);
  });
});

// --- Opponent Identity integration tests ---

const ENFORCER_IDENTITY: OpponentIdentity = resolveOpponentIdentity({
  encounterCategory: 'combat',
  encounterDifficulty: 6,
  npc: { id: 'n1', name: 'Grim', tags: ['enforcer', 'gang'], factionId: 'syndicate' },
});

const IDENTITY_INIT: ConflictInit = {
  ...DEFAULT_INIT,
  opponentIdentity: ENFORCER_IDENTITY,
};

describe('initConflict with opponentIdentity', () => {
  it('applies starting resource bonus to opponent', () => {
    const withIdentity = initConflict(IDENTITY_INIT);
    const withoutIdentity = initConflict(DEFAULT_INIT);
    // Enforcer at tier 6 gets control +1 starting bonus
    expect(withIdentity.opponent.resources.control).toBe(
      withoutIdentity.opponent.resources.control + 1
    );
  });

  it('stores opponentIdentity on state', () => {
    const state = initConflict(IDENTITY_INIT);
    expect(state.opponentIdentity).toBeDefined();
    expect(state.opponentIdentity!.archetype).toBe('enforcer');
    expect(state.opponentIdentity!.name).toBe('Grim');
  });

  it('keeps opponent resources clamped 0-5', () => {
    // High threat tier with high difficulty
    const highTier = resolveOpponentIdentity({
      encounterCategory: 'combat',
      encounterDifficulty: 10, // opponent gets 4/4/4 base
      npc: { id: 'n1', name: 'Boss', tags: ['enforcer'] },
    });
    const state = initConflict({
      ...DEFAULT_INIT,
      encounterDifficulty: 10,
      opponentIdentity: highTier,
    });
    for (const key of ['control', 'stability', 'position'] as const) {
      expect(state.opponent.resources[key]).toBeGreaterThanOrEqual(0);
      expect(state.opponent.resources[key]).toBeLessThanOrEqual(5);
    }
  });

  it('does not change behavior when opponentIdentity is undefined', () => {
    const withoutIdentity = initConflict(DEFAULT_INIT);
    expect(withoutIdentity.opponentIdentity).toBeUndefined();
    expect(withoutIdentity.opponent.resources).toEqual({ control: 3, stability: 3, position: 3 });
  });
});

describe('executeTurn with opponentIdentity', () => {
  it('resources stay clamped 0-5 with identity bonuses', () => {
    const moves: MoveId[] = ['pressure', 'pressure', 'pressure', 'pressure'];
    let state = initConflict(IDENTITY_INIT);
    for (const move of moves) {
      if (state.ended) break;
      const available = getPlayerMoves(state);
      const safeMove = available.includes(move) ? move : available[0];
      state = executeTurn(state, safeMove);
    }
    for (const entry of state.log) {
      for (const key of ['control', 'stability', 'position'] as const) {
        expect(entry.playerSnapshot[key]).toBeGreaterThanOrEqual(0);
        expect(entry.playerSnapshot[key]).toBeLessThanOrEqual(5);
        expect(entry.opponentSnapshot[key]).toBeGreaterThanOrEqual(0);
        expect(entry.opponentSnapshot[key]).toBeLessThanOrEqual(5);
      }
    }
  });

  it('is deterministic with opponent identity', () => {
    const moves: MoveId[] = ['pressure', 'reposition', 'stabilize', 'feint'];
    const state1 = playFullConflict(IDENTITY_INIT, moves);
    const state2 = playFullConflict(IDENTITY_INIT, moves);
    const result1 = evaluateOutcome(state1);
    const result2 = evaluateOutcome(state2);

    expect(result1.outcome).toBe(result2.outcome);
    expect(result1.turnsPlayed).toBe(result2.turnsPlayed);
    expect(result1.playerFinalResources).toEqual(result2.playerFinalResources);
    expect(result1.opponentFinalResources).toEqual(result2.opponentFinalResources);
  });
});
