/**
 * City Control Aggregation
 *
 * Computes city-level control percentages for each controllable faction
 * based on district control values.
 */

import { controllableFactions } from '@/app/data/factions';
import type { DistrictStateWithMetadata } from '@/app/lib/game-logic/district-state';

// ============================================================
// Types
// ============================================================

export interface FactionCityControl {
  factionId: string;
  factionName: string;
  factionShortName: string;
  totalPoints: number;
  percent: number;
}

export interface CityControlSummary {
  factions: FactionCityControl[];
  totalControlledPoints: number;
  contestedPoints: number;
  contestedPercent: number;
  totalAllPoints: number;
}

// ============================================================
// Aggregation Logic
// ============================================================

/**
 * Compute city-level control for each controllable faction.
 *
 * Algorithm:
 * - For each district with a controllingFactionId that matches a controllable faction:
 *   - Add controlValue to that faction's total
 * - For contested districts (controllingFactionId is null):
 *   - Track separately as "contested"
 * - Compute percentages:
 *   - factionPercent = (factionTotal / totalControlledPoints) * 100
 *   - contestedPercent = (contestedPoints / totalAllPoints) * 100
 *
 * @param districtStates - All district states for the current scope
 * @returns CityControlSummary with faction control data
 */
export function computeCityControl(
  districtStates: DistrictStateWithMetadata[]
): CityControlSummary {
  // Initialize totals for each controllable faction
  const factionTotals: Record<string, number> = {};
  for (const faction of controllableFactions) {
    factionTotals[faction.id] = 0;
  }

  let contestedPoints = 0;
  let totalAllPoints = 0;

  // Aggregate control values
  for (const district of districtStates) {
    totalAllPoints += district.controlValue;

    if (district.controllingFactionId === null) {
      // Contested district - not counted toward any faction
      contestedPoints += district.controlValue;
    } else if (factionTotals[district.controllingFactionId] !== undefined) {
      // Controlled by a controllable faction
      factionTotals[district.controllingFactionId] += district.controlValue;
    }
    // Districts controlled by non-controllable factions are ignored
  }

  // Calculate total controlled points (sum of all faction totals)
  const totalControlledPoints = Object.values(factionTotals).reduce(
    (sum, val) => sum + val,
    0
  );

  // Build faction results
  const factions: FactionCityControl[] = controllableFactions.map((faction) => {
    const totalPoints = factionTotals[faction.id];
    const percent =
      totalControlledPoints > 0
        ? Math.round((totalPoints / totalControlledPoints) * 100)
        : 0;

    return {
      factionId: faction.id,
      factionName: faction.name,
      factionShortName: faction.shortName,
      totalPoints,
      percent,
    };
  });

  // Sort by percent descending for display
  factions.sort((a, b) => b.percent - a.percent);

  // Calculate contested percent (relative to all points)
  const contestedPercent =
    totalAllPoints > 0
      ? Math.round((contestedPoints / totalAllPoints) * 100)
      : 0;

  return {
    factions,
    totalControlledPoints,
    contestedPoints,
    contestedPercent,
    totalAllPoints,
  };
}
