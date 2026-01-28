/**
 * City Update Generator
 * Deterministic, template-based city updates that add world texture
 * No AI calls - pure string templates (PLAIN TEXT ONLY)
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
 * Generate a deterministic city update based on faction states.
 * Output is plain text only (no markdown).
 */
export function generateCityUpdate(input: GenerateCityUpdateInput): CityUpdate {
  const { actionId, location, factionStateLines, outcome } = input;

  const createdAt = new Date().toISOString();
  const id = `city-update-${actionId}-${Date.now()}`;

  const locationText = location ? formatLocation(location) : 'the city';

  // Guard: if no faction state lines, return a neutral update.
  if (!factionStateLines?.length) {
    const neutral = neutralUpdate(locationText, outcome, id);
    return {
      id,
      title: neutral.title,
      body: neutral.body,
      createdAt,
    };
  }

  // Find most tense (lowest rep) and most supportive (highest rep)
  const sortedByRep = [...factionStateLines].sort((a, b) => a.rep - b.rep);
  const tenseFaction = sortedByRep[0];
  const supportiveFaction = sortedByRep[sortedByRep.length - 1];

  const update = generateFromTemplate({
    tenseFaction,
    supportiveFaction,
    locationText,
    outcome,
    salt: id,
  });

  return {
    id,
    title: update.title,
    body: update.body,
    createdAt,
  };
}

type TemplateInput = {
  tenseFaction: FactionStateLine;
  supportiveFaction: FactionStateLine;
  locationText: string;
  outcome?: 'success' | 'partial' | 'failure';
  salt: string; // used for deterministic template selection
};

type TemplateOutput = {
  title: string;
  body: string;
};

function generateFromTemplate(input: TemplateInput): TemplateOutput {
  const { tenseFaction, supportiveFaction, locationText, outcome, salt } = input;

  const tenseState = tenseFaction.state;
  const supportiveState = supportiveFaction.state;

  const tenseDesc = normalizeDescriptor(getFactionStateDescriptor(tenseState));
  const friendlyDesc = normalizeDescriptor(getFactionStateDescriptor(supportiveState));

  const hasHostile =
    tenseState === 'hostile' || tenseState === 'aggressive';

  const hasFriendly =
    supportiveState === 'allied' || supportiveState === 'cooperative';

  const isMixed =
    hasHostile &&
    hasFriendly &&
    tenseFaction.factionId !== supportiveFaction.factionId;

  if (isMixed) {
    return mixedTensionUpdate(tenseFaction, supportiveFaction, tenseDesc, friendlyDesc, locationText, outcome, salt);
  }

  if (hasHostile) {
    return hostileDominantUpdate(tenseFaction, tenseDesc, locationText, outcome, salt);
  }

  if (hasFriendly) {
    return friendlyDominantUpdate(supportiveFaction, friendlyDesc, locationText, outcome, salt);
  }

  return neutralUpdate(locationText, outcome, salt);
}

/** ---------- Templates ---------- */

