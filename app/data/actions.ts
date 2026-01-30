// data/actions.ts

export type ActionCategory = 'heroic' | 'criminal' | 'neutral' | 'training' | 'social'

export type MoralIntent = 'heroic' | 'neutral' | 'villainous'

export type Action = {
  id: string
  name: string
  description: string
  category: ActionCategory
  moralIntent: MoralIntent

  // Requirements
  requiredPowers?: string[] // Must have at least one of these powers
  requiredAttributes?: { attributeId: string, minValue: number }[]
  minLevel?: number
  energyCost: number
  
  // Immediate effects (before encounter)
  factionImpacts: { factionId: string, reputationChange: number }[]
  attributeGrowthChance: { attributeId: string, chance: number }[] // 0-1 probability
  
  // Encounter generation parameters
  encounterChance: number // 0-1, probability something happens
  encounterTypes: string[] // Types of encounters this can trigger
  difficultyRange: [number, number] // [min, max] difficulty (1-10)
  
  // Faction involvement - which factions are likely to appear
  likelyFactions: string[] // Faction IDs that commonly appear in these encounters
  
  // AI context for narrative generation
  narrativeContext: string // Helps AI understand player intent and tone
  locationTypes: string[] // Where this action takes place
  
  // Rewards
  baseXPReward: number
  baseMoneyReward: number // If we add currency later

  // Cooldown (optional - prevents spam)
  cooldownHours?: number

  // HP restoration (optional - for healing actions)
  hpRestore?: number
}

// Legacy patrol action IDs that map to the consolidated "patrol" action
export const ACTION_ID_ALIASES: Record<string, string> = {
  patrol_downtown: 'patrol',
  patrol_slums: 'patrol',
}

/**
 * Normalize an actionId by resolving legacy aliases.
 * Use this before any getActionById / cooldown / goal lookup on the server.
 */
export function normalizeActionId(actionId: string): string {
  return ACTION_ID_ALIASES[actionId] ?? actionId
}

