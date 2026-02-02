import type {
  ConflictInit,
  ConflictState,
  ConflictResult,
  ConflictResources,
  ConflictLogEntry,
  MoveId,
  ConflictOutcome,
  BonusBreakdown,
} from './types';
import { CONFLICT_MOVES, isMoveAvailable, getAvailableMoves } from './moves';
import { resolveProfile, selectOpponentMove } from './ai';
import {
  deriveEncounterContext,
  computeStartingBonuses,
  computeMoveBonus,
  logBonusBreakdown,
} from './build-bonuses';

// Re-export for UI convenience
export { CONFLICT_MOVES, isMoveAvailable } from './moves';

const MAX_RESOURCE = 5;
const MIN_RESOURCE = 0;

function clampResource(v: number): number {
  return Math.max(MIN_RESOURCE, Math.min(MAX_RESOURCE, v));
}

function clampResources(r: ConflictResources): ConflictResources {
  return {
    control: clampResource(r.control),
    stability: clampResource(r.stability),
    position: clampResource(r.position),
  };
}

function resourceTotal(r: ConflictResources): number {
  return r.control + r.stability + r.position;
}

function hasCollapse(r: ConflictResources): string | null {
  if (r.control <= 0) return 'control';
  if (r.stability <= 0) return 'stability';
  if (r.position <= 0) return 'position';
  return null;
}

function opponentStartResources(difficulty: number): ConflictResources {
  if (difficulty <= 3) return { control: 2, stability: 2, position: 2 };
  if (difficulty <= 6) return { control: 3, stability: 3, position: 3 };
  if (difficulty <= 8) return { control: 3, stability: 4, position: 3 };
  return { control: 4, stability: 4, position: 4 };
}

function applyEffect(base: ConflictResources, effect: Partial<ConflictResources>): ConflictResources {
  return {
    control: base.control + (effect.control ?? 0),
    stability: base.stability + (effect.stability ?? 0),
    position: base.position + (effect.position ?? 0),
  };
}

function describeEffect(effect: Partial<ConflictResources>, prefix: string): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(effect)) {
    if (val && val !== 0) {
      const sign = val > 0 ? '+' : '';
      parts.push(`${prefix} ${key} ${sign}${val}`);
    }
  }
  return parts.join(', ');
}

/** Create a fresh conflict state from initialization parameters */
export function initConflict(init: ConflictInit): ConflictState {
  const profile = resolveProfile(init.npcTags, init.encounterCategory);
  const encounterContext = deriveEncounterContext(
    init.encounterCategory,
    init.encounterDifficulty,
    init.npcTags,
  );

  let playerResources: ConflictResources = { control: 3, stability: 3, position: 3 };
  let initBreakdown: BonusBreakdown | undefined;

  if (init.playerBuild) {
    initBreakdown = computeStartingBonuses(init.playerBuild, encounterContext);
    const bonus = initBreakdown.finalBonus;
    playerResources = clampResources({
      control: playerResources.control + (bonus.control ?? 0),
      stability: playerResources.stability + (bonus.stability ?? 0),
      position: playerResources.position + (bonus.position ?? 0),
    });
    logBonusBreakdown('Init starting bonuses', initBreakdown);
  }

  return {
    player: {
      resources: playerResources,
      label: init.playerLabel,
    },
    opponent: {
      resources: opponentStartResources(init.encounterDifficulty),
      label: init.opponentLabel,
    },
    turn: 1,
    maxTurns: 4,
    log: [],
    collapseEvents: [],
    ended: false,
    category: init.encounterCategory,
    npcTags: init.npcTags,
    opponentProfile: profile,
    encounterContext,
    playerBuild: init.playerBuild,
    initBreakdown,
  };
}

