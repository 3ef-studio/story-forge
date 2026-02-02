import type {
  EncounterType,
  EncounterContext,
  PlayerBuildSnapshot,
  BonusBreakdown,
  BonusBreakdownEntry,
  ConflictResources,
  MoveId,
} from './types';
import { attributes, getAttributeModifier } from '@/app/data/attributes';
import { getPowerById } from '@/app/data/powers';

// --- Category → EncounterType lookup ---

const CATEGORY_TO_ENCOUNTER_TYPE: Record<string, EncounterType> = {
  combat: 'combat',
  fight: 'combat',
  battle: 'combat',
  social: 'social',
  negotiation: 'social',
  diplomacy: 'social',
  stealth: 'stealth',
  infiltration: 'stealth',
  investigation: 'investigation',
  mystery: 'investigation',
  detective: 'investigation',
};

export function deriveEncounterContext(
  category: string,
  difficulty: number,
  tags: string[],
): EncounterContext {
  const type: EncounterType =
    CATEGORY_TO_ENCOUNTER_TYPE[category.toLowerCase()] ?? 'combat';

  let difficultyTier: 'low' | 'medium' | 'high';
  if (difficulty <= 3) difficultyTier = 'low';
  else if (difficulty <= 7) difficultyTier = 'medium';
  else difficultyTier = 'high';

  const stakes = difficultyTier; // stakes mirror difficulty tier

  return { type, difficultyTier, tags, stakes };
}

// --- Starting bonuses ---

const RESOURCE_KEYS: (keyof ConflictResources)[] = ['control', 'stability', 'position'];

function emptyBreakdown(): BonusBreakdown {
  return { entries: [], finalBonus: {} };
}

function capBonusPerResource(entries: BonusBreakdownEntry[], cap: number): BonusBreakdown {
  const totals: Record<string, number> = {};
  for (const e of entries) {
    totals[e.resource] = (totals[e.resource] ?? 0) + e.delta;
  }

  const finalBonus: Partial<ConflictResources> = {};
  for (const key of RESOURCE_KEYS) {
    const raw = totals[key] ?? 0;
    if (raw === 0) continue;
    const sign = raw > 0 ? 1 : -1;
    finalBonus[key] = sign * Math.min(Math.abs(raw), cap);
  }

  return { entries, finalBonus };
}

export function computeStartingBonuses(
  build: PlayerBuildSnapshot,
  ctx: EncounterContext,
): BonusBreakdown {
  const entries: BonusBreakdownEntry[] = [];

  // Attributes
  for (const attr of attributes) {
    const value = build.attributes[attr.id];
    if (value === undefined) continue;
    if (getAttributeModifier(value) < 1) continue; // need 61+

    const mech = attr.mechanics;
    if (!mech) continue;
    if (!mech.encounterTypeAffinity.includes(ctx.type)) continue;
    if (!mech.startingResourceBonus) continue;

    entries.push({
      source: `attr:${attr.id}`,
      resource: mech.startingResourceBonus.resource,
      delta: mech.startingResourceBonus.delta,
      reason: `${attr.name} modifier (${getAttributeModifier(value)}) in ${ctx.type}`,
    });
  }

  // Powers
  for (const pp of build.powers) {
    if (pp.level < 4) continue; // tier gate

    const power = getPowerById(pp.powerId);
    if (!power?.mechanics) continue;
    if (!power.mechanics.encounterTypeAffinity.includes(ctx.type)) continue;
    if (!power.mechanics.startingResourceBonus) continue;

    entries.push({
      source: `power:${pp.powerId}`,
      resource: power.mechanics.startingResourceBonus.resource,
      delta: power.mechanics.startingResourceBonus.delta,
      reason: `${power.name} lv${pp.level} in ${ctx.type}`,
    });
  }

  return capBonusPerResource(entries, 2);
}

// --- Move bonuses ---

export function computeMoveBonus(
  moveId: MoveId,
  build: PlayerBuildSnapshot,
  ctx: EncounterContext,
): BonusBreakdown {
  const entries: BonusBreakdownEntry[] = [];

  // Attributes
  for (const attr of attributes) {
    const value = build.attributes[attr.id];
    if (value === undefined) continue;
    if (getAttributeModifier(value) < 1) continue;

    const mech = attr.mechanics;
    if (!mech?.moveBonus) continue;
    if (mech.moveBonus.move !== moveId) continue;
    if (!mech.encounterTypeAffinity.includes(ctx.type)) continue;

    entries.push({
      source: `attr:${attr.id}`,
      resource: mech.moveBonus.resource,
      delta: mech.moveBonus.delta,
      reason: `${attr.name} ${mech.moveBonus.target === 'self' ? 'self' : 'opp'} bonus on ${moveId}`,
    });
  }

  // Powers
  for (const pp of build.powers) {
    if (pp.level < 4) continue;

    const power = getPowerById(pp.powerId);
    if (!power?.mechanics?.moveBonus) continue;
    if (power.mechanics.moveBonus.move !== moveId) continue;
    if (!power.mechanics.encounterTypeAffinity.includes(ctx.type)) continue;

    entries.push({
      source: `power:${pp.powerId}`,
      resource: power.mechanics.moveBonus.resource,
      delta: power.mechanics.moveBonus.delta,
      reason: `${power.name} ${power.mechanics.moveBonus.target === 'self' ? 'self' : 'opp'} bonus on ${moveId}`,
    });
  }

  return capBonusPerResource(entries, 2);
}

// --- Dev logging ---

export function logBonusBreakdown(label: string, breakdown: BonusBreakdown): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (breakdown.entries.length === 0) return;

  console.group(`[Build Bonus] ${label}`);
  for (const e of breakdown.entries) {
    const sign = e.delta > 0 ? '+' : '';
    console.log(`  ${e.source}: ${e.resource} ${sign}${e.delta} — ${e.reason}`);
  }
  console.log('  Final:', breakdown.finalBonus);
  console.groupEnd();
}