export const actions: Action[] = [
  // === HEROIC ACTIONS ===
  {
    id: 'patrol',
    name: 'Patrol Area',
    description: 'Maintain a visible presence and respond to everyday crime.',
    category: 'heroic',
    moralIntent: 'heroic',
    energyCost: 10,
    factionImpacts: [
      { factionId: 'metro_police', reputationChange: 1 },
      { factionId: 'civilian_population', reputationChange: 2 },
      { factionId: 'guardian_initiative', reputationChange: 1 },
      { factionId: 'vigilante_network', reputationChange: 1 }
    ],
    attributeGrowthChance: [
      { attributeId: 'perception', chance: 0.45 },
      { attributeId: 'endurance', chance: 0.25 },
      { attributeId: 'reputation', chance: 0.3 }
    ],
    encounterChance: 0.75,
    encounterTypes: [
      'crime_in_progress',
      'civilian_in_danger',
      'villain_sighting',
      'police_cooperation',
      'media_encounter',
      'gang_violence',
      'protection_racket',
      'villain_hideout',
      'desperate_civilians',
      'vigilante_encounter',
      'turf_war'
    ],
    difficultyRange: [2, 7],
    likelyFactions: ['metro_police', 'civilian_population', 'street_gangs', 'syndicate', 'vigilante_network'],
    narrativeContext: 'Player patrols the streets looking for trouble to stop, maintaining a visible heroic presence',
    locationTypes: [
      'city_streets', 'downtown', 'commercial_district', 'public_spaces','warehouses', 'syndicate_territory',
      'slums', 'poor_neighborhoods', 'back_alleys', 'tenements', 'industrial_areas', 'docks'
    ],
    baseXPReward: 25,
    baseMoneyReward: 0
  },

  {
    id: 'hunt_major_threats',
    name: 'Hunt Major Threats',
    description: 'Seek out dangerous superhuman criminals and high-level threats.',
    category: 'heroic',
    moralIntent: 'heroic',
    energyCost: 18,
    factionImpacts: [
      { factionId: 'metro_police', reputationChange: 2 },
      { factionId: 'guardian_initiative', reputationChange: 3 },
      { factionId: 'civilian_population', reputationChange: 2 },
      { factionId: 'syndicate', reputationChange: -2 }
    ],
    attributeGrowthChance: [
      { attributeId: 'strength', chance: 0.4 },
      { attributeId: 'perception', chance: 0.4 },
      { attributeId: 'endurance', chance: 0.3 },
      { attributeId: 'reputation', chance: 0.4 }
    ],
    encounterChance: 0.9,
    encounterTypes: [
      'villain_sighting',
      'villain_hideout',
      'powered_criminal_pursuit',
      'hero_battle',
      'ambush_scenario',
      'public_confrontation',
      'gang_violence',
      'turf_war'
    ],
    difficultyRange: [5, 9],
    likelyFactions: ['syndicate', 'street_gangs', 'guardian_initiative', 'metro_police', 'nihilist_collective'],
    narrativeContext: 'Player actively hunts the most dangerous criminals, seeking out high-level superhuman threats',
    locationTypes: [
      'city_streets', 'downtown', 'slums', 'back_alleys',
      'warehouses', 'docks', 'syndicate_territory', 'abandoned_areas'
    ],
    baseXPReward: 40,
    baseMoneyReward: 10,
    cooldownHours: 3
  },

  {
    id: 'respond_to_emergency',
    name: 'Respond to Emergency',
    description: 'Rush to a disaster or emergency situation to help',
    category: 'heroic',
    moralIntent: 'heroic',
    energyCost: 15,
    requiredAttributes: [
      { attributeId: 'agility', minValue: 12 }
    ],
    factionImpacts: [
      { factionId: 'civilian_population', reputationChange: 4 },
      { factionId: 'guardian_initiative', reputationChange: 2 },
      { factionId: 'metro_police', reputationChange: 2 },
      { factionId: 'media_corporations', reputationChange: 1 }
    ],
    attributeGrowthChance: [
      { attributeId: 'strength', chance: 0.3 },
      { attributeId: 'endurance', chance: 0.4 },
      { attributeId: 'reputation', chance: 0.5 }
    ],
    encounterChance: 0.9,
    encounterTypes: [
      'building_collapse',
      'fire_rescue',
      'hostage_situation',
      'natural_disaster',
      'accident_scene'
    ],
    difficultyRange: [4, 8],
    likelyFactions: ['civilian_population', 'metro_police', 'media_corporations'],
    narrativeContext: 'Player rushes into danger to save lives, high visibility heroic action',
    locationTypes: ['disaster_sites', 'anywhere_in_crisis'],
    baseXPReward: 40,
    baseMoneyReward: 0,
    cooldownHours: 3
  },

  {
    id: 'cooperate_with_police',
    name: 'Cooperate with Police',
    description: 'Work directly with law enforcement on a case or operation',
    category: 'heroic',
    moralIntent: 'heroic',
    energyCost: 12,
    factionImpacts: [
      { factionId: 'metro_police', reputationChange: 4 },
      { factionId: 'city_government', reputationChange: 2 },
      { factionId: 'vigilante_network', reputationChange: -2 },
      { factionId: 'syndicate', reputationChange: -2 }
    ],
    attributeGrowthChance: [
      { attributeId: 'intelligence', chance: 0.3 },
      { attributeId: 'charisma', chance: 0.3 }
    ],
    encounterChance: 0.7,
    encounterTypes: [
      'joint_operation',
      'investigation',
      'sting_operation',
      'powered_criminal_pursuit',
      'evidence_gathering'
    ],
    difficultyRange: [3, 7],
    likelyFactions: ['metro_police', 'syndicate', 'street_gangs'],
    narrativeContext: 'Player works within the system, cooperating with official law enforcement',
    locationTypes: ['police_station', 'crime_scenes', 'stake_out_locations'],
    baseXPReward: 30,
    baseMoneyReward: 0
  },

  // === CRIMINAL ACTIONS ===
  {
    id: 'rob_bank',
    name: 'Rob a Bank',
    description: 'Use your powers to steal money from a financial institution',
    category: 'criminal',
    moralIntent: 'villainous',
    energyCost: 15,
    factionImpacts: [
      { factionId: 'metro_police', reputationChange: -5 },
      { factionId: 'civilian_population', reputationChange: -4 },
      { factionId: 'guardian_initiative', reputationChange: -4 },
      { factionId: 'syndicate', reputationChange: 2 },
      { factionId: 'black_market', reputationChange: 1 }
    ],
    attributeGrowthChance: [
      { attributeId: 'notoriety', chance: 0.6 },
      { attributeId: 'stealth', chance: 0.3 }
    ],
    encounterChance: 0.85,
    encounterTypes: [
      'police_response',
      'hero_intervention',
      'security_systems',
      'hostage_situation',
      'escape_chase'
    ],
    difficultyRange: [5, 9],
    likelyFactions: ['metro_police', 'guardian_initiative', 'civilian_population'],
    narrativeContext: 'Player commits high-profile robbery, willing to use powers for personal gain',
    locationTypes: ['banks', 'financial_district', 'downtown'],
    baseXPReward: 40,
    baseMoneyReward: 300,
    cooldownHours: 3
  },

  {
    id: 'extort_businesses',
    name: 'Extort Local Businesses',
    description: 'Demand protection money from businesses in a neighborhood',
    category: 'criminal',
    moralIntent: 'villainous',
    energyCost: 10,
    factionImpacts: [
      { factionId: 'civilian_population', reputationChange: -3 },
      { factionId: 'metro_police', reputationChange: -2 },
      { factionId: 'syndicate', reputationChange: 1 },
      { factionId: 'street_gangs', reputationChange: -1 }
    ],
    attributeGrowthChance: [
      { attributeId: 'notoriety', chance: 0.4 },
      { attributeId: 'charisma', chance: 0.2 }
    ],
    encounterChance: 0.6,
    encounterTypes: [
      'business_owner_resistance',
      'gang_turf_conflict',
      'vigilante_intervention',
      'police_investigation',
      'rival_extortion'
    ],
    difficultyRange: [3, 6],
    likelyFactions: ['street_gangs', 'vigilante_network', 'civilian_population', 'metro_police'],
    narrativeContext: 'Player uses intimidation and power to extract money from local businesses',
    locationTypes: ['commercial_areas', 'neighborhoods', 'small_businesses'],
    baseXPReward: 20,
    baseMoneyReward: 150,
    cooldownHours: 4
  },

  {
    id: 'join_syndicate_job',
    name: 'Take a Syndicate Job',
    description: 'Work as muscle for organized crime',
    category: 'criminal',
    moralIntent: 'villainous',
    energyCost: 12,
    factionImpacts: [
      { factionId: 'syndicate', reputationChange: 4 },
      { factionId: 'metro_police', reputationChange: -3 },
      { factionId: 'guardian_initiative', reputationChange: -3 },
      { factionId: 'vigilante_network', reputationChange: -2 }
    ],
    attributeGrowthChance: [
      { attributeId: 'strength', chance: 0.3 },
      { attributeId: 'notoriety', chance: 0.4 }
    ],
    encounterChance: 0.75,
    encounterTypes: [
      'heist_operation',
      'enforcer_work',
      'turf_expansion',
      'rival_gang_conflict',
      'smuggling_run'
    ],
    difficultyRange: [4, 8],
    likelyFactions: ['syndicate', 'metro_police', 'street_gangs', 'guardian_initiative'],
    narrativeContext: 'Player works for organized crime, taking orders and getting paid',
    locationTypes: ['docks', 'warehouses', 'syndicate_territory'],
    baseXPReward: 35,
    baseMoneyReward: 300,
    cooldownHours: 5
  },

  {
    id: 'attack_hero',
    name: 'Attack a Hero',
    description: 'Hunt down and confront a known hero or vigilante',
    category: 'criminal',
    moralIntent: 'villainous',
    energyCost: 18,
    requiredAttributes: [
      { attributeId: 'notoriety', minValue: 20 }
    ],
    factionImpacts: [
      { factionId: 'guardian_initiative', reputationChange: -6 },
      { factionId: 'vigilante_network', reputationChange: -5 },
      { factionId: 'metro_police', reputationChange: -4 },
      { factionId: 'civilian_population', reputationChange: -5 },
      { factionId: 'nihilist_collective', reputationChange: 3 },
      { factionId: 'syndicate', reputationChange: 2 }
    ],
    attributeGrowthChance: [
      { attributeId: 'notoriety', chance: 0.8 },
      { attributeId: 'strength', chance: 0.4 }
    ],
    encounterChance: 0.95,
    encounterTypes: [
      'hero_battle',
      'ambush_scenario',
      'public_confrontation',
      'base_assault',
      'team_battle'
    ],
    difficultyRange: [6, 10],
    likelyFactions: ['guardian_initiative', 'vigilante_network', 'metro_police'],
    narrativeContext: 'Player actively hunts heroes, establishing themselves as a villain',
    locationTypes: ['anywhere', 'hero_patrol_routes', 'guardian_hq_vicinity'],
    baseXPReward: 50,
    baseMoneyReward: 0,
    cooldownHours: 24
  },

  // === NEUTRAL ACTIONS ===
  {
    id: 'investigate_mystery',
    name: 'Investigate a Mystery',
    description: 'Look into strange occurrences or gather intelligence',
    category: 'neutral',
    moralIntent: 'neutral',
    energyCost: 10,
    requiredAttributes: [
      { attributeId: 'intelligence', minValue: 12 }
    ],
    factionImpacts: [],
    attributeGrowthChance: [
      { attributeId: 'intelligence', chance: 0.5 },
      { attributeId: 'perception', chance: 0.4 }
    ],
    encounterChance: 0.6,
    encounterTypes: [
      'clue_discovery',
      'informant_meeting',
      'surveillance',
      'break_in_investigation',
      'conspiracy_uncovered'
    ],
    difficultyRange: [2, 7],
    likelyFactions: ['black_market', 'media_corporations', 'syndicate'],
    narrativeContext: 'Player gathers information and investigates, neutral detective work',
    locationTypes: ['libraries', 'crime_scenes', 'informant_locations', 'rooftops'],
    baseXPReward: 25,
    baseMoneyReward: 0
  },

  {
    id: 'explore_territory',
    name: 'Explore New Territory',
    description: 'Scout out unfamiliar parts of the city',
    category: 'neutral',
    moralIntent: 'neutral',
    energyCost: 8,
    factionImpacts: [],
    attributeGrowthChance: [
      { attributeId: 'perception', chance: 0.4 },
      { attributeId: 'agility', chance: 0.2 }
    ],
    encounterChance: 0.5,
    encounterTypes: [
      'discover_location',
      'unexpected_encounter',
      'territorial_dispute',
      'hidden_cache',
      'faction_activity'
    ],
    difficultyRange: [1, 6],
    likelyFactions: ['street_gangs', 'vigilante_network', 'civilian_population'],
    narrativeContext: 'Player explores and discovers new areas of the city',
    locationTypes: ['unexplored_districts', 'underground', 'rooftops', 'abandoned_areas'],
    baseXPReward: 20,
    baseMoneyReward: 0
  },

  {
    id: 'black_market_trade',
    name: 'Visit Black Market',
    description: 'Trade with underground dealers for rare items and information',
    category: 'neutral',
    moralIntent: 'neutral',
    energyCost: 5,
    factionImpacts: [
      { factionId: 'black_market', reputationChange: 2 },
      { factionId: 'metro_police', reputationChange: -1 }
    ],
    attributeGrowthChance: [
      { attributeId: 'charisma', chance: 0.3 }
    ],
    encounterChance: 0.4,
    encounterTypes: [
      'deal_making',
      'rare_item_offer',
      'intel_purchase',
      'shady_contact',
      'police_raid'
    ],
    difficultyRange: [2, 5],
    likelyFactions: ['black_market', 'metro_police', 'syndicate'],
    narrativeContext: 'Player engages in underground economy, trading and networking',
    locationTypes: ['hidden_markets', 'underground', 'docks', 'back_rooms'],
    baseXPReward: 15,
    baseMoneyReward: 0
  },

  {
    id: 'media_interview',
    name: 'Give Media Interview',
    description: 'Speak to reporters and shape your public image',
    category: 'neutral',
    moralIntent: 'neutral',
    energyCost: 8,
    requiredAttributes: [
      { attributeId: 'reputation', minValue: 15 }
    ],
    factionImpacts: [
      { factionId: 'media_corporations', reputationChange: 3 },
      { factionId: 'civilian_population', reputationChange: 1 }
    ],
    attributeGrowthChance: [
      { attributeId: 'charisma', chance: 0.5 },
      { attributeId: 'reputation', chance: 0.4 }
    ],
    encounterChance: 0.5,
    encounterTypes: [
      'interview_questions',
      'reputation_boost',
      'scandal_opportunity',
      'political_statement',
      'rival_criticism'
    ],
    difficultyRange: [2, 6],
    likelyFactions: ['media_corporations', 'civilian_population', 'city_government'],
    narrativeContext: 'Player manages public perception through media interaction',
    locationTypes: ['news_studios', 'public_locations', 'press_conferences'],
    baseXPReward: 20,
    baseMoneyReward: 0,
    cooldownHours: 12
  },

  // === TRAINING ACTIONS ===
  {
    id: 'train_powers',
    name: 'Train Your Powers',
    description: 'Practice and refine your abilities in a safe environment',
    category: 'training',
    moralIntent: 'neutral',
    energyCost: 12,
    factionImpacts: [],
    attributeGrowthChance: [
      { attributeId: 'willpower', chance: 0.5 }
    ],
    encounterChance: 0.2,
    encounterTypes: [
      'breakthrough_moment',
      'control_challenge',
      'power_discovery',
      'training_accident',
      'mentor_appears'
    ],
    difficultyRange: [1, 4],
    likelyFactions: ['guardian_initiative', 'vigilante_network'],
    narrativeContext: 'Player focuses on improving their abilities through practice',
    locationTypes: ['training_grounds', 'abandoned_warehouses', 'remote_areas'],
    baseXPReward: 30,
    baseMoneyReward: 0
  },

  {
    id: 'physical_training',
    name: 'Physical Training',
    description: 'Work on your strength, speed, and endurance',
    category: 'training',
    moralIntent: 'neutral',
    energyCost: 10,
    factionImpacts: [],
    attributeGrowthChance: [
      { attributeId: 'strength', chance: 0.4 },
      { attributeId: 'agility', chance: 0.4 },
      { attributeId: 'endurance', chance: 0.5 }
    ],
    encounterChance: 0.15,
    encounterTypes: [
      'training_partner',
      'gym_encounter',
      'physical_breakthrough',
      'overexertion',
      'rival_challenge'
    ],
    difficultyRange: [1, 3],
    likelyFactions: ['guardian_initiative', 'vigilante_network'],
    narrativeContext: 'Player improves physical capabilities through rigorous training',
    locationTypes: ['gyms', 'training_facilities', 'outdoor_areas'],
    baseXPReward: 20,
    baseMoneyReward: 0
  },

  {
    id: 'study_tactics',
    name: 'Study Tactics',
    description: 'Research combat strategies and analyze past encounters',
    category: 'training',
    moralIntent: 'neutral',
    energyCost: 8,
    factionImpacts: [],
    attributeGrowthChance: [
      { attributeId: 'intelligence', chance: 0.6 },
      { attributeId: 'perception', chance: 0.3 }
    ],
    encounterChance: 0.1,
    encounterTypes: [
      'tactical_insight',
      'strategy_breakthrough',
      'mentor_knowledge',
      'database_access',
      'enemy_weakness_discovered'
    ],
    difficultyRange: [1, 3],
    likelyFactions: ['guardian_initiative', 'metro_police'],
    narrativeContext: 'Player improves tactical thinking and strategic planning',
    locationTypes: ['libraries', 'safehouses', 'databases', 'war_rooms'],
    baseXPReward: 20,
    baseMoneyReward: 0
  },

  {
    id: 'meditation',
    name: 'Meditation & Focus',
    description: 'Clear your mind and strengthen your mental discipline',
    category: 'training',
    moralIntent: 'neutral',
    energyCost: 5,
    factionImpacts: [],
    attributeGrowthChance: [
      { attributeId: 'willpower', chance: 0.6 },
      { attributeId: 'perception', chance: 0.3 }
    ],
    encounterChance: 0.1,
    encounterTypes: [
      'mental_breakthrough',
      'inner_vision',
      'power_insight',
      'spiritual_encounter',
      'mental_clarity'
    ],
    difficultyRange: [1, 2],
    likelyFactions: [],
    narrativeContext: 'Player strengthens mental fortitude and inner focus',
    locationTypes: ['quiet_locations', 'rooftops', 'parks', 'meditation_spaces'],
    baseXPReward: 15,
    baseMoneyReward: 0
  },

  // === SOCIAL ACTIONS ===
  {
    id: 'recruit_ally',
    name: 'Recruit an Ally',
    description: 'Seek out and convince someone to join your cause',
    category: 'social',
    moralIntent: 'neutral',
    energyCost: 10,
    requiredAttributes: [
      { attributeId: 'charisma', minValue: 15 }
    ],
    factionImpacts: [],
    attributeGrowthChance: [
      { attributeId: 'charisma', chance: 0.5 }
    ],
    encounterChance: 0.6,
    encounterTypes: [
      'recruitment_pitch',
      'trust_building',
      'shared_mission',
      'loyalty_test',
      'alliance_formed'
    ],
    difficultyRange: [3, 7],
    likelyFactions: ['vigilante_network', 'street_gangs', 'civilian_population'],
    narrativeContext: 'Player builds relationships and recruits supporters to their cause',
    locationTypes: ['meeting_places', 'bars', 'community_centers', 'hideouts'],
    baseXPReward: 25,
    baseMoneyReward: 0,
    cooldownHours: 24
  },

  {
    id: 'network_contacts',
    name: 'Network with Contacts',
    description: 'Build relationships and gather information from various sources',
    category: 'social',
    moralIntent: 'neutral',
    energyCost: 8,
    factionImpacts: [
      { factionId: 'black_market', reputationChange: 1 }
    ],
    attributeGrowthChance: [
      { attributeId: 'charisma', chance: 0.4 },
      { attributeId: 'intelligence', chance: 0.3 }
    ],
    encounterChance: 0.5,
    encounterTypes: [
      'informant_meeting',
      'rumor_gathering',
      'favor_trading',
      'connection_made',
      'intel_exchange'
    ],
    difficultyRange: [2, 5],
    likelyFactions: ['black_market', 'media_corporations', 'vigilante_network'],
    narrativeContext: 'Player builds network of contacts and information sources',
    locationTypes: ['bars', 'social_clubs', 'underground_venues', 'meetup_spots'],
    baseXPReward: 20,
    baseMoneyReward: 0
  },

  {
    id: 'rest_recover',
    name: 'Rest & Recover',
    description: 'Take time to heal wounds and regain energy',
    category: 'neutral',
    moralIntent: 'neutral',
    energyCost: -20, // Actually restores energy
    factionImpacts: [],
    attributeGrowthChance: [
      { attributeId: 'endurance', chance: 0.2 }
    ],
    encounterChance: 0.1,
    encounterTypes: [
      'peaceful_rest',
      'recovery_boost',
      'dream_vision',
      'unexpected_visitor',
      'safehouse_discovered'
    ],
    difficultyRange: [1, 2],
    likelyFactions: [],
    narrativeContext: 'Player takes downtime to heal and recover',
    locationTypes: ['safehouses', 'home', 'hideouts', 'safe_locations'],
    baseXPReward: 5,
    baseMoneyReward: 0,
    hpRestore: 30
  }
]