/** Execute one turn of the conflict (immutable — returns new state) */
export function executeTurn(state: ConflictState, playerMoveId: MoveId): ConflictState {
  if (state.ended) return state;

  const playerMove = CONFLICT_MOVES[playerMoveId];
  if (!playerMove) return state;
  if (!isMoveAvailable(playerMoveId, state.player.resources)) return state;

  // AI selects opponent move
  const opponentMoveId = selectOpponentMove(
    {
      encounterCategory: state.category,
      npcTags: state.npcTags,
      resources: { ...state.opponent.resources },
      playerResources: { ...state.player.resources },
      turn: state.turn,
      maxTurns: state.maxTurns,
    },
    state.opponentProfile,
  );
  const opponentMove = CONFLICT_MOVES[opponentMoveId];

  // --- Resolve simultaneously ---
  // Start with base effects
  let newPlayerRes = applyEffect(state.player.resources, playerMove.selfEffect);
  let newOpponentRes = applyEffect(state.opponent.resources, opponentMove.selfEffect);

  // Apply opponent effects (player's move hits opponent, and vice versa)
  newOpponentRes = applyEffect(newOpponentRes, playerMove.opponentEffect);
  newPlayerRes = applyEffect(newPlayerRes, opponentMove.opponentEffect);

  // Apply build-based move bonuses (before counter bonuses)
  let playerMoveBonus: BonusBreakdown | undefined;
  if (state.playerBuild && state.encounterContext) {
    playerMoveBonus = computeMoveBonus(playerMoveId, state.playerBuild, state.encounterContext);
    if (playerMoveBonus.entries.length > 0) {
      const bonus = playerMoveBonus.finalBonus;
      for (const key of ['control', 'stability', 'position'] as const) {
        const delta = bonus[key];
        if (!delta) continue;
        if (delta > 0) {
          // Positive = self benefit
          newPlayerRes = applyEffect(newPlayerRes, { [key]: delta });
        } else {
          // Negative = opponent damage
          newOpponentRes = applyEffect(newOpponentRes, { [key]: delta });
        }
      }
      logBonusBreakdown(`Turn ${state.turn} move bonus (${playerMoveId})`, playerMoveBonus);
    }
  }

  // Check counter bonuses
  let playerCounterTriggered = false;
  let opponentCounterTriggered = false;

  // Player's counter: triggered if opponent's move matches player's counterBonus.triggeredBy
  if (playerMove.counterBonus && opponentMoveId === playerMove.counterBonus.triggeredBy) {
    playerCounterTriggered = true;
    if (playerMove.counterBonus.selfEffect) {
      newPlayerRes = applyEffect(newPlayerRes, playerMove.counterBonus.selfEffect);
    }
    if (playerMove.counterBonus.opponentEffect) {
      newOpponentRes = applyEffect(newOpponentRes, playerMove.counterBonus.opponentEffect);
    }
  }

  // Opponent's counter: triggered if player's move matches opponent's counterBonus.triggeredBy
  if (opponentMove.counterBonus && playerMoveId === opponentMove.counterBonus.triggeredBy) {
    opponentCounterTriggered = true;
    if (opponentMove.counterBonus.selfEffect) {
      newOpponentRes = applyEffect(newOpponentRes, opponentMove.counterBonus.selfEffect);
    }
    if (opponentMove.counterBonus.opponentEffect) {
      newPlayerRes = applyEffect(newPlayerRes, opponentMove.counterBonus.opponentEffect);
    }
  }

  // Clamp resources
  newPlayerRes = clampResources(newPlayerRes);
  newOpponentRes = clampResources(newOpponentRes);

  // Build effect descriptions
  const playerEffects: string[] = [];
  playerEffects.push(describeEffect(playerMove.selfEffect, 'self'));
  if (Object.keys(playerMove.opponentEffect).length > 0) {
    playerEffects.push(describeEffect(playerMove.opponentEffect, 'opp'));
  }
  if (playerCounterTriggered) {
    playerEffects.push('COUNTER!');
  }

  const opponentEffects: string[] = [];
  opponentEffects.push(describeEffect(opponentMove.selfEffect, 'self'));
  if (Object.keys(opponentMove.opponentEffect).length > 0) {
    opponentEffects.push(describeEffect(opponentMove.opponentEffect, 'opp'));
  }
  if (opponentCounterTriggered) {
    opponentEffects.push('COUNTER!');
  }

  // Collapse checks
  const newCollapseEvents = [...state.collapseEvents];
  const playerCollapse = hasCollapse(newPlayerRes);
  const opponentCollapse = hasCollapse(newOpponentRes);

  if (playerCollapse) {
    newCollapseEvents.push({ turn: state.turn, who: 'player', resource: playerCollapse });
  }
  if (opponentCollapse) {
    newCollapseEvents.push({ turn: state.turn, who: 'opponent', resource: opponentCollapse });
  }

  const logEntry: ConflictLogEntry = {
    turn: state.turn,
    playerMove: playerMoveId,
    opponentMove: opponentMoveId,
    playerEffectText: playerEffects.filter(Boolean).join('; '),
    opponentEffectText: opponentEffects.filter(Boolean).join('; '),
    playerSnapshot: { ...newPlayerRes },
    opponentSnapshot: { ...newOpponentRes },
    playerCounterTriggered,
    opponentCounterTriggered,
    playerMoveBonus: playerMoveBonus?.entries.length ? playerMoveBonus : undefined,
  };

  const ended = !!playerCollapse || !!opponentCollapse || state.turn >= state.maxTurns;

  return {
    ...state,
    player: { ...state.player, resources: newPlayerRes },
    opponent: { ...state.opponent, resources: newOpponentRes },
    turn: state.turn + 1,
    log: [...state.log, logEntry],
    collapseEvents: newCollapseEvents,
    ended,
  };
}

