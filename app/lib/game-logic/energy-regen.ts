/**
 * Lazy energy regeneration — no cron, no queues.
 * Every 3 hours, restore ceil(maxEnergy * 0.15).
 * Called on API reads/writes to catch up on missed ticks.
 */

const REGEN_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
const REGEN_PERCENT = 0.15;

export interface EnergyRegenInput {
  currentEnergy: number;
  maxEnergy: number;
  lastEnergyRegenAt: Date | null;
}

export interface EnergyRegenResult {
  /** Energy value after regen ticks applied */
  newEnergy: number;
  /** Updated timestamp (advanced by ticksApplied * interval, NOT set to now) */
  newLastEnergyRegenAt: Date;
  /** Number of ticks that were applied */
  ticksApplied: number;
  /** Amount restored per tick */
  tickAmount: number;
  /** ISO string for client countdown timer */
  nextEnergyRegenAt: string;
  /** Whether any DB update is needed */
  changed: boolean;
}

export function computeEnergyRegen(
  input: EnergyRegenInput,
  now: Date = new Date()
): EnergyRegenResult {
  const { currentEnergy, maxEnergy } = input;
  const tickAmount = Math.ceil(maxEnergy * REGEN_PERCENT);

  // If lastEnergyRegenAt is null, initialize to now with 0 ticks
  if (!input.lastEnergyRegenAt) {
    const nextRegenAt = new Date(now.getTime() + REGEN_INTERVAL_MS);
    return {
      newEnergy: currentEnergy,
      newLastEnergyRegenAt: now,
      ticksApplied: 0,
      tickAmount,
      nextEnergyRegenAt: nextRegenAt.toISOString(),
      changed: true, // need to persist the initialized timestamp
    };
  }

  const elapsedMs = now.getTime() - input.lastEnergyRegenAt.getTime();
  const ticksApplied = Math.floor(elapsedMs / REGEN_INTERVAL_MS);

  if (ticksApplied <= 0 || currentEnergy >= maxEnergy) {
    // No ticks to apply or already at max
    const nextRegenAt = new Date(input.lastEnergyRegenAt.getTime() + REGEN_INTERVAL_MS);
    return {
      newEnergy: currentEnergy,
      newLastEnergyRegenAt: input.lastEnergyRegenAt,
      ticksApplied: 0,
      tickAmount,
      nextEnergyRegenAt: nextRegenAt.toISOString(),
      changed: false,
    };
  }

  // Apply ticks, cap at maxEnergy
  const totalRegen = ticksApplied * tickAmount;
  const newEnergy = Math.min(maxEnergy, currentEnergy + totalRegen);

  // Advance timestamp by exact ticks (NOT set to now — preserves cadence)
  const newLastEnergyRegenAt = new Date(
    input.lastEnergyRegenAt.getTime() + ticksApplied * REGEN_INTERVAL_MS
  );

  const nextRegenAt = new Date(newLastEnergyRegenAt.getTime() + REGEN_INTERVAL_MS);

  return {
    newEnergy,
    newLastEnergyRegenAt,
    ticksApplied,
    tickAmount,
    nextEnergyRegenAt: nextRegenAt.toISOString(),
    changed: true,
  };
}
