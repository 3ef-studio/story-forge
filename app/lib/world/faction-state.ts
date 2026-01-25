/**
 * Faction State Utilities
 * Pure functions for computing faction states from reputation values
 */

import { getFactionById } from '@/app/data/factions';

// Faction state derived from reputation
export type FactionState = 'hostile' | 'aggressive' | 'wary' | 'cooperative' | 'allied';

// Faction state line for summaries
export type FactionStateLine = {
  factionId: string;
  factionName: string;
  rep: number;
  state: FactionState;
};

/**
 * Convert reputation value to faction state
 * hostile: <= -60
 * aggressive: -59 to -20
 * wary: -19 to 19
 * cooperative: 20 to 59
 * allied: >= 60
 */
export function getFactionState(rep: number): FactionState {
  if (rep <= -60) return 'hostile';
  if (rep <= -20) return 'aggressive';
  if (rep <= 19) return 'wary';
  if (rep <= 59) return 'cooperative';
  return 'allied';
}

/**
 * Get display label for faction state (title case)
 */
export function getFactionStateLabel(state: FactionState): string {
  const labels: Record<FactionState, string> = {
    hostile: 'Hostile',
    aggressive: 'Aggressive',
    wary: 'Wary',
    cooperative: 'Cooperative',
    allied: 'Allied',
  };
  return labels[state];
}

/**
 * Get short descriptor for faction state (used in prompts/narrative)
 */
export function getFactionStateDescriptor(state: FactionState): string {
  const descriptors: Record<FactionState, string> = {
    hostile: 'openly hostile',
    aggressive: 'aggressive',
    wary: 'wary',
    cooperative: 'cooperative',
    allied: 'allied',
  };
  return descriptors[state];
}

/**
 * Get color class for faction state (for UI)
 */
export function getFactionStateColor(state: FactionState): string {
  const colors: Record<FactionState, string> = {
    hostile: 'text-red-600',
    aggressive: 'text-orange-500',
    wary: 'text-gray-500',
    cooperative: 'text-blue-500',
    allied: 'text-green-600',
  };
  return colors[state];
}

type BuildFactionStateSummaryOptions = {
  topN?: number;
  includeFactions?: string[];
};

/**
 * Build a summary of faction states
 * If includeFactions is provided, prefer those factions
 * Otherwise, select topN factions by absolute reputation
 * Returns stable ordering: descending abs(rep), tie-break by factionId
 */
export function buildFactionStateSummary(
  repByFaction: Record<string, number>,
  opts?: BuildFactionStateSummaryOptions
): FactionStateLine[] {
  const { topN = 3, includeFactions } = opts ?? {};

  // Get faction IDs to include
  let factionIds: string[];

  if (includeFactions && includeFactions.length > 0) {
    // Use specified factions, but only if they exist in repByFaction
    factionIds = includeFactions.filter((id) => repByFaction[id] !== undefined);
    // If none exist, fall back to topN
    if (factionIds.length === 0) {
      factionIds = Object.keys(repByFaction);
    }
  } else {
    factionIds = Object.keys(repByFaction);
  }

  // Build lines with faction data
  const lines: FactionStateLine[] = factionIds.map((factionId) => {
    const rep = repByFaction[factionId] ?? 0;
    const faction = getFactionById(factionId);
    return {
      factionId,
      factionName: faction?.shortName ?? faction?.name ?? factionId,
      rep,
      state: getFactionState(rep),
    };
  });

  // Sort by absolute reputation (descending), then by factionId for stability
  lines.sort((a, b) => {
    const absA = Math.abs(a.rep);
    const absB = Math.abs(b.rep);
    if (absB !== absA) return absB - absA;
    return a.factionId.localeCompare(b.factionId);
  });

  // Return top N
  return lines.slice(0, topN);
}

/**
 * Format faction state summary as readable text
 * Example: "Syndicate: Aggressive (-35)"
 */
export function formatFactionStateSummary(lines: FactionStateLine[]): string {
  return lines
    .map((line) => {
      const sign = line.rep >= 0 ? '+' : '';
      return `${line.factionName}: ${getFactionStateLabel(line.state)} (${sign}${line.rep})`;
    })
    .join('\n');
}

/**
 * Generate a narrative line describing faction attitudes
 * Used for encounter texture
 */
export function generateFactionTextureLine(lines: FactionStateLine[]): string {
  if (lines.length === 0) return '';

  // Find most hostile and most friendly
  const sortedByRep = [...lines].sort((a, b) => a.rep - b.rep);
  const mostHostile = sortedByRep[0];
  const mostFriendly = sortedByRep[sortedByRep.length - 1];

  // Generate based on extremes
  const hostileStates: FactionState[] = ['hostile', 'aggressive'];
  const friendlyStates: FactionState[] = ['cooperative', 'allied'];

  const hasHostile = hostileStates.includes(mostHostile.state);
  const hasFriendly = friendlyStates.includes(mostFriendly.state);

  if (hasHostile && hasFriendly && mostHostile.factionId !== mostFriendly.factionId) {
    return `${mostHostile.factionName} eyes you with ${getFactionStateDescriptor(mostHostile.state)} intent; ${mostFriendly.factionName} seems ${getFactionStateDescriptor(mostFriendly.state)}.`;
  }

  if (hasHostile) {
    return `${mostHostile.factionName} regards you with ${getFactionStateDescriptor(mostHostile.state)} suspicion.`;
  }

  if (hasFriendly) {
    return `${mostFriendly.factionName} shows ${getFactionStateDescriptor(mostFriendly.state)} interest in your actions.`;
  }

  // All wary - neutral texture
  return 'The factions watch and wait, uncertain of your allegiances.';
}
