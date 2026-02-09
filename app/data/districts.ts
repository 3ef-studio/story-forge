/**
 * District definitions
 * Each district maps to a set of locationTypes used by actions and encounters.
 *
 * Backwards compatible enhancements:
 * - Adds optional district metadata for world-state systems (map/control/events)
 * - Existing code that relies on District fields will continue to work unchanged
 */

export type DistrictId = 'downtown' | 'industrial' | 'waterfront' | 'slums' | 'midtown';

/**
 * High-level district theme used by map UI, events, and control modifiers.
 * Optional to preserve backwards compatibility.
 */
export type DistrictType =
  | 'civic'        // government, media, finance
  | 'industrial'   // factories, warehouses
  | 'waterfront'   // docks, smuggling
  | 'residential'  // neighborhoods, parks
  | 'underclass';  // poverty, unrest, high volatility

export type District = {
  id: DistrictId;
  name: string;
  description: string;
  /** The primary locationType passed to encounter generation */
  locationType: string;
  /** All locationTypes considered "available" in this district */
  locationTypes: string[];
  icon: string;

  /**
   * Optional world-system metadata (safe to ignore by existing code)
   */
  type?: DistrictType;

  /**
   * Optional tags for quick filtering & event logic (e.g. "media", "government", "crime")
   */
  tags?: string[];

  /**
   * Optional adjacency graph (used for map display, spillover events, and "pressure")
   */
  adjacent?: DistrictId[];

  /**
   * Optional affinity weights by factionId.
   * String-keyed to avoid importing faction types and to stay drop-in.
   * Suggested use:
   * - higher values => easier for that faction to gain/hold control here
   */
  factionAffinities?: Record<string, number>;
};

export const districts: District[] = [
  {
    id: 'downtown',
    name: 'Downtown',
    description: 'The bustling city center with banks, offices, and busy streets.',
    locationType: 'downtown',
    locationTypes: [
      'city_streets', 'downtown', 'commercial_district', 'public_spaces',
      'banks', 'financial_district', 'news_studios', 'public_locations',
      'press_conferences', 'police_station',
    ],
    icon: '🏙️',

    // World-system metadata (optional)
    type: 'civic',
    tags: ['finance', 'media', 'government', 'police', 'high_visibility'],
    adjacent: ['midtown', 'industrial', 'waterfront'],
    factionAffinities: {
      // playable factions
      guardian_initiative: 0.25,
      vigilante_network: 0.10,
      syndicate: -0.05,
      nihilist_collective: -0.10,
      // non-playable pressure can be modeled elsewhere; kept here only if useful
      metro_police: 0.20,
      city_government: 0.20,
      media_corporations: 0.15,
      civilian_population: 0.10,
    },
  },
  {
    id: 'industrial',
    name: 'Industrial District',
    description: 'Abandoned warehouses and factories, perfect for shady dealings.',
    locationType: 'warehouses',
    locationTypes: [
      'warehouses', 'syndicate_territory', 'abandoned_warehouses',
      'training_grounds', 'remote_areas', 'underground',
      'hidden_markets', 'back_rooms',
    ],
    icon: '🏭',

    // World-system metadata (optional)
    type: 'industrial',
    tags: ['warehouses', 'contraband', 'sabotage', 'low_visibility'],
    adjacent: ['downtown', 'slums', 'waterfront'],
    factionAffinities: {
      syndicate: 0.25,
      vigilante_network: 0.05,
      guardian_initiative: -0.05,
      nihilist_collective: 0.10,
      black_market: 0.15,
      street_gangs: 0.10,
    },
  },
  {
    id: 'waterfront',
    name: 'Waterfront',
    description: 'The docks and harbor — smuggling routes and black market trade.',
    locationType: 'docks',
    locationTypes: [
      'docks', 'warehouses', 'hidden_markets', 'underground',
      'back_rooms', 'underground_venues', 'syndicate_territory',
    ],
    icon: '⚓',

    // World-system metadata (optional)
    type: 'waterfront',
    tags: ['smuggling', 'trade', 'docks', 'black_market', 'low_visibility'],
    adjacent: ['downtown', 'industrial', 'slums'],
    factionAffinities: {
      syndicate: 0.25,
      vigilante_network: 0.05,
      guardian_initiative: -0.05,
      nihilist_collective: 0.05,
      black_market: 0.25,
      street_gangs: 0.10,
    },
  },
  {
    id: 'slums',
    name: 'The Slums',
    description: 'Poor neighborhoods plagued by crime and desperation.',
    locationType: 'slums',
    locationTypes: [
      'slums', 'poor_neighborhoods', 'back_alleys', 'tenements',
      'commercial_areas', 'neighborhoods', 'small_businesses',
      'community_centers', 'hideouts', 'abandoned_areas',
    ],
    icon: '🏚️',

    // World-system metadata (optional)
    type: 'underclass',
    tags: ['poverty', 'crime', 'unrest', 'community', 'high_volatility'],
    adjacent: ['industrial', 'waterfront', 'midtown'],
    factionAffinities: {
      vigilante_network: 0.20,
      nihilist_collective: 0.20,
      syndicate: 0.10,
      guardian_initiative: 0.00,
      civilian_population: 0.20,
      street_gangs: 0.20,
    },
  },
  {
    id: 'midtown',
    name: 'Midtown',
    description: 'Residential areas with parks, gyms, and social spots.',
    locationType: 'neighborhoods',
    locationTypes: [
      'neighborhoods', 'gyms', 'training_facilities', 'outdoor_areas',
      'parks', 'quiet_locations', 'meditation_spaces',
      'meeting_places', 'bars', 'social_clubs', 'meetup_spots',
      'community_centers', 'libraries',
    ],
    icon: '🏘️',

    // World-system metadata (optional)
    type: 'residential',
    tags: ['residential', 'parks', 'community', 'moderate_visibility'],
    adjacent: ['downtown', 'slums'],
    factionAffinities: {
      guardian_initiative: 0.15,
      vigilante_network: 0.15,
      syndicate: 0.00,
      nihilist_collective: -0.05,
      civilian_population: 0.20,
      media_corporations: 0.05,
    },
  },
];

