/**
 * Static data tables for rival generation.
 * All deterministic — no AI calls.
 */

export type RivalRole = 'hero' | 'villain';
export type RivalPersonality = 'brute' | 'tactician' | 'zealot' | 'sadist' | 'hunter';

export const RIVAL_PERSONALITIES: readonly RivalPersonality[] = [
  'brute',
  'tactician',
  'zealot',
  'sadist',
  'hunter',
] as const;

export const PERSONALITY_LABELS: Record<RivalPersonality, string> = {
  brute: 'Brute',
  tactician: 'Tactician',
  zealot: 'Zealot',
  sadist: 'Sadist',
  hunter: 'Hunter',
};

export const PERSONALITY_DESCRIPTIONS: Record<RivalPersonality, string> = {
  brute: 'Relies on overwhelming force. Predictable but devastating.',
  tactician: 'Plans three moves ahead. Patient and calculating.',
  zealot: 'Driven by ideology. Fanatical and relentless.',
  sadist: 'Enjoys suffering. Cruel and unpredictable.',
  hunter: 'Tracks targets methodically. Patient and precise.',
};

export const heroNames: readonly string[] = [
  'Sentinel',
  'Vanguard',
  'Aegis',
  'Justicar',
  'Paladin',
  'Beacon',
  'Bastion',
  'Warden',
  'Valor',
  'Guardian',
  'Paragon',
  'Stalwart',
  'Radiant',
  'Ironclad',
  'Exemplar',
];

export const villainNames: readonly string[] = [
  'Night Reign',
  'Malice',
  'Dread Sovereign',
  'Eclipse',
  'Havoc',
  'Blight',
  'Venom Lord',
  'Shade',
  'Tyrant',
  'Scourge',
  'Oblivion',
  'Ruin',
  'Phantom Blade',
  'Rictus',
  'Nemesis',
];

export const nameSuffixes: readonly string[] = [
  'Prime',
  'MK-II',
  'The Second',
  'Zero',
  'Redux',
  'Omega',
];

/** Probability of appending a suffix to the rival name */
export const SUFFIX_PROBABILITY = 0.15;

/**
 * Power counter mappings.
 * If the player has the key power, the rival gets the value power as a "counter".
 * Bidirectional where it makes sense.
 */
export const POWER_COUNTERS: Record<string, string> = {
  telepathy: 'invisibility',
  invisibility: 'telepathy',
  super_strength: 'force_field',
  force_field: 'super_strength',
  energy_blast: 'enhanced_durability',
  enhanced_durability: 'energy_blast',
  super_speed: 'precognition',
  precognition: 'super_speed',
  fire_generation: 'force_field',
  electricity_manipulation: 'enhanced_durability',
  flight: 'telekinesis',
  telekinesis: 'flight',
  healing: 'energy_blast',
  shapeshifting: 'telepathy',
  wall_crawling: 'super_speed',
  mind_control: 'telepathy',
  time_dilation: 'precognition',
  titan_strength: 'force_field',
};

/** Rival encounter intensity levels */
export type RivalIntensity = 'watching' | 'agents' | 'direct';

/** Flavor text templates for rival encounter injection */
export const RIVAL_FLAVOR: Record<RivalIntensity, readonly string[]> = {
  watching: [
    'You catch a glimpse of {name} observing from a rooftop.',
    'A security camera swivels toward you — {name}\'s handiwork.',
    'You find a calling card left by {name}.',
    'Someone whispers that {name} has been asking about you.',
  ],
  agents: [
    'Agents loyal to {name} block your path.',
    'You recognize {name}\'s operatives among the crowd.',
    'A trap bears {name}\'s signature methodology.',
  ],
  direct: [
    '{name} steps out of the shadows, eyes locked on you.',
    '{name} lands in front of you. "We need to talk."',
    'The air crackles as {name} makes their presence known.',
  ],
};

/** Faction IDs classified as "lawful/good" for role determination */
export const LAWFUL_FACTION_IDS = [
  'metro_police',
  'guardian_initiative',
  'civilian_population',
  'city_government',
] as const;

/** Faction IDs classified as "criminal/evil" for role determination */
export const CRIMINAL_FACTION_IDS = [
  'syndicate',
  'black_market',
  'nihilist_collective',
  'street_gangs',
] as const;