// === HELPER FUNCTIONS ===

export function getActionById(id: string): Action | undefined {
  return actions.find(a => a.id === id)
}

export function getActionsByCategory(category: ActionCategory): Action[] {
  return actions.filter(a => a.category === category)
}

export function getAvailableActions(
  playerLevel: number,
  playerAttributes: Record<string, number>,
  playerPowers: string[],
  playerEnergy: number
): Action[] {
  return actions.filter(action => {
    // Check energy
    if (action.energyCost > playerEnergy && action.energyCost > 0) return false
    
    // Check level requirement
    if (action.minLevel && playerLevel < action.minLevel) return false
    
    // Check power requirements
    if (action.requiredPowers && action.requiredPowers.length > 0) {
      const hasPower = action.requiredPowers.some(powerId => playerPowers.includes(powerId))
      if (!hasPower) return false
    }
    
    // Check attribute requirements
    if (action.requiredAttributes && action.requiredAttributes.length > 0) {
      const meetsRequirements = action.requiredAttributes.every(req => {
        const attrValue = playerAttributes[req.attributeId] || 0
        return attrValue >= req.minValue
      })
      if (!meetsRequirements) return false
    }
    
    return true
  })
}

export function rollForEncounter(action: Action): boolean {
  // hunt_major_threats gets a small extra nudge toward triggering
  const bonus = action.id === 'hunt_major_threats' ? 0.05 : 0
  return Math.random() < (action.encounterChance + bonus)
}

