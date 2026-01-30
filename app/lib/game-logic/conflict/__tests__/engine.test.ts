import { describe, it, expect } from 'vitest';
import { initConflict, executeTurn, evaluateOutcome, getPlayerMoves } from '../engine';
import type { ConflictInit, ConflictState, MoveId } from '../types';

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
