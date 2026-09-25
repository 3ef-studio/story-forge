/**
 * Smoke: core gameplay loop.
 *
 * Shallow "does it run and return something sane" checks for the systems a
 * player hits on every action: encounter resolution, the conflict engine,
 * PvP, follow-up actions, and the deterministic half of the AI pipeline.
 *
 * Asserts invariants (ranges, shapes, determinism), not exact balance numbers.
 * No DB, no OpenAI key, no network.
 */
import { describe, it, expect } from 'vitest';
import { initConflict, executeTurn, evaluateOutcome, getPlayerMoves } from '@/app/lib/game-logic/conflict/engine';
import type { ConflictInit, ConflictState } from '@/app/lib/game-logic/conflict/types';
import { runPvpCombat } from '@/app/lib/game-logic/pvp/combat-simulator';
import { calculateEloUpdate, PVP_ELO_START } from '@/app/lib/game-logic/pvp/pvp-core';
import type { CombatantSnapshot } from '@/app/lib/game-logic/pvp/types';
import {
  resolveEncounter,
  previewEncounterResolution,
  APPROACH_ATTRIBUTES,
} from '@/app/lib/game-logic/combat/resolve-encounter';
import type { Approach } from '@/app/lib/game-logic/combat/types';
import {
  generateFollowUps,
  decrementFollowUpTTLs,
  mergeFollowUps,
  addHistoryEntries,
  type FollowUpAction,
  type FollowUpContext,
  type FollowUpHistory,
} from '@/app/lib/game-logic/follow-up-actions';
// Safe to import: neither module imports app/lib/openai.ts (which constructs
// an OpenAI client at import time). Never import encounter-seed-generator here.
import { personalizeSeed } from '@/app/lib/ai/encounter-personalizer';
import { SEED_FEW_SHOT_EXAMPLE } from '@/app/lib/ai/seed-prompts';
import type { EncounterSeed } from '@/app/lib/ai/types';

const APPROACHES = Object.keys(APPROACH_ATTRIBUTES) as Approach[];

const ATTRIBUTES = {
  strength: 50, agility: 50, intelligence: 50, endurance: 50, charisma: 50,
  willpower: 50, perception: 50, stealth: 50, reputation: 50, notoriety: 50,
};

describe('smoke: encounter resolution', () => {
  it.each(APPROACHES)('previews and resolves a %s encounter', (approach) => {
    const input = {
      difficulty: 5,
      approach,
      attributes: ATTRIBUTES,
      powerIds: [],
      repByFaction: {},
    };

    const preview = previewEncounterResolution(input);
    expect(preview.estimatedChance).toBeGreaterThanOrEqual(0);
    expect(preview.estimatedChance).toBeLessThanOrEqual(100);

    const result = resolveEncounter({ ...input, rng: () => 0.5 });
    expect(['success', 'partial', 'failure']).toContain(result.outcome);
    expect(result.roll).toBeGreaterThanOrEqual(1);
    expect(result.roll).toBeLessThanOrEqual(100);
    // Same rng → same answer.
    expect(resolveEncounter({ ...input, rng: () => 0.5 })).toEqual(result);
  });

  it('a max roll beats a min roll', () => {
    const input = { difficulty: 5, approach: 'direct' as const, attributes: ATTRIBUTES, powerIds: [], repByFaction: {} };
    const rank = { failure: 0, partial: 1, success: 2 } as const;
    const high = resolveEncounter({ ...input, rng: () => 0.999 });
    const low = resolveEncounter({ ...input, rng: () => 0 });
    expect(rank[high.outcome]).toBeGreaterThanOrEqual(rank[low.outcome]);
  });
});

describe('smoke: conflict engine', () => {
  const init: ConflictInit = {
    encounterCategory: 'combat',
    encounterDifficulty: 5,
    npcTags: ['criminal'],
    playerLabel: 'Player',
    opponentLabel: 'Thug',
  };

  function playOut(): ConflictState {
    let state = initConflict(init);
    for (let i = 0; i < 20 && !state.ended; i++) {
      const moves = getPlayerMoves(state);
      expect(moves.length).toBeGreaterThan(0);
      state = executeTurn(state, moves[0]);
    }
    return state;
  }

  it('plays a full conflict to a terminal outcome', () => {
    const state = playOut();
    expect(state.ended).toBe(true);
    expect(state.log.length).toBeLessThanOrEqual(state.maxTurns);

    const result = evaluateOutcome(state);
    expect(['player_victory', 'opponent_victory', 'stalemate']).toContain(result.outcome);
    expect(result.narrativeSummary).toBeTruthy();
  });

  it('is deterministic', () => {
    expect(evaluateOutcome(playOut())).toEqual(evaluateOutcome(playOut()));
  });
});