/** Evaluate the final outcome of a conflict */
export function evaluateOutcome(state: ConflictState): ConflictResult {
  const playerCollapsed = state.collapseEvents.some((e) => e.who === 'player');
  const opponentCollapsed = state.collapseEvents.some((e) => e.who === 'opponent');

  let outcome: ConflictOutcome;

  if (opponentCollapsed && !playerCollapsed) {
    outcome = 'player_victory';
  } else if (playerCollapsed && !opponentCollapsed) {
    outcome = 'opponent_victory';
  } else if (playerCollapsed && opponentCollapsed) {
    // Both collapsed same turn — compare totals
    const pTotal = resourceTotal(state.player.resources);
    const oTotal = resourceTotal(state.opponent.resources);
    outcome = pTotal > oTotal ? 'player_victory' : pTotal < oTotal ? 'opponent_victory' : 'stalemate';
  } else {
    // No collapse — compare totals
    const pTotal = resourceTotal(state.player.resources);
    const oTotal = resourceTotal(state.opponent.resources);
    outcome = pTotal > oTotal ? 'player_victory' : pTotal < oTotal ? 'opponent_victory' : 'stalemate';
  }

  const turnsPlayed = state.log.length;

  // Flags
  const flawlessVictory =
    outcome === 'player_victory' &&
    state.player.resources.control >= 3 &&
    state.player.resources.stability >= 3 &&
    state.player.resources.position >= 3;

  const quickVictory = outcome === 'player_victory' && turnsPlayed <= 2;
  const desperateStand =
    outcome === 'player_victory' &&
    state.log.some((entry) => {
      const snap = entry.playerSnapshot;
      return snap.control <= 1 || snap.stability <= 1 || snap.position <= 1;
    });
  const totalDefeat =
    outcome === 'opponent_victory' &&
    resourceTotal(state.player.resources) <= 3;

  // Narrative summary
  let narrativeSummary: string;
  if (outcome === 'player_victory') {
    if (flawlessVictory) {
      narrativeSummary = 'You dominated the conflict without breaking a sweat. Your opponent never stood a chance.';
    } else if (quickVictory) {
      narrativeSummary = 'A swift and decisive victory. Your opponent crumbled under your opening moves.';
    } else if (desperateStand) {
      narrativeSummary = 'It was close — you teetered on the edge, but pulled through with sheer determination.';
    } else {
      narrativeSummary = 'You outmaneuvered your opponent and seized control of the situation.';
    }
  } else if (outcome === 'opponent_victory') {
    if (totalDefeat) {
      narrativeSummary = 'A crushing defeat. Your opponent dismantled your position completely.';
    } else {
      narrativeSummary = 'Your opponent gained the upper hand and forced you into retreat.';
    }
  } else {
    narrativeSummary = 'Neither side could gain a decisive advantage. The conflict ended in a tense standoff.';
  }

  return {
    outcome,
    turnsPlayed,
    playerFinalResources: { ...state.player.resources },
    opponentFinalResources: { ...state.opponent.resources },
    collapseEvents: [...state.collapseEvents],
    conflictLog: [...state.log],
    narrativeSummary,
    flags: { flawlessVictory, quickVictory, desperateStand, totalDefeat },
  };
}

/** Get available player moves for the current state */
export function getPlayerMoves(state: ConflictState): MoveId[] {
  if (state.ended) return [];
  return getAvailableMoves(state.player.resources);
}
