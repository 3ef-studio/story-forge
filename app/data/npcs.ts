/**
 * NPC Data
 * Recurring characters that appear in encounters and city updates
 */

export type NPC = {
  id: string;
  name: string;
  alias?: string;
  description: string;
  role: string;
  factionId?: string;
  factionIds?: string[];
  locationTags: string[];
  tags: string[];
  baseDisposition: number;
  visualDescription: string;
  personality: string;
};

export const npcs: NPC[] = [
  // Metro Police
  {
    id: 'detective_chen',
    name: 'Detective Maria Chen',
    description: 'A seasoned detective with a reputation for fairness. She walks the line between following orders and doing what is right.',
    role: 'Metro Police Detective',
    factionId: 'metro_police',
    factionIds: ['metro_police'],
    locationTags: ['police_station', 'crime_scenes', 'downtown', 'commercial_district'],
    tags: ['law_enforcement', 'investigation', 'neutral_authority'],
    baseDisposition: 0,
    visualDescription: 'A sharp-eyed woman in a worn trenchcoat, badge clipped to her belt.',
    personality: 'Professional, observant, morally conflicted',
  },
  {
    id: 'sergeant_brooks',
    name: 'Sergeant Marcus Brooks',
    description: 'A by-the-book officer who believes supers are a threat to public order. He is not corrupt, just rigid.',
    role: 'Metro Police Sergeant',
    factionId: 'metro_police',
    factionIds: ['metro_police'],
    locationTags: ['police_station', 'city_streets', 'public_spaces'],
    tags: ['law_enforcement', 'anti_super', 'patrol'],
    baseDisposition: -20,
    visualDescription: 'A broad-shouldered man in tactical gear, hand never far from his weapon.',
    personality: 'Strict, suspicious, duty-bound',
  },
  // Syndicate
  {
    id: 'viper',
    name: 'Viper',
    alias: 'Unknown',
    description: 'A mid-level Syndicate enforcer known for efficiency and a code of honor among criminals.',
    role: 'Syndicate Enforcer',
    factionId: 'syndicate',
    factionIds: ['syndicate', 'black_market'],
    locationTags: ['docks', 'warehouses', 'syndicate_territory', 'back_alleys'],
    tags: ['criminal', 'enforcer', 'underworld'],
    baseDisposition: -10,
    visualDescription: 'A lean figure in a tailored dark suit, with a snake tattoo visible on their neck.',
    personality: 'Cold, professional, surprisingly honorable',
  },
  {
    id: 'duchess',
    name: 'The Duchess',
    alias: 'Sofia Marchetti',
    description: 'A Syndicate information broker who trades in secrets. She has connections everywhere.',
    role: 'Information Broker',
    factionId: 'syndicate',
    factionIds: ['syndicate', 'media_corporations'],
    locationTags: ['hidden_markets', 'bars', 'social_clubs', 'underground_venues'],
    tags: ['information', 'broker', 'connected', 'underworld'],
    baseDisposition: 0,
    visualDescription: 'An elegantly dressed woman with calculating eyes and an ever-present cigarette holder.',
    personality: 'Charming, manipulative, always deals fairly',
  },
  // Guardian Initiative
  {
    id: 'paladin',
    name: 'Paladin',
    alias: 'James Sterling',
    description: 'A founding member of the Guardian Initiative. Idealistic but increasingly jaded by politics.',
    role: 'Senior Guardian',
    factionId: 'guardian_initiative',
    factionIds: ['guardian_initiative'],
    locationTags: ['guardian_hq_vicinity', 'public_spaces', 'disaster_sites'],
    tags: ['hero', 'mentor', 'official_super'],
    baseDisposition: 10,
    visualDescription: 'A tall man in white and gold armor, cape billowing even without wind.',
    personality: 'Noble, weary, genuinely wants to help',
  },
  {
    id: 'techne',
    name: 'Techne',
    alias: 'Dr. Priya Sharma',
    description: 'The Guardian Initiatives chief technologist. More interested in gadgets than glory.',
    role: 'Guardian Tech Specialist',
    factionId: 'guardian_initiative',
    factionIds: ['guardian_initiative'],
    locationTags: ['training_grounds', 'libraries', 'guardian_hq_vicinity'],
    tags: ['hero', 'tech', 'support', 'official_super'],
    baseDisposition: 15,
    visualDescription: 'A young woman with augmented reality glasses and a utility belt full of gadgets.',
    personality: 'Curious, helpful, socially awkward',
  },
  // Vigilante Network
  {
    id: 'ghost',
    name: 'Ghost',
    description: 'A mysterious vigilante who operates in the shadows. No one knows their true identity.',
    role: 'Underground Vigilante',
    factionId: 'vigilante_network',
    factionIds: ['vigilante_network'],
    locationTags: ['rooftops', 'slums', 'back_alleys', 'abandoned_areas'],
    tags: ['vigilante', 'stealth', 'independent'],
    baseDisposition: 5,
    visualDescription: 'A hooded figure that seems to blend with shadows, face always obscured.',
    personality: 'Cryptic, justice-focused, lone wolf',
  },
  {
    id: 'switchblade',
    name: 'Switchblade',
    alias: 'Marco Reyes',
    description: 'A former gang member turned vigilante. Protects the neighborhoods the police ignore.',
    role: 'Street Vigilante',
    factionId: 'vigilante_network',
    factionIds: ['vigilante_network', 'street_gangs'],
    locationTags: ['slums', 'poor_neighborhoods', 'back_alleys', 'tenements'],
    tags: ['vigilante', 'street_level', 'community'],
    baseDisposition: 0,
    visualDescription: 'A scarred young man in a leather jacket, with knives strapped to his forearms.',
    personality: 'Hot-headed, protective, distrustful of authority',
  },
  // Civilian Population
  {
    id: 'rosa_santos',
    name: 'Rosa Santos',
    description: 'A community organizer who runs a shelter in the slums. The heart of the neighborhood.',
    role: 'Community Organizer',
    factionId: 'civilian_population',
    factionIds: ['civilian_population'],
    locationTags: ['slums', 'poor_neighborhoods', 'community_centers', 'tenements'],
    tags: ['civilian', 'community', 'aid'],
    baseDisposition: 10,
    visualDescription: 'A tired but warm middle-aged woman, always with a clipboard and kind smile.',
    personality: 'Compassionate, pragmatic, quietly fierce',
  },
  {
    id: 'eddie_park',
    name: 'Eddie Park',
    description: 'A street-smart kid who knows everything happening in the neighborhood.',
    role: 'Street Informant',
    factionId: 'civilian_population',
    factionIds: ['civilian_population', 'vigilante_network'],
    locationTags: ['city_streets', 'slums', 'commercial_district', 'public_spaces'],
    tags: ['civilian', 'informant', 'street_smart'],
    baseDisposition: 5,
    visualDescription: 'A quick-eyed teenager on a skateboard, headphones around neck.',
    personality: 'Clever, loyal to those who earn it, survivor',
  },
  // Black Market
  {
    id: 'tinker',
    name: 'Tinker',
    description: 'A black market tech dealer who can get anything for the right price.',
    role: 'Tech Dealer',
    factionId: 'black_market',
    factionIds: ['black_market'],
    locationTags: ['hidden_markets', 'underground', 'back_rooms', 'warehouses'],
    tags: ['dealer', 'tech', 'black_market'],
    baseDisposition: -5,
    visualDescription: 'A nervous-looking person surrounded by screens and gadgets, fingers always twitching.',
    personality: 'Paranoid, brilliant, purely transactional',
  },
  // Street Gangs
  {
    id: 'king_cobra',
    name: 'King Cobra',
    alias: 'Damon Webb',
    description: 'Leader of the Westside Cobras. Violent but has his own code.',
    role: 'Gang Leader',
    factionId: 'street_gangs',
    factionIds: ['street_gangs'],
    locationTags: ['slums', 'back_alleys', 'poor_neighborhoods', 'underground_venues'],
    tags: ['gang', 'leader', 'territorial'],
    baseDisposition: -15,
    visualDescription: 'A muscular man with cobra tattoos, gold chains, and cold eyes.',
    personality: 'Territorial, pragmatic, respects strength',
  },
  // Media
  {
    id: 'vera_cross',
    name: 'Vera Cross',
    description: 'An ambitious reporter who covers the super beat. Will do anything for a story.',
    role: 'Investigative Reporter',
    factionId: 'media_corporations',
    factionIds: ['media_corporations'],
    locationTags: ['news_studios', 'public_locations', 'press_conferences', 'anywhere'],
    tags: ['media', 'reporter', 'investigator'],
    baseDisposition: 0,
    visualDescription: 'A sharply dressed woman with a camera drone hovering nearby.',
    personality: 'Ambitious, persistent, morally flexible',
  },
  // City Government
  {
    id: 'councilman_hayes',
    name: 'Councilman Richard Hayes',
    description: 'A city councilman with genuine intentions but limited power against corruption.',
    role: 'City Councilman',
    factionId: 'city_government',
    factionIds: ['city_government'],
    locationTags: ['downtown', 'public_spaces', 'financial_district'],
    tags: ['politician', 'government', 'reform'],
    baseDisposition: 5,
    visualDescription: 'A middle-aged man in a rumpled suit, looking perpetually stressed.',
    personality: 'Well-meaning, frustrated, trying to make a difference',
  },
];

export function getNPCById(id: string): NPC | undefined {
  return npcs.find((npc) => npc.id === id);
}

export function getNPCsByFaction(factionId: string): NPC[] {
  return npcs.filter(
    (npc) => npc.factionId === factionId || npc.factionIds?.includes(factionId)
  );
}

export function getNPCsByLocation(locationTag: string): NPC[] {
  return npcs.filter((npc) => npc.locationTags.includes(locationTag));
}

export function getNPCsByTags(tags: string[]): NPC[] {
  return npcs.filter((npc) =>
    npc.tags.some((tag) => tags.includes(tag))
  );
}
