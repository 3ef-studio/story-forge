/**
 * Leverage System — earned from prep + focus, spent in conflict, decays over time.
 *
 * Leverage types map 1:1 to conflict resources: control, stability, position.
 * Max per type: 2. Max total: 3.
 * Spending: 1 per conflict turn, applies an effect that can overcap resources to 7.
 * Decay: 1 leverage point per 3 completed actions (stable priority: control→stability→position).
 */

import type { PrepSelection } from '@/app/lib/game-logic/combat/types';
import { getPowerById, type PowerCategory } from '@/app/data/powers';

// --- Types ---

export type LeverageType = 'control' | 'stability' | 'position';

export interface LeverageState {
  control: number;
  stability: number;
  position: number;
}

export type LeverageSpendEffect =
  | { type: 'boost_self'; resource: LeverageType }       // +1 self (can overcap to 7)
  | { type: 'drain_opponent'; resource: LeverageType }    // -1 opponent
  | { type: 'ignore_requirement'; resource: LeverageType } // ignore resource requirement this turn
  | { type: 'prevent_loss'; resource: LeverageType }       // prevent stability/position loss this turn
  | { type: 'virtual_boost'; resource: LeverageType };     // treat resource as +1 for requirement checks

export interface LeverageSpend {
  leverageType: LeverageType;
  effect: LeverageSpendEffect;
}

/** Available effects per leverage type */
export const LEVERAGE_EFFECTS: Record<LeverageType, LeverageSpendEffect[]> = {
  control: [
    { type: 'boost_self', resource: 'control' },
    { type: 'drain_opponent', resource: 'control' },
    { type: 'ignore_requirement', resource: 'control' },
  ],
  stability: [
    { type: 'boost_self', resource: 'stability' },
    { type: 'drain_opponent', resource: 'stability' },
    { type: 'prevent_loss', resource: 'stability' },
  ],
  position: [
    { type: 'boost_self', resource: 'position' },
    { type: 'drain_opponent', resource: 'position' },
    { type: 'virtual_boost', resource: 'position' },
  ],
};

export const LEVERAGE_EFFECT_LABELS: Record<LeverageSpendEffect['type'], string> = {
  boost_self: '+1 to self (overcap)',
  drain_opponent: '-1 to opponent',
  ignore_requirement: 'Ignore requirement',
  prevent_loss: 'Prevent loss this turn',
  virtual_boost: '+1 for requirements',
};

// --- Constants ---

const MAX_PER_TYPE = 2;
const MAX_TOTAL = 3;
const OVERCAP_MAX = 7;
const DECAY_INTERVAL = 3; // actions per decay tick

// --- Power → leverage type mapping ---

/**
 * Maps a power ID to a leverage type based on power mechanics and category.
 *
 * Priority: power mechanics startingResourceBonus > category mapping > default (position).
 */
const CATEGORY_TO_LEVERAGE: Record<PowerCategory, LeverageType> = {
  physical: 'stability',
  mental: 'control',
  energy: 'control',
  utility: 'position',
  defensive: 'stability',
};

export function powerToLeverageType(powerId: string): LeverageType {
  const power = getPowerById(powerId);
  if (!power) return 'position'; // default

  // Prefer mechanics hint
  if (power.mechanics?.startingResourceBonus) {
    return power.mechanics.startingResourceBonus.resource;
  }

  // Fall back to category
  return CATEGORY_TO_LEVERAGE[power.category] ?? 'position';
}

// --- Focus mode → leverage type mapping ---

type FocusMode = 'power' | 'awareness' | 'aggression' | 'defense';

const FOCUS_TO_LEVERAGE: Record<FocusMode, LeverageType> = {
  awareness: 'control',
  aggression: 'stability',
  defense: 'stability',
  power: 'position',
};

// --- Core functions ---

export function emptyLeverage(): LeverageState {
  return { control: 0, stability: 0, position: 0 };
}

function leverageTotal(s: LeverageState): number {
  return s.control + s.stability + s.position;
}