/** Location types that are available everywhere (rest, emergencies, etc.) */
const GLOBAL_LOCATION_TYPES = [
  'safehouses', 'home', 'hideouts', 'safe_locations',
  'disaster_sites', 'anywhere_in_crisis', 'anywhere',
  'hero_patrol_routes', 'guardian_hq_vicinity',
  'crime_scenes', 'stake_out_locations',
  'informant_locations', 'rooftops',
  'unexplored_districts',
  'databases', 'war_rooms',
];

export function getDistrictById(id: string): District | undefined {
  return districts.find((d) => d.id === id);
}

/**
 * Get the primary locationType string for a district (used in encounter generation)
 */
export function districtToLocationType(districtId: string): string {
  const district = getDistrictById(districtId);
  return district?.locationType ?? 'downtown';
}

/**
 * Check if an action is available in a given district.
 * An action is available if any of its locationTypes overlap with the district's
 * locationTypes or the global location types.
 */
export function isActionAvailableInDistrict(
  actionLocationTypes: string[],
  districtId: string
): boolean {
  const district = getDistrictById(districtId);
  if (!district) return true; // fallback: allow everything

  return actionLocationTypes.some(
    (loc) => district.locationTypes.includes(loc) || GLOBAL_LOCATION_TYPES.includes(loc)
  );
}

/**
 * Action IDs that are always available regardless of district
 * (rest, training that doesn't need a specific location, etc.)
 */
const GLOBAL_ACTION_IDS = ['rest_recover', 'meditation'];

/**
 * Categories that are always available regardless of district
 */
const GLOBAL_CATEGORIES = ['training'];

export function isActionGlobal(actionId: string, category: string): boolean {
  return GLOBAL_ACTION_IDS.includes(actionId) || GLOBAL_CATEGORIES.includes(category);
}

/**
 * Optional helper: get adjacent districts.
 * Safe for callers even if adjacency is not defined.
 */
export function getAdjacentDistrictIds(districtId: DistrictId): DistrictId[] {
  const district = districts.find((d) => d.id === districtId);
  return district?.adjacent ?? [];
}
