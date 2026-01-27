/**
 * District definitions
 * Each district maps to a set of locationTypes used by actions and encounters.
 */

export type DistrictId = 'downtown' | 'industrial' | 'waterfront' | 'slums' | 'midtown';

export type District = {
  id: DistrictId;
  name: string;
  description: string;
  /** The primary locationType passed to encounter generation */
  locationType: string;
  /** All locationTypes considered "available" in this district */
  locationTypes: string[];
  icon: string;
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
