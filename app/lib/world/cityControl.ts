/**
 * City Control Aggregation
 *
 * Computes city-level control percentages for each controllable faction
 * based on district control shares.
 */

import { controllableFactions } from '@/app/data/factions';
import type { DistrictStateWithMetadata, DistrictShares } from '@/app/lib/game-logic/district-state';

// ============================================================
// Types
// ============================================================

export interface FactionCityControl {
  factionId: string;
  factionName: string;
  factionShortName: string;
  totalPoints: number; // Sum of shares across all districts
  percent: number; // (totalPoints / maxPossiblePoints) * 100
}

export interface CityControlSummary {
  factions: FactionCityControl[];
  totalControlledPoints: number; // Sum of all faction shares
  uncontrolledPoints: number; // Sum of uncontrolled shares
  uncontrolledPercent: number;
  totalAllPoints: number; // Always districtCount * 100
}

// ============================================================
// Aggregation Logic
// ============================================================

/**
 * Compute city-level control for each controllable faction.
 *
 * Algorithm (share-based):
 * - For each district, sum up each faction's share
 * - Sum up uncontrolled shares separately
 * - Total possible points = districtCount * 100
 * - factionPercent = (factionTotal / totalAllPoints) * 100
 * - uncontrolledPercent = (uncontrolledTotal / totalAllPoints) * 100
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

  let uncontrolledPoints = 0;
  const totalAllPoints = districtStates.length * 100; // Each district contributes 100 total share points

  // Aggregate shares from each district
  for (const district of districtStates) {
    const shares = district.shares;
    if (!shares) {
      // Fallback for districts without shares (shouldn't happen after migration)
      continue;
    }

    // Add each faction's share
    for (const factionId of Object.keys(factionTotals)) {
      factionTotals[factionId] += shares[factionId] ?? 0;
    }

    // Add uncontrolled share
    uncontrolledPoints += shares['uncontrolled'] ?? 0;
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
      totalAllPoints > 0
        ? Math.round((totalPoints / totalAllPoints) * 100)
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

  // Calculate uncontrolled percent
  const uncontrolledPercent =
    totalAllPoints > 0
      ? Math.round((uncontrolledPoints / totalAllPoints) * 100)
      : 0;

  return {
    factions,
    totalControlledPoints,
    uncontrolledPoints,
    uncontrolledPercent,
    totalAllPoints,
  };
}