function mixedTensionUpdate(
  tenseFaction: FactionStateLine,
  supportiveFaction: FactionStateLine,
  tenseDesc: string,
  friendlyDesc: string,
  locationText: string,
  outcome: 'success' | 'partial' | 'failure' | undefined,
  salt: string
): TemplateOutput {
  const tenseName = tenseFaction.factionName;
  const friendlyName = supportiveFaction.factionName;

  const headlineOptions = [
    `The streets are choosing sides: ${tenseName} tightens its grip as ${friendlyName} ${gainVerb(friendlyName)} ground`,
    `Power shifts in ${locationText}: ${tenseName} escalates while ${friendlyName} rallies`,
    `${locationText} on edge: ${tenseName} presses harder, ${friendlyName} pushes back`,
  ];

  const ledeOptions = [
    `Reports from ${locationText} point to a widening gap between factions.`,
    `Eyewitnesses across ${locationText} describe a city tilting, not breaking—yet.`,
    `In ${locationText}, the usual lines are blurring and the consequences are arriving fast.`,
  ];

  const tenseLineOptions = [
    `On one end, ${tenseName} has turned ${tenseDesc}, with sightings, whispers, and sudden "taxes" showing up where none existed a week ago.`,
    `${tenseName} is behaving ${tenseDesc}—more patrols, tighter control, and fewer warnings before things get ugly.`,
    `${tenseName} feels ${tenseDesc} right now: doors close quicker, voices drop lower, and the wrong look becomes a problem.`,
  ];

  const friendlyLineOptions = [
    `On the other, ${friendlyName} shows ${friendlyDesc} intent—more coordination, more confidence, and more people willing to say the name out loud.`,
    `${friendlyName} is moving with ${friendlyDesc} purpose: small networks forming, help appearing at the right moments, and a sense that someone is paying attention.`,
    `${friendlyName} carries ${friendlyDesc} momentum—quiet at first, then suddenly everywhere, like the city decided to remember.`,
  ];

  const consequenceLine = outcomeLine(outcome, {
    success: `Your recent win is already circulating. People connect patterns faster than you think.`,
    partial: `Your last move left questions behind. The city hates unanswered questions.`,
    failure: `Word of your setback spreads. Opportunists love a wobble.`,
  });

  const quoteOptions = [
    `"You can feel it," a shop owner mutters, eyes fixed on the street. "Like the city’s holding its breath."`,
    `"It’s not the noise that scares me," a dockworker says. "It’s how organized it’s getting."`,
    `"Everyone’s acting brave," a commuter whispers. "But nobody’s walking alone anymore."`,
  ];

  const title = pick(headlineOptions, salt);
  const body = [
    pick(ledeOptions, salt + ':lede'),
    pick(tenseLineOptions, salt + ':tense'),
    pick(friendlyLineOptions, salt + ':friendly'),
    consequenceLine,
    pick(quoteOptions, salt + ':quote'),
  ].filter(Boolean).join('\n\n');

  return { title, body };
}

function hostileDominantUpdate(
  tenseFaction: FactionStateLine,
  tenseDesc: string,
  locationText: string,
  outcome: 'success' | 'partial' | 'failure' | undefined,
  salt: string
): TemplateOutput {
  const name = tenseFaction.factionName;

  const headlineOptions = [
    `${name} surges in ${locationText}: the pressure is rising`,
    `Crackdown in ${locationText}: ${name} moves with purpose`,
    `${locationText} rattled: ${name} steps out of the shadows`,
  ];

  const ledeOptions = [
    `The latest reports from ${locationText} read like a warning, not a summary.`,
    `People in ${locationText} are adjusting routines—earlier commutes, locked doors, fewer questions.`,
    `The mood in ${locationText} has shifted. Not panic. Preparation.`,
  ];

  const coreOptions = [
    `${name} appears ${tenseDesc} toward anyone crossing their path. Sightings are up, and so are "rules" that no one voted on.`,
    `${name} is acting ${tenseDesc}. The kind of posture that dares the city to respond.`,
    `${name} feels ${tenseDesc} right now—more boldness, less restraint, and a sense that they expect resistance.`,
  ];

  const consequenceLine = outcomeLine(outcome, {
    success: `Your last success drew attention. The wrong kind and the right kind.`,
    partial: `Your last result didn’t settle anything. It just changed who thinks they can try.`,
    failure: `Your recent stumble is being interpreted as weakness. They rarely misinterpret weakness.`,
  });

  const quoteOptions = [
    `"They weren’t this open last month," a resident says. "Now they act like they own daylight."`,
    `"It’s like the rules changed overnight," a local cop admits. "And nobody told us."`,
    `"I don’t care who you are," an exhausted clerk says. "Just don’t let it get worse."`,
  ];

  const title = pick(headlineOptions, salt);
  const body = [
    pick(ledeOptions, salt + ':lede'),
    pick(coreOptions, salt + ':core'),
    consequenceLine,
    pick(quoteOptions, salt + ':quote'),
  ].filter(Boolean).join('\n\n');

  return { title, body };
}