describe('smoke: pvp', () => {
  const snapshot = (id: string): CombatantSnapshot => ({
    characterId: id,
    characterName: id,
    level: 5,
    pvpRating: PVP_ELO_START,
    build: { level: 5, attributes: ATTRIBUTES, powers: [] },
  });

  it('runs a combat within the turn cap', () => {
    const result = runPvpCombat(snapshot('a'), snapshot('b'));
    expect(['player_victory', 'opponent_victory', 'stalemate']).toContain(result.outcome);
    expect(result.turnsPlayed).toBeGreaterThan(0);
    expect(result.turnsPlayed).toBeLessThanOrEqual(4);
  });

  it('Elo update is zero-sum', () => {
    const r = calculateEloUpdate(1040, 980, true);
    expect(r.attackerDelta + r.defenderDelta).toBe(0);
    expect(r.attackerDelta).toBeGreaterThan(0);
  });
});

describe('smoke: follow-up actions', () => {
  it('generate → merge → TTL cycle stays deduped and bounded', () => {
    let pending: FollowUpAction[] = [];
    let history: FollowUpHistory = { entries: [] };
    let generatedTotal = 0;

    for (let i = 0; i < 8; i++) {
      pending = decrementFollowUpTTLs(pending).alive;
      const ctx: FollowUpContext = {
        characterId: 'smoke_char',
        actionCounter: i,
        encounterId: `enc_${i}`,
        seedId: `seed_${i}`,
        encounterType: ['criminal', 'heroic', 'neutral', 'social'][i % 4],
        encounterDifficulty: 5,
        factions: [['syndicate'], ['metro_police'], []][i % 3],
        district: 'downtown',
        actionId: `action_${i}`,
        outcomeType: (['success', 'partial', 'failure'] as const)[i % 3],
        conflictResult: (['victory', 'defeat', 'partial'] as const)[i % 3],
        rivalPresent: false,
        leverageState: { control: 0, stability: 0, position: 0 },
        baseActionIntent: 'neutral',
      };
      const fresh = generateFollowUps(ctx, { max: 3, history, cooldownActions: 3, pendingFollowUps: pending });
      generatedTotal += fresh.length;
      history = addHistoryEntries(
        history,
        fresh.map((f) => ({ followUpKey: f.followUpKey, actionCounter: i, status: 'generated' as const })),
      );
      pending = mergeFollowUps(pending, fresh, { maxTotal: 5 });

      expect(pending.length).toBeLessThanOrEqual(5);
      expect(new Set(pending.map((f) => f.followUpKey)).size).toBe(pending.length);
    }

    expect(generatedTotal).toBeGreaterThan(0);
  });
});

describe('smoke: AI pipeline (deterministic half, no API call)', () => {
  function seedFromFewShotExample(): EncounterSeed {
    // The few-shot example embedded in the seed prompt must itself be valid
    // JSON the pipeline can consume — if it rots, the model is being taught a
    // broken shape.
    const json = SEED_FEW_SHOT_EXAMPLE.slice(
      SEED_FEW_SHOT_EXAMPLE.indexOf('{'),
      SEED_FEW_SHOT_EXAMPLE.lastIndexOf('}') + 1,
    );
    const raw = JSON.parse(json);
    return {
      ...raw,
      seedId: 'smoke-seed',
      category: 'combat',
      difficulty: 5,
      involvedFactions: ['civilian_population'],
      location: 'downtown',
    };
  }

  it('few-shot seed example is well-formed', () => {
    const seed = seedFromFewShotExample();
    expect(seed.choices).toHaveLength(4);
    const choiceIds = seed.choices.map((c) => c.id);
    for (const outcome of seed.outcomes) {
      expect(choiceIds).toContain(outcome.choiceId);
      expect(outcome.successChance).toBeGreaterThan(0);
      expect(outcome.successChance).toBeLessThanOrEqual(1);
    }
  });

  it('personalizeSeed turns a seed into a playable encounter', () => {
    const seed = seedFromFewShotExample();
    const input = {
      seed,
      characterName: 'Smoke Tester',
      originName: 'Test Origin',
      powerNames: ['Super Strength'],
      reputationTiers: [{ factionId: 'civilian_population', tier: 'friendly' as const }],
      recentEncounterTags: [],
      moralIntent: 'heroic' as const,
    };
    const encounter = personalizeSeed(input);

    expect(encounter.name).toBeTruthy();
    expect(encounter.description).toBeTruthy();
    expect(encounter.choices.map((c) => c.id)).toEqual(seed.choices.map((c) => c.id));
    expect(encounter.outcomes).toEqual(seed.outcomes); // personalization must not change mechanics
    expect(personalizeSeed(input)).toEqual(encounter); // deterministic
  });
});
