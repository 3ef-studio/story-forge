/**
 * City Update Generator
 * Deterministic, template-based city updates that add world texture
 * No AI calls - pure string templates
 */

import type { FactionStateLine } from './faction-state';
import { getFactionStateDescriptor } from './faction-state';

// City update type
export type CityUpdate = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

// Default interval for city updates (every N actions)
const DEFAULT_UPDATE_INTERVAL = 5;

/**
 * Determine if a city update should be emitted
 * Emits when actionCount % everyN === 0 (but not on 0)
 */
export function shouldEmitCityUpdate(
  actionCountSinceStart: number,
  everyN: number = DEFAULT_UPDATE_INTERVAL
): boolean {
  return actionCountSinceStart > 0 && actionCountSinceStart % everyN === 0;
}

type GenerateCityUpdateInput = {
  actionId: string;
  location?: string;
  factionStateLines: FactionStateLine[];
  outcome?: 'success' | 'partial' | 'failure';
};

/**
 * Generate a deterministic city update based on faction states
 */
export function generateCityUpdate(input: GenerateCityUpdateInput): CityUpdate {
  const { actionId, location, factionStateLines, outcome } = input;
  const createdAt = new Date().toISOString();
  const id = `city-update-${actionId}-${Date.now()}`;

  // Find most tense (negative rep) and most supportive (positive rep) factions
  const sortedByRep = [...factionStateLines].sort((a, b) => a.rep - b.rep);
  const tenseFaction = sortedByRep[0];
  const supportiveFaction = sortedByRep[sortedByRep.length - 1];

  const locationText = location ? ` in ${formatLocation(location)}` : '';

  // Determine which template to use based on faction states
  const body = generateBodyFromTemplate({
    tenseFaction,
    supportiveFaction,
    locationText,
    outcome,
  });

  return {
    id,
    title: 'City Update',
    body,
    createdAt,
  };
}

type TemplateInput = {
  tenseFaction: FactionStateLine | undefined;
  supportiveFaction: FactionStateLine | undefined;
  locationText: string;
  outcome?: 'success' | 'partial' | 'failure';
};

function generateBodyFromTemplate(input: TemplateInput): string {
  const { tenseFaction, supportiveFaction, locationText, outcome } = input;

  // Check for hostile/aggressive factions
  const hasHostileFaction =
    tenseFaction && (tenseFaction.state === 'hostile' || tenseFaction.state === 'aggressive');

  // Check for allied/cooperative factions
  const hasFriendlyFaction =
    supportiveFaction &&
    (supportiveFaction.state === 'allied' || supportiveFaction.state === 'cooperative');

  // Both hostile and friendly - city in tension
  if (
    hasHostileFaction &&
    hasFriendlyFaction &&
    tenseFaction.factionId !== supportiveFaction.factionId
  ) {
    return getMixedTensionTemplate(tenseFaction, supportiveFaction, locationText, outcome);
  }

  // Hostile faction dominates
  if (hasHostileFaction) {
    return getHostileDominantTemplate(tenseFaction, locationText, outcome);
  }

  // Friendly faction dominates
  if (hasFriendlyFaction) {
    return getFriendlyDominantTemplate(supportiveFaction, locationText, outcome);
  }

  // Neutral/wary - city watching
  return getNeutralTemplate(locationText, outcome);
}

function getMixedTensionTemplate(
  tenseFaction: FactionStateLine,
  supportiveFaction: FactionStateLine,
  locationText: string,
  outcome?: 'success' | 'partial' | 'failure'
): string {
  const templates = [
    `The city's balance is shifting${locationText}. ${tenseFaction.factionName} grows ${getFactionStateDescriptor(tenseFaction.state)} while ${supportiveFaction.factionName} watches with ${getFactionStateDescriptor(supportiveFaction.state)} interest.`,
    `Tensions rise${locationText} as ${tenseFaction.factionName} activity increases. Meanwhile, ${supportiveFaction.factionName} shows signs of increased ${getFactionStateDescriptor(supportiveFaction.state)} support.`,
  ];

  // Add outcome-specific flavor
  if (outcome === 'success') {
    return templates[0] + ' Your recent success has not gone unnoticed.';
  }
  if (outcome === 'failure') {
    return templates[1] + ' Word of your setback spreads through the streets.';
  }

  return templates[0];
}

function getHostileDominantTemplate(
  tenseFaction: FactionStateLine,
  locationText: string,
  outcome?: 'success' | 'partial' | 'failure'
): string {
  const base = `Reports of ${tenseFaction.factionName} activity are increasing${locationText}. They seem ${getFactionStateDescriptor(tenseFaction.state)} toward anyone who crosses their path.`;

  if (outcome === 'success') {
    return base + ' Your actions have drawn their attention.';
  }
  if (outcome === 'failure') {
    return base + ' They may see opportunity in your recent struggles.';
  }

  return base;
}

function getFriendlyDominantTemplate(
  supportiveFaction: FactionStateLine,
  locationText: string,
  outcome?: 'success' | 'partial' | 'failure'
): string {
  const base = `${supportiveFaction.factionName} influence is growing${locationText}. People are starting to expect results from those they support.`;

  if (outcome === 'success') {
    return base + ' Your success strengthens their position.';
  }
  if (outcome === 'failure') {
    return base + ' They hope you can recover from recent setbacks.';
  }

  return base;
}

function getNeutralTemplate(
  locationText: string,
  outcome?: 'success' | 'partial' | 'failure'
): string {
  const base = `The city remains watchful${locationText}. Factions hold their positions, waiting to see how events unfold.`;

  if (outcome === 'success') {
    return base + ' Your recent actions may shift the balance.';
  }
  if (outcome === 'failure') {
    return base + ' Uncertainty hangs in the air.';
  }

  return base;
}

/**
 * Format location ID into readable text
 */
function formatLocation(location: string): string {
  return location
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