/** Clamp leverage to per-type max (2) and total max (3) */
export function clampLeverage(s: LeverageState): LeverageState {
  let result: LeverageState = {
    control: Math.max(0, Math.min(MAX_PER_TYPE, s.control)),
    stability: Math.max(0, Math.min(MAX_PER_TYPE, s.stability)),
    position: Math.max(0, Math.min(MAX_PER_TYPE, s.position)),
  };

  // Enforce total cap — trim from lowest priority (position→stability→control)
  while (leverageTotal(result) > MAX_TOTAL) {
    if (result.position > 0) { result.position--; continue; }
    if (result.stability > 0) { result.stability--; continue; }
    if (result.control > 0) { result.control--; continue; }
    break;
  }

  return result;
}

/** Add leverage of a given type, respecting caps */
export function addLeverage(state: LeverageState, type: LeverageType, amount: number = 1): LeverageState {
  return clampLeverage({
    ...state,
    [type]: state[type] + amount,
  });
}

/** Generate leverage from prep selection */
export function leverageFromPrep(prep: PrepSelection): { type: LeverageType; source: string } {
  switch (prep.type) {
    case 'momentum':
      return { type: 'stability', source: 'prep:momentum' };
    case 'intel':
      return { type: 'control', source: 'prep:intel' };
    case 'power':
      return { type: powerToLeverageType(prep.powerId), source: `prep:power:${prep.powerId}` };
  }
}

/** Generate leverage from focus result */
export function leverageFromFocus(
  focusMode: FocusMode,
  focusModifier: number,
  prepPowerId?: string,
): { type: LeverageType; source: string } | null {
  if (focusModifier <= 0) return null;

  if (focusMode === 'power' && prepPowerId) {
    // Derive from selected prep power if present
    return { type: powerToLeverageType(prepPowerId), source: `focus:power:${prepPowerId}` };
  }

  return { type: FOCUS_TO_LEVERAGE[focusMode], source: `focus:${focusMode}` };
}

// --- Spending ---

/** Spend leverage. Returns new leverage state (decremented) or null if insufficient. */
export function spendLeverage(state: LeverageState, type: LeverageType): LeverageState | null {
  if (state[type] <= 0) return null;
  return { ...state, [type]: state[type] - 1 };
}

/** Clamp a resource value with leverage overcap (max 7) */
export function clampResourceWithOvercap(value: number): number {
  return Math.max(0, Math.min(OVERCAP_MAX, value));
}

/** The absolute maximum resource value when leverage is involved */
export const LEVERAGE_OVERCAP_MAX = OVERCAP_MAX;

// --- Decay ---

/**
 * Apply decay after actionCounter increment.
 * Returns updated leverage and whether decay happened.
 *
 * Decay rule: remove 1 leverage from highest pool first,
 * stable priority: control → stability → position.
 */
export function applyDecay(
  leverage: LeverageState,
  actionCounter: number,
): { leverage: LeverageState; decayed: boolean; decayedType?: LeverageType } {
  if (actionCounter % DECAY_INTERVAL !== 0) {
    return { leverage, decayed: false };
  }

  if (leverageTotal(leverage) === 0) {
    return { leverage, decayed: false };
  }

  // Remove from highest pool first (priority: control→stability→position)
  const priority: LeverageType[] = ['control', 'stability', 'position'];
  let maxType = priority[0];
  for (const t of priority) {
    if (leverage[t] > leverage[maxType]) maxType = t;
  }

  // If all are equal, use the priority order (first non-zero)
  if (leverage[maxType] === 0) return { leverage, decayed: false };

  const updated = { ...leverage, [maxType]: leverage[maxType] - 1 };
  return { leverage: updated, decayed: true, decayedType: maxType };
}

// --- Dev logging ---

export function logLeverageGrant(type: LeverageType, source: string, newState: LeverageState): void {
  if (process.env.NODE_ENV !== 'development') return;
  console.log(`[Leverage] Granted +1 ${type} from ${source}. State:`, newState);
}

export function logLeverageSpend(type: LeverageType, effect: LeverageSpendEffect, newState: LeverageState): void {
  if (process.env.NODE_ENV !== 'development') return;
  console.log(`[Leverage] Spent 1 ${type} → ${effect.type}. State:`, newState);
}

export function logLeverageDecay(type: LeverageType, actionCounter: number, newState: LeverageState): void {
  if (process.env.NODE_ENV !== 'development') return;
  console.log(`[Leverage] Decay at action #${actionCounter}: -1 ${type}. State:`, newState);
}

export function logActionCounterIncrement(counter: number): void {
  if (process.env.NODE_ENV !== 'development') return;
  console.log(`[Leverage] Action counter incremented to ${counter}`);
}
