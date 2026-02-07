import type {
  ConflictInit,
  ConflictState,
  ConflictResult,
  ConflictResources,
  ConflictLogEntry,
  MoveId,
  ConflictOutcome,
  BonusBreakdown,
  OpponentLeverageState,
  OpponentLeverageSpendLog,
  HeatEffects,
} from './types';
import type { OpponentArchetype } from './opponent-identity';
import { CONFLICT_MOVES, isMoveAvailable, getAvailableMoves } from './moves';
import { resolveProfile, selectOpponentMove } from './ai';
import {
  deriveEncounterContext,
  computeStartingBonuses,
  computeMoveBonus,
  logBonusBreakdown,
} from './build-bonuses';
import { logOpponentIdentity } from './opponent-identity';
import { clampResourceWithOvercap, LEVERAGE_OVERCAP_MAX } from '@/app/lib/game-logic/leverage';

// Re-export for UI convenience
export { CONFLICT_MOVES, isMoveAvailable } from './moves';

const MAX_RESOURCE = 5;
const MIN_RESOURCE = 0;

function clampResource(v: number): number {
  return Math.max(MIN_RESOURCE, Math.min(MAX_RESOURCE, v));
}

/** Clamp with leverage overcap — resources can go up to 7 when leverage effects apply */
function clampResourceOvercap(v: number): number {
  return clampResourceWithOvercap(v);
}