export function getEncounterDifficulty(action: Action): number {
  const [min, max] = action.difficultyRange
  let difficulty = Math.floor(Math.random() * (max - min + 1)) + min

  // Bias hunt_major_threats toward the harder end (+1, clamped to 10)
  if (action.id === 'hunt_major_threats') {
    difficulty = Math.min(10, difficulty + 1)
  }

  return difficulty
}

// Encounter types biased toward villain / powered encounters for hunt_major_threats
const THREAT_HUNT_PREFERRED_TYPES = [
  'villain_sighting', 'villain_hideout', 'powered_criminal_pursuit',
  'hero_battle', 'ambush_scenario', 'public_confrontation',
]

export function selectEncounterType(action: Action): string {
  const types = action.encounterTypes

  // For hunt_major_threats, 60% chance to pick from preferred (villain/powered) types
  if (action.id === 'hunt_major_threats' && Math.random() < 0.6) {
    const preferred = types.filter((t) => THREAT_HUNT_PREFERRED_TYPES.includes(t))
    if (preferred.length > 0) {
      return preferred[Math.floor(Math.random() * preferred.length)]
    }
  }

  return types[Math.floor(Math.random() * types.length)]
}

export function applyActionEffects(
  action: Action,
  playerReputations: Record<string, number>,
  playerAttributes: Record<string, number>
): {
  reputationChanges: Record<string, number>
  attributeGrowth: Record<string, number>
} {
  const reputationChanges: Record<string, number> = {}
  const attributeGrowth: Record<string, number> = {}
  
  // Apply faction reputation changes
  action.factionImpacts.forEach(impact => {
    reputationChanges[impact.factionId] = impact.reputationChange
  })
  
  // Roll for attribute growth
  action.attributeGrowthChance.forEach(growth => {
    if (Math.random() < growth.chance) {
      attributeGrowth[growth.attributeId] = 1 // Could be scaled based on difficulty
    }
  })
  
  return { reputationChanges, attributeGrowth }
}

export function getCooldownExpiry(action: Action, currentTime: Date): Date | null {
  if (!action.cooldownHours) return null
  
  const expiry = new Date(currentTime)
  expiry.setHours(expiry.getHours() + action.cooldownHours)
  return expiry
}

export function isActionOnCooldown(
  actionId: string,
  lastUsedTime: Date,
  currentTime: Date
): boolean {
  const action = getActionById(actionId)
  if (!action || !action.cooldownHours) return false
  
  const hoursSinceUse = (currentTime.getTime() - lastUsedTime.getTime()) / (1000 * 60 * 60)
  return hoursSinceUse < action.cooldownHours
}

export type ActionResult = {
  actionId: string
  energySpent: number
  xpGained: number
  moneyGained: number
  reputationChanges: Record<string, number>
  attributeGrowth: Record<string, number>
  encounterTriggered: boolean
  encounterId?: string
  timestamp: Date
}