function friendlyDominantUpdate(
  supportiveFaction: FactionStateLine,
  friendlyDesc: string,
  locationText: string,
  outcome: 'success' | 'partial' | 'failure' | undefined,
  salt: string
): TemplateOutput {
  const name = supportiveFaction.factionName;

  const headlineOptions = [
    `${name} rises in ${locationText}: hope with sharp edges`,
    `Momentum in ${locationText}: ${name} gains influence`,
    `${locationText} steadies: ${name} shows up where it counts`,
  ];

  const ledeOptions = [
    `Something is changing in ${locationText}. Not loudly—effectively.`,
    `In ${locationText}, people are starting to believe the city can be pushed back in the right direction.`,
    `The most interesting thing about ${locationText} right now is how quickly attitudes are turning.`,
  ];

  const coreOptions = [
    `${name} is moving with ${friendlyDesc} intent. More coordination, fewer empty gestures, and a growing sense that support comes with expectations.`,
    `${name} feels ${friendlyDesc}. It’s not charity—it's influence, traded in small favors and quiet loyalties.`,
    `${name} carries ${friendlyDesc} pressure. People want results, and they’re starting to believe they can demand them.`,
  ];

  const consequenceLine = outcomeLine(outcome, {
    success: `Your recent win strengthens that belief—and raises the bar for what you’re supposed to do next.`,
    partial: `Your last result didn’t land clean, but it still nudged the city’s mood.`,
    failure: `Your setback disappoints, but it doesn’t erase momentum. Not yet.`,
  });

  const quoteOptions = [
    `"For the first time in a while, I don’t feel alone out there," someone says, almost surprised.`,
    `"Hope is dangerous," a community organizer warns. "But so is giving up."`,
    `"People are watching you now," a neighbor says. "Not to judge. To decide."`,
  ];

  const title = pick(headlineOptions, salt);
  const body = [
    pick(ledeOptions, salt + ':lede'),
    pick(coreOptions, salt + ':core'),
    consequenceLine,
    pick(quoteOptions, salt + ':quote'),
  ].filter(Boolean).join('\n\n');

  return { title, body };
}

function neutralUpdate(
  locationText: string,
  outcome: 'success' | 'partial' | 'failure' | undefined,
  salt: string
): TemplateOutput {
  const headlineOptions = [
    `${locationText}: quiet streets, loud undercurrents`,
    `${locationText} watches and waits`,
    `No one relaxes in ${locationText}—not yet`,
  ];

  const ledeOptions = [
    `The city isn’t calm. It’s observant.`,
    `Nothing exploded today. That doesn’t mean nothing changed.`,
    `In ${locationText}, people measure days by what didn’t happen.`,
  ];

  const coreOptions = [
    `Factions hold their positions, watching for the next excuse to move. The air feels staged, like everyone is waiting for someone else to blink.`,
    `The balance holds for now, but only because everyone is counting costs. And costs have been changing.`,
    `Everyone is waiting for a signal—good, bad, doesn’t matter. Just something that breaks the pattern.`,
  ];

  const consequenceLine = outcomeLine(outcome, {
    success: `Your recent success adds weight to the rumors. Some will interpret it as a promise. Others as a threat.`,
    partial: `Your last result leaves a messy outline. People fill outlines with stories.`,
    failure: `Your setback becomes gossip, then warning, then leverage—depending on who repeats it.`,
  });

  const quoteOptions = [
    `"Nothing’s happening," someone says. Then they lock the door twice.`,
    `"The city remembers everything," an old voice mutters. "Especially the almosts."`,
    `"I don’t want heroes," a passerby says. "I just want tomorrow to look normal."`,
  ];

  const title = pick(headlineOptions, salt);
  const body = [
    pick(ledeOptions, salt + ':lede'),
    pick(coreOptions, salt + ':core'),
    consequenceLine,
    pick(quoteOptions, salt + ':quote'),
  ].filter(Boolean).join('\n\n');

  return { title, body };
}

/** ---------- Helpers ---------- */

function outcomeLine(
  outcome: 'success' | 'partial' | 'failure' | undefined,
  lines: { success: string; partial: string; failure: string }
): string {
  if (!outcome) return `Either way, the city is taking notes.`;
  if (outcome === 'success') return lines.success;
  if (outcome === 'partial') return lines.partial;
  return lines.failure;
}

function normalizeDescriptor(desc: string): string {
  // prevent stacked adverbs like "distinctly openly hostile"
  // also remove trailing filler words if your descriptor function includes them
  return desc
    .replace(/^openly\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPluralName(name: string): boolean {
  return name.trim().toLowerCase().endsWith('s');
}

function gainVerb(name: string): string {
  return isPluralName(name) ? 'gain' : 'gains';
}

/**
 * Deterministic pick based on a string salt
 */
function pick<T>(arr: T[], salt: string): T {
  const idx = stableIndex(salt, arr.length);
  return arr[idx];
}

function stableIndex(seed: string, mod: number): number {
  let h = 2166136261; // FNV-1a-ish
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % Math.max(1, mod);
}

/**
 * Format location ID into readable text (e.g. "waterfront_docks" -> "Waterfront Docks")
 */
function formatLocation(location: string): string {
  return location
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