function clampResourcesOvercap(r: ConflictResources): ConflictResources {
  return {
    control: clampResourceOvercap(r.control),
    stability: clampResourceOvercap(r.stability),
    position: clampResourceOvercap(r.position),
  };
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

// --- Opponent Leverage System ---

/**
 * Compute total opponent leverage points from heat and difficulty.
 * heatBonus = clamp(floor(heat/2), 0, 3)
 * baseFromDifficulty = clamp(floor(difficulty/3), 0, 3)
 * Return clamp(base + heatBonus, 0, 5)
 */
function computeEnemyLeverageTotal(heat: number, difficulty: number): number {
  const heatBonus = Math.max(0, Math.min(3, Math.floor(heat / 2)));
  const baseFromDifficulty = Math.max(0, Math.min(3, Math.floor(difficulty / 3)));
  return Math.max(0, Math.min(5, baseFromDifficulty + heatBonus));
}

/**
 * Distribute leverage points across resources based on archetype priority.
 * Max 2 per resource, round-robin distribution.
 */
function distributeEnemyLeverage(total: number, archetype: OpponentArchetype): OpponentLeverageState {
  const priorities: Record<OpponentArchetype, Array<keyof OpponentLeverageState>> = {
    brute: ['position', 'control', 'stability'],
    controller: ['control', 'stability', 'position'],
    infiltrator: ['position', 'control', 'stability'],
    schemer: ['control', 'position', 'stability'],
    enforcer: ['stability', 'control', 'position'],
    wildcard: ['position', 'stability', 'control'],
  };

  const priority = priorities[archetype] || priorities.brute;
  const state: OpponentLeverageState = { control: 0, stability: 0, position: 0 };
  let remaining = total;

  // Round-robin with max 2 per resource
  while (remaining > 0) {
    let distributed = false;
    for (const resource of priority) {
      if (remaining > 0 && state[resource] < 2) {
        state[resource]++;
        remaining--;
        distributed = true;
      }
    }
    if (!distributed) break; // All resources at max
  }

  return state;
}

/**
 * Get heat-based starting bonus for opponent resources.
 * Bonus = clamp(floor(heat/3), 0, 2)
 * Applied to a resource based on archetype.
 */
function getHeatStartingBonus(heat: number, archetype: OpponentArchetype): Partial<ConflictResources> {
  const bonus = Math.max(0, Math.min(2, Math.floor(heat / 3)));
  if (bonus === 0) return {};

  // Resource to boost by archetype
  const resourceByArchetype: Record<OpponentArchetype, keyof ConflictResources> = {
    brute: 'position',
    controller: 'stability',
    infiltrator: 'position',
    schemer: 'control',
    enforcer: 'stability',
    wildcard: 'position',
  };

  const resource = resourceByArchetype[archetype] || 'position';
  return { [resource]: bonus };
}

/**
 * Decide if opponent should spend leverage this turn based on archetype heuristics.
 * Returns null if no spend, or the resource and effect to use.
 */
function maybeSpendOpponentLeverage(
  opponentLeverage: OpponentLeverageState,
  archetype: OpponentArchetype,
  turn: number,
  playerResources: ConflictResources,
  opponentResources: ConflictResources
): { resource: keyof OpponentLeverageState; effect: 'boost_self' | 'drain_player' } | null {
  const totalLeverage = opponentLeverage.control + opponentLeverage.stability + opponentLeverage.position;
  if (totalLeverage <= 0) return null;

  // Helper to get first available resource from priority list
  const getAvailableResource = (priority: Array<keyof OpponentLeverageState>): keyof OpponentLeverageState | null => {
    for (const r of priority) {
      if (opponentLeverage[r] > 0) return r;
    }
    return null;
  };

  const playerTotal = playerResources.control + playerResources.stability + playerResources.position;
  const opponentTotal = opponentResources.control + opponentResources.stability + opponentResources.position;
  const playerAhead = playerTotal > opponentTotal;
  const playerNearWin = playerTotal >= 12 || (playerResources.control >= 4 && playerResources.stability >= 4);

  switch (archetype) {
    case 'brute': {
      // Turn 1-2, prefer position > control, boost_self
      if (turn <= 2) {
        const resource = getAvailableResource(['position', 'control', 'stability']);
        if (resource) return { resource, effect: 'boost_self' };
      }
      break;
    }
    case 'controller': {
      // Player ahead OR opponent low stability, prefer control (drain) > stability
      if (playerAhead || opponentResources.stability <= 2) {
        const resource = getAvailableResource(['control', 'stability', 'position']);
        if (resource) return { resource, effect: resource === 'control' ? 'drain_player' : 'boost_self' };
      }
      break;
    }
    case 'infiltrator': {
      // Position disadvantage, prefer position, boost_self
      if (opponentResources.position < playerResources.position) {
        const resource = getAvailableResource(['position', 'control', 'stability']);
        if (resource) return { resource, effect: 'boost_self' };
      }
      break;
    }
    case 'schemer': {
      // Player near win, counter strongest with drain
      if (playerNearWin) {
        // Find player's strongest resource
        const strongest: keyof OpponentLeverageState =
          playerResources.control >= playerResources.stability && playerResources.control >= playerResources.position ? 'control' :
          playerResources.stability >= playerResources.position ? 'stability' : 'position';
        if (opponentLeverage[strongest] > 0) {
          return { resource: strongest, effect: 'drain_player' };
        }
        const resource = getAvailableResource(['control', 'position', 'stability']);
        if (resource) return { resource, effect: 'drain_player' };
      }
      break;
    }
    case 'enforcer': {
      // Low stability OR player near win, prefer stability > control, boost_self
      if (opponentResources.stability <= 1 || playerNearWin) {
        const resource = getAvailableResource(['stability', 'control', 'position']);
        if (resource) return { resource, effect: 'boost_self' };
      }
      break;
    }
    case 'wildcard': {
      // 50% chance (deterministic based on turn), random resource, random effect
      if (turn % 2 === 1) {
        const resources: Array<keyof OpponentLeverageState> = ['control', 'stability', 'position'];
        const availableResources = resources.filter(r => opponentLeverage[r] > 0);
        if (availableResources.length > 0) {
          const resource = availableResources[turn % availableResources.length];
          const effect = turn % 3 === 0 ? 'drain_player' : 'boost_self';
          return { resource, effect };
        }
      }
      break;
    }
  }

  return null;
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

  // Opponent starting resources (base from difficulty)
  let opponentResources = opponentStartResources(init.encounterDifficulty);

  // Apply opponent identity starting bonus if present
  if (init.opponentIdentity) {
    const bonus = init.opponentIdentity.mechanics.startingResourceBonus;
    opponentResources = clampResources(applyEffect(opponentResources, bonus));
    logOpponentIdentity(init.opponentIdentity);
  }

  // Apply heat starting bonus to opponent resources
  const heat = init.heat ?? 0;
  const archetype = init.opponentIdentity?.archetype ?? 'brute';
  const heatStartingBonus = getHeatStartingBonus(heat, archetype);
  if (Object.keys(heatStartingBonus).length > 0) {
    opponentResources = clampResources(applyEffect(opponentResources, heatStartingBonus));
  }

  // Compute opponent leverage pool (derived from heat + difficulty)
  const leverageTotal = computeEnemyLeverageTotal(heat, init.encounterDifficulty);
  const opponentLeverage = distributeEnemyLeverage(leverageTotal, archetype);

  // Build heatEffects object for UI display
  const heatEffects: HeatEffects = {
    heatAtStart: heat,
    heatBonusStart: heatStartingBonus,
    heatBonusLeverage: opponentLeverage,
  };

  // Log heat effects
  const startBonusStr = Object.entries(heatStartingBonus)
    .map(([k, v]) => `${k[0].toUpperCase()}${v}`)
    .join(' ') || 'none';
  const levBonusStr = `C${opponentLeverage.control} S${opponentLeverage.stability} P${opponentLeverage.position}`;
  console.log(`[HeatApply] heat=${heat} startBonus=${startBonusStr} levBonus=${levBonusStr}`);

  // Apply gambit effects to starting resources
  if (init.gambitResult) {
    for (const effect of init.gambitResult.effects) {
      if (effect.target === 'player') {
        playerResources = applyEffect(playerResources, { [effect.resource]: effect.delta });
      } else {
        opponentResources = applyEffect(opponentResources, { [effect.resource]: effect.delta });
      }
    }
    playerResources = clampResources(playerResources);
    opponentResources = clampResources(opponentResources);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Gambit] Applied ${init.gambitResult.outcomeTier} outcome:`, init.gambitResult.effects);
    }
  }

  return {
    player: {
      resources: playerResources,
      label: init.playerLabel,
    },
    opponent: {
      resources: opponentResources,
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
    opponentIdentity: init.opponentIdentity,
    leverage: init.leverage,
    gambitResult: init.gambitResult,
    heatAtStart: heat,
    heatEffects,
    opponentLeverage,
    opponentLeverageLog: [],
  };
}

/** Execute one turn of the conflict (immutable — returns new state) */
export function executeTurn(state: ConflictState, playerMoveId: MoveId): ConflictState {
  if (state.ended) return state;

  const playerMove = CONFLICT_MOVES[playerMoveId];
  if (!playerMove) return state;

  // Check move availability — leverage armed effects can modify requirements
  const armed = state.armedLeverage;
  let effectiveResources = state.player.resources;
  if (armed) {
    if (armed.effect.type === 'ignore_requirement' && armed.effect.resource === 'control') {
      // Override control requirement to 0 for this check
      effectiveResources = { ...effectiveResources, control: Math.max(effectiveResources.control, 99) };
    }
    if (armed.effect.type === 'virtual_boost' && armed.effect.resource === 'position') {
      effectiveResources = { ...effectiveResources, position: effectiveResources.position + 1 };
    }
  }
  if (!isMoveAvailable(playerMoveId, effectiveResources)) return state;

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

  // Check if opponent spends leverage this turn
  const archetype = state.opponentIdentity?.archetype ?? 'brute';
  const currentOpponentLeverage = state.opponentLeverage ?? { control: 0, stability: 0, position: 0 };
  const enemyLeverageSpend = maybeSpendOpponentLeverage(
    currentOpponentLeverage,
    archetype,
    state.turn,
    state.player.resources,
    state.opponent.resources
  );

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

  // Apply opponent identity move bonuses (after base effects, before counters)
  if (state.opponentIdentity?.mechanics.moveBonuses[opponentMoveId]) {
    const moveBonus = state.opponentIdentity.mechanics.moveBonuses[opponentMoveId]!;
    if (moveBonus.self) {
      newOpponentRes = applyEffect(newOpponentRes, moveBonus.self);
    }
    if (moveBonus.opponent) {
      newPlayerRes = applyEffect(newPlayerRes, moveBonus.opponent);
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Opponent Identity] Move bonus for ${opponentMoveId}:`, moveBonus);
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

  // Apply armed leverage effects (before clamping)
  let leverageApplied = false;
  const prevPlayerStability = newPlayerRes.stability;
  if (armed) {
    leverageApplied = true;
    if (armed.effect.type === 'boost_self') {
      newPlayerRes = applyEffect(newPlayerRes, { [armed.effect.resource]: 1 });
    } else if (armed.effect.type === 'drain_opponent') {
      newOpponentRes = applyEffect(newOpponentRes, { [armed.effect.resource]: -1 });
    }
    // prevent_loss: restore stability if it dropped this turn
    if (armed.effect.type === 'prevent_loss' && armed.effect.resource === 'stability') {
      if (newPlayerRes.stability < prevPlayerStability) {
        newPlayerRes.stability = prevPlayerStability;
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Leverage] Armed effect applied: ${armed.effect.type} (${armed.leverageType})`);
    }
  }

  // Apply enemy leverage spend (before clamping)
  let newOpponentLeverage = { ...currentOpponentLeverage };
  if (enemyLeverageSpend) {
    // Decrement the spent resource from the pool
    newOpponentLeverage[enemyLeverageSpend.resource] = Math.max(0, newOpponentLeverage[enemyLeverageSpend.resource] - 1);

    // Apply the effect
    if (enemyLeverageSpend.effect === 'boost_self') {
      newOpponentRes = applyEffect(newOpponentRes, { [enemyLeverageSpend.resource]: 1 });
    } else if (enemyLeverageSpend.effect === 'drain_player') {
      newPlayerRes = applyEffect(newPlayerRes, { [enemyLeverageSpend.resource]: -1 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Enemy Leverage] Spent: ${enemyLeverageSpend.resource} → ${enemyLeverageSpend.effect} (${archetype})`);
    }
  }

  // Clamp resources — use overcap (max 7) when leverage boost was applied
  if (leverageApplied) {
    newPlayerRes = clampResourcesOvercap(newPlayerRes);
  } else {
    newPlayerRes = clampResources(newPlayerRes);
  }
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
    // Telemetry: capture resources before this turn and leverage spent
    resourcesBefore: {
      player: { ...state.player.resources },
      opponent: { ...state.opponent.resources },
    },
    leverageSpentThisTurn: armed
      ? { leverageType: armed.leverageType, effectType: armed.effect.type }
      : undefined,
    enemyLeverageSpentThisTurn: enemyLeverageSpend
      ? { resource: enemyLeverageSpend.resource, effect: enemyLeverageSpend.effect }
      : undefined,
  };

  const ended = !!playerCollapse || !!opponentCollapse || state.turn >= state.maxTurns;

  // Update opponent leverage log if spent
  const newOpponentLeverageLog = [...(state.opponentLeverageLog ?? [])];
  if (enemyLeverageSpend) {
    newOpponentLeverageLog.push({
      turn: state.turn,
      resource: enemyLeverageSpend.resource,
      effect: enemyLeverageSpend.effect,
      archetype,
    });
  }

  return {
    ...state,
    player: { ...state.player, resources: newPlayerRes },
    opponent: { ...state.opponent, resources: newOpponentRes },
    turn: state.turn + 1,
    log: [...state.log, logEntry],
    collapseEvents: newCollapseEvents,
    ended,
    armedLeverage: undefined, // Clear armed effect after turn
    opponentLeverage: newOpponentLeverage,
    opponentLeverageLog: newOpponentLeverageLog,
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

/** Get available player moves for the current state (accounts for armed leverage) */
export function getPlayerMoves(state: ConflictState): MoveId[] {
  if (state.ended) return [];
  let resources = state.player.resources;
  if (state.armedLeverage) {
    const eff = state.armedLeverage.effect;
    if (eff.type === 'ignore_requirement' && eff.resource === 'control') {
      resources = { ...resources, control: Math.max(resources.control, 99) };
    }
    if (eff.type === 'virtual_boost' && eff.resource === 'position') {
      resources = { ...resources, position: resources.position + 1 };
    }
  }
  return getAvailableMoves(resources);
}
