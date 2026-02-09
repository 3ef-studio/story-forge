// data/factions.ts

export type FactionAlignment = 'lawful' | 'neutral' | 'chaotic'
export type FactionMorality = 'good' | 'neutral' | 'evil'
export type FactionCategory = 'power' | 'institution' | 'ambient'

export type Faction = {
  id: string
  name: string
  shortName: string // For UI display
  description: string
  ideology: string // Core beliefs - for AI context

  // Alignment system
  alignment: FactionAlignment
  morality: FactionMorality

  // Gameplay classification
  isPlayable: boolean // Can the player join this faction
  category: FactionCategory // High-level type used for UI and systems
  canControlDistricts: boolean // Only 'power' factions should set this true

  // Player relationship (-100 to +100)
  startingReputation: number

  // Behavioral traits (for AI generation)
  values: string[] // What they care about
  opposedTo: string[] // Faction IDs or concepts they oppose
  goals: string[] // What they're trying to achieve

  // Encounter behavior
  responseThresholds: {
    hostile: number // Rep below this = attacks on sight
    suspicious: number // Rep below this = watches closely
    neutral: number // Standard interaction
    friendly: number // Rep above this = offers assistance
    allied: number // Rep above this = considers you one of them
  }

  // How often they appear in encounters
  encounterLikelihood: number // 0-1, base chance per action
  powerLevel: number // 1-10, how dangerous are they

  // Territory and influence
  territories: string[] // Areas where they're most active
  resources: string[] // What they control (money, tech, etc.)

  // Relationships with other factions
  allies: string[] // Faction IDs
  rivals: string[] // Faction IDs
  enemies: string[] // Faction IDs

  // Narrative hooks
  recruitmentPitch?: string // What they'd say to recruit player
  reputationDescriptors: {
    veryNegative: string // -100 to -60
    negative: string // -59 to -20
    neutral: string // -19 to +19
    positive: string // +20 to +59
    veryPositive: string // +60 to +100
  }
}

export const factions: Faction[] = [
  {
    id: 'metro_police',
    name: 'Metro City Police Department',
    shortName: 'MCPD',
    description:
      "The city's law enforcement trying to maintain order in an age of powered individuals",
    ideology:
      "Uphold the law, protect citizens, maintain civil order. Deeply conflicted about vigilantes - grateful for help but concerned about accountability.",
    alignment: 'lawful',
    morality: 'good',
    isPlayable: false,
    category: 'institution',
    canControlDistricts: false,
    startingReputation: 0,
    values: [
      'rule of law',
      'public safety',
      'accountability',
      'due process',
      'civilian protection'
    ],
    opposedTo: ['vigilante_justice', 'organized_crime', 'chaos', 'corruption'],
    goals: [
      'reduce crime rates',
      'apprehend powered criminals',
      'regulate vigilante activity',
      'maintain public trust'
    ],
    responseThresholds: {
      hostile: -40,
      suspicious: -15,
      neutral: 0,
      friendly: 30,
      allied: 60
    },
    encounterLikelihood: 0.7,
    powerLevel: 4,
    territories: ['downtown', 'commercial_district', 'government_quarter'],
    resources: ['databases', 'forensics', 'coordination', 'legal_authority'],
    allies: ['city_government'],
    rivals: ['vigilante_network'],
    enemies: ['syndicate', 'black_market'],
    recruitmentPitch:
      "Work with us officially. Get a badge, follow the rules, and we can do real good together.",
    reputationDescriptors: {
      veryNegative: 'Wanted criminal - shoot on sight',
      negative: 'Known troublemaker - under surveillance',
      neutral: 'Unregistered powered individual',
      positive: 'Cooperative vigilante - tolerated',
      veryPositive: 'Honorary officer - trusted partner'
    }
  },

  {
    id: 'syndicate',
    name: 'The Syndicate',
    shortName: 'Syndicate',
    description:
      'Organized crime network that has adapted to the age of powers, recruiting powered enforcers',
    ideology:
      'Power and profit above all. Laws are for the weak. The strong take what they want.',
    alignment: 'chaotic',
    morality: 'evil',
    isPlayable: true,
    category: 'power',
    canControlDistricts: true,
    startingReputation: 0,
    values: ['profit', 'power', 'loyalty to the organization', 'fear and respect', 'territory control'],
    opposedTo: ['law_enforcement', 'vigilantes', 'competition', 'betrayal'],
    goals: [
      'expand criminal operations',
      'control key districts',
      'eliminate rival organizations',
      'corrupt institutions'
    ],
    responseThresholds: {
      hostile: -30,
      suspicious: -10,
      neutral: 0,
      friendly: 25,
      allied: 55
    },
    encounterLikelihood: 0.6,
    powerLevel: 7,
    territories: ['industrial_zone', 'docklands', 'underground_markets'],
    resources: ['money', 'weapons', 'information', 'corrupt_contacts'],
    allies: ['black_market', 'street_gangs'],
    rivals: ['guardian_initiative'],
    enemies: ['metro_police', 'vigilante_network'],
    recruitmentPitch:
      'You have power. We have opportunities. Join us and take what you deserve.',
    reputationDescriptors: {
      veryNegative: 'Marked for elimination',
      negative: 'Not trusted - watched closely',
      neutral: 'Potential asset',
      positive: 'Reliable associate',
      veryPositive: 'Made member - protected'
    }
  },

  {
    id: 'guardian_initiative',
    name: 'The Guardian Initiative',
    shortName: 'Guardians',
    description:
      'Government-backed organization of registered powered individuals dedicated to public safety',
    ideology:
      'With great power comes great responsibility. Powered individuals must be accountable and serve the public good.',
    alignment: 'lawful',
    morality: 'good',
    isPlayable: true,
    category: 'power',
    canControlDistricts: true,
    startingReputation: 0,
    values: [
      'public service',
      'accountability',
      'teamwork',
      'transparency',
      'protecting the innocent'
    ],
    opposedTo: ['vigilante_justice', 'crime', 'corruption', 'recklessness'],
    goals: [
      'protect civilians',
      'maintain order',
      'regulate powered activity',
      'build public trust in heroes'
    ],
    responseThresholds: {
      hostile: -35,
      suspicious: -10,
      neutral: 0,
      friendly: 35,
      allied: 70
    },
    encounterLikelihood: 0.5,
    powerLevel: 8,
    territories: ['government_quarter', 'downtown', 'residential_areas'],
    resources: ['training', 'technology', 'government_support', 'public_relations'],
    allies: ['city_government', 'metro_police'],
    rivals: ['vigilante_network'],
    enemies: ['syndicate', 'nihilist_collective'],
    recruitmentPitch:
      'Register your abilities. Train with us. Be the hero this city needs - the right way.',
    reputationDescriptors: {
      veryNegative: 'Threat to public safety',
      negative: 'Unreliable and suspicious',
      neutral: 'Unregistered but monitored',
      positive: 'Trusted ally',
      veryPositive: 'Recognized Guardian'
    }
  },

  {
    id: 'vigilante_network',
    name: 'The Vigilante Network',
    shortName: 'Vigilantes',
    description:
      'Loose coalition of independent heroes who operate outside official channels',
    ideology:
      'The system is broken. Justice can’t wait for paperwork. Real change requires direct action.',
    alignment: 'neutral',
    morality: 'good',
    isPlayable: true,
    category: 'power',
    canControlDistricts: true,
    startingReputation: 0,
    values: ['justice', 'freedom', 'protecting the weak', 'direct action', 'community trust'],
    opposedTo: ['bureaucracy', 'corruption', 'organized_crime', 'authoritarian_control'],
    goals: [
      'stop criminals that slip through the system',
      'expose corruption',
      'protect neighborhoods',
      'build grassroots support'
    ],
    responseThresholds: {
      hostile: -35,
      suspicious: -10,
      neutral: 0,
      friendly: 30,
      allied: 65
    },
    encounterLikelihood: 0.55,
    powerLevel: 7,
    territories: ['residential_areas', 'slums', 'downtown_rooftops'],
    resources: ['local_contacts', 'safe_houses', 'street_intel', 'improvised_gear'],
    allies: ['civilian_population'],
    rivals: ['metro_police', 'guardian_initiative'],
    enemies: ['syndicate', 'nihilist_collective'],
    recruitmentPitch:
      'Forget the red tape. Help people now. Join the network and make a difference where it matters.',
    reputationDescriptors: {
      veryNegative: 'Dangerous rogue vigilante',
      negative: 'Reckless and untrusted',
      neutral: 'Independent operator',
      positive: 'Reliable street hero',
      veryPositive: 'Legend of the streets'
    }
  },

  {
    id: 'civilian_population',
    name: 'Civilian Population',
    shortName: 'Civilians',
    description:
      'The ordinary people of Metro City, caught between heroes, villains, and institutions',
    ideology:
      'We just want to live our lives safely. Heroes should protect us, not bring more danger.',
    alignment: 'neutral',
    morality: 'good',
    isPlayable: false,
    category: 'ambient',
    canControlDistricts: false,
    startingReputation: 0,
    values: ['safety', 'stability', 'fairness', 'community', 'hope'],
    opposedTo: ['collateral_damage', 'fear', 'oppression', 'crime'],
    goals: [
      'survive daily life',
      'feel protected',
      'avoid becoming targets',
      'support those who help'
    ],
    responseThresholds: {
      hostile: -40,
      suspicious: -15,
      neutral: 0,
      friendly: 25,
      allied: 55
    },
    encounterLikelihood: 0.8,
    powerLevel: 1,
    territories: ['residential_areas', 'downtown', 'slums'],
    resources: ['public_opinion', 'community_support', 'votes', 'word_of_mouth'],
    allies: ['media_corporations'],
    rivals: [],
    enemies: ['syndicate', 'nihilist_collective'],
    recruitmentPitch: undefined,
    reputationDescriptors: {
      veryNegative: 'Feared menace',
      negative: 'Not welcome here',
      neutral: 'Just another powered person',
      positive: 'Local protector',
      veryPositive: 'Beloved hero'
    }
  },

  {
    id: 'black_market',
    name: 'Black Market Network',
    shortName: 'Black Market',
    description:
      'Underground network of smugglers, fence operators, and illicit tech dealers',
    ideology:
      'Everything has a price. Laws are just obstacles. Information and goods should flow freely - to those who can pay.',
    alignment: 'chaotic',
    morality: 'neutral',
    isPlayable: false,
    category: 'ambient',
    canControlDistricts: false,
    startingReputation: 0,
    values: ['profit', 'secrecy', 'connections', 'opportunity', 'leverage'],
    opposedTo: ['law_enforcement', 'regulation', 'exposure', 'monopolies'],
    goals: [
      'move illegal goods',
      'sell powered tech',
      'maintain secrecy',
      'profit from chaos'
    ],
    responseThresholds: {
      hostile: -30,
      suspicious: -10,
      neutral: 0,
      friendly: 25,
      allied: 55
    },
    encounterLikelihood: 0.45,
    powerLevel: 5,
    territories: ['docklands', 'industrial_zone', 'underground_markets'],
    resources: ['contraband', 'weapons', 'illegal_tech', 'contacts'],
    allies: ['syndicate', 'street_gangs'],
    rivals: [],
    enemies: ['metro_police', 'guardian_initiative'],
    recruitmentPitch: undefined,
    reputationDescriptors: {
      veryNegative: 'Marked buyer - do not sell',
      negative: 'Not trusted',
      neutral: 'Customer',
      positive: 'Preferred customer',
      veryPositive: 'Inner circle broker'
    }
  },

  {
    id: 'nihilist_collective',
    name: 'The Nihilist Collective',
    shortName: 'Nihilists',
    description:
      'A destructive movement that believes the city deserves collapse and rebirth through chaos',
    ideology:
      'Order is a lie. Heroes are a mask. The city must burn so something real can rise from the ashes.',
    alignment: 'chaotic',
    morality: 'evil',
    isPlayable: true,
    category: 'power',
    canControlDistricts: true,
    startingReputation: 0,
    values: ['chaos', 'destruction', 'freedom from systems', 'fear', 'ideological purity'],
    opposedTo: ['law', 'heroes', 'stability', 'institutions', 'hope'],
    goals: [
      'destabilize districts',
      'destroy symbols of order',
      'recruit the disillusioned',
      'accelerate city collapse'
    ],
    responseThresholds: {
      hostile: -20,
      suspicious: -5,
      neutral: 0,
      friendly: 20,
      allied: 45
    },
    encounterLikelihood: 0.35,
    powerLevel: 9,
    territories: ['slums', 'abandoned_zones', 'industrial_zone'],
    resources: ['fear', 'fanatics', 'improvised_weapons', 'sabotage'],
    allies: [],
    rivals: ['syndicate'],
    enemies: ['guardian_initiative', 'metro_police', 'vigilante_network', 'civilian_population'],
    recruitmentPitch:
      'You see the truth. The city is rotten. Help us tear it down and build something honest.',
    reputationDescriptors: {
      veryNegative: 'Target for ritual elimination',
      negative: 'Not trusted',
      neutral: 'Useful chaos',
      positive: 'True believer',
      veryPositive: 'Chosen destroyer'
    }
  },

  {
    id: 'city_government',
    name: 'City Government',
    shortName: 'City Hall',
    description:
      'Elected officials and bureaucrats balancing public safety, public opinion, and political power',
    ideology:
      'Maintain governance, avoid panic, preserve legitimacy. Control the narrative and the budget.',
    alignment: 'lawful',
    morality: 'neutral',
    isPlayable: false,
    category: 'institution',
    canControlDistricts: false,
    startingReputation: 0,
    values: ['stability', 'legitimacy', 'order', 'political capital', 'control'],
    opposedTo: ['public_panic', 'scandals', 'uncontrolled_power', 'anarchy'],
    goals: [
      'keep the city running',
      'prevent mass unrest',
      'contain powered conflict',
      'maintain authority'
    ],
    responseThresholds: {
      hostile: -35,
      suspicious: -10,
      neutral: 0,
      friendly: 25,
      allied: 55
    },
    encounterLikelihood: 0.25,
    powerLevel: 3,
    territories: ['government_quarter', 'downtown'],
    resources: ['permits', 'funding', 'laws', 'influence'],
    allies: ['metro_police', 'guardian_initiative'],
    rivals: ['media_corporations'],
    enemies: ['nihilist_collective', 'syndicate'],
    recruitmentPitch: undefined,
    reputationDescriptors: {
      veryNegative: 'Declared enemy of the state',
      negative: 'Political liability',
      neutral: 'Unregistered factor',
      positive: 'Trusted asset',
      veryPositive: 'City-backed operative'
    }
  },

  {
    id: 'street_gangs',
    name: 'Street Gangs',
    shortName: 'Gangs',
    description:
      'Fragmented neighborhood crews fighting over turf, protection, and respect in the shadows of bigger powers',
    ideology:
      'Survive your block. Earn respect. Take what you can and defend what’s yours.',
    alignment: 'chaotic',
    morality: 'neutral',
    isPlayable: false,
    category: 'ambient',
    canControlDistricts: false,
    startingReputation: 0,
    values: ['respect', 'turf', 'survival', 'loyalty', 'fear'],
    opposedTo: ['outsiders', 'betrayal', 'police', 'rival_crews'],
    goals: [
      'hold neighborhood turf',
      'profit from protection',
      'avoid being crushed by major factions',
      'gain local influence'
    ],
    responseThresholds: {
      hostile: -35,
      suspicious: -10,
      neutral: 0,
      friendly: 20,
      allied: 45
    },
    encounterLikelihood: 0.6,
    powerLevel: 4,
    territories: ['slums', 'industrial_zone', 'docklands'],
    resources: ['numbers', 'local_intel', 'turf', 'petty_crime'],
    allies: ['black_market'],
    rivals: [],
    enemies: ['metro_police', 'guardian_initiative'],
    recruitmentPitch: undefined,
    reputationDescriptors: {
      veryNegative: 'Marked for a beating',
      negative: 'Not welcome',
      neutral: 'Outsider',
      positive: 'Respect earned',
      veryPositive: 'One of us - family'
    }
  },

  {
    id: 'media_corporations',
    name: 'Media Corporations',
    shortName: 'The Media',
    description:
      'News networks and social media companies that shape public perception of powered individuals',
    ideology:
      "The narrative is power. We decide who's a hero and who's a villain. We create stars and destroy reputations.",
    alignment: 'neutral',
    morality: 'neutral',
    isPlayable: false,
    category: 'institution',
    canControlDistricts: false,
    startingReputation: 0,
    values: ['attention', 'stories', 'ratings', 'influence', 'access'],
    opposedTo: ['secrecy', 'boring_truth', 'being_controlled', 'censorship'],
    goals: [
      'shape public perception',
      'increase engagement',
      'control the story of the city',
      'gain access to powerful figures'
    ],
    responseThresholds: {
      hostile: -35,
      suspicious: -10,
      neutral: 0,
      friendly: 25,
      allied: 55
    },
    encounterLikelihood: 0.4,
    powerLevel: 2,
    territories: ['downtown', 'commercial_district', 'government_quarter'],
    resources: ['public_opinion', 'platforms', 'investigations', 'spin'],
    allies: ['civilian_population'],
    rivals: ['city_government'],
    enemies: ['nihilist_collective', 'syndicate'],
    recruitmentPitch: undefined,
    reputationDescriptors: {
      veryNegative: 'Public enemy - media crusade',
      negative: 'Bad press magnet',
      neutral: 'On the radar',
      positive: 'Favorable coverage',
      veryPositive: 'Media darling'
    }
  }
]

// Convenience subsets
export const playableFactions = factions.filter(f => f.isPlayable)
export const controllableFactions = factions.filter(f => f.canControlDistricts)
export const npcFactions = factions.filter(f => !f.isPlayable)

export function getFactionById(id: string): Faction | undefined {
  return factions.find(f => f.id === id)
}

export type FactionAttitudeLevel =
  | 'hostile'
  | 'suspicious'
  | 'neutral'
  | 'friendly'
  | 'allied'

export function getAttitudeLevel(
  faction: Faction,
  reputation: number
): FactionAttitudeLevel {
  const t = faction.responseThresholds
  if (reputation <= t.hostile) return 'hostile'
  if (reputation <= t.suspicious) return 'suspicious'
  if (reputation <= t.neutral) return 'neutral'
  if (reputation <= t.friendly) return 'friendly'
  return 'allied'
}

export function getReputationDescriptor(
  faction: Faction,
  reputation: number
): string {
  const d = faction.reputationDescriptors
  if (reputation <= -60) return d.veryNegative
  if (reputation <= -20) return d.negative
  if (reputation < 20) return d.neutral
  if (reputation < 60) return d.positive
  return d.veryPositive
}

export type PlayerFactionReputation = {
  factionId: string
  reputation: number
  attitudeLevel: FactionAttitudeLevel
  descriptor: string
}

export function getPlayerFactionStatus(
  factionId: string,
  reputation: number
): PlayerFactionReputation {
  const faction = getFactionById(factionId)
  if (!faction) {
    throw new Error(`Faction ${factionId} not found`)
  }

  return {
    factionId,
    reputation,
    attitudeLevel: getAttitudeLevel(faction, reputation),
    descriptor: getReputationDescriptor(faction, reputation)
  }
}

/**
 * Calculate cascading reputation changes when a faction's reputation changes.
 * Allied factions gain a fraction of positive changes.
 * Enemy factions lose reputation when you gain with their enemies.
 *
 * @param faction - The faction whose reputation changed
 * @param change - The raw reputation change amount
 * @param currentReputations - Current reputation values by faction ID
 * @returns Record of faction IDs to their cascade change amounts
 */
export function calculateReputationImpact(
  faction: Faction,
  change: number,
  _currentReputations: Record<string, number>
): Record<string, number> {
  const cascadeChanges: Record<string, number> = {}

  // Always include the direct change
  cascadeChanges[faction.id] = change

  // Cascade multipliers
  const ALLY_MULTIPLIER = 0.25 // Allies get 25% of positive changes
  const RIVAL_MULTIPLIER = -0.15 // Rivals get inverse 15% of changes
  const ENEMY_MULTIPLIER = -0.25 // Enemies get inverse 25% of changes

  // Positive reputation change: allies benefit slightly
  if (change > 0) {
    for (const allyId of faction.allies) {
      const ally = getFactionById(allyId)
      if (ally) {
        const allyChange = Math.round(change * ALLY_MULTIPLIER)
        if (allyChange !== 0) {
          cascadeChanges[allyId] = (cascadeChanges[allyId] || 0) + allyChange
        }
      }
    }
  }

  // Any change affects rivals inversely (smaller effect)
  for (const rivalId of faction.rivals) {
    const rival = getFactionById(rivalId)
    if (rival) {
      const rivalChange = Math.round(change * RIVAL_MULTIPLIER)
      if (rivalChange !== 0) {
        cascadeChanges[rivalId] = (cascadeChanges[rivalId] || 0) + rivalChange
      }
    }
  }

  // Any change affects enemies inversely (larger effect)
  for (const enemyId of faction.enemies) {
    const enemy = getFactionById(enemyId)
    if (enemy) {
      const enemyChange = Math.round(change * ENEMY_MULTIPLIER)
      if (enemyChange !== 0) {
        cascadeChanges[enemyId] = (cascadeChanges[enemyId] || 0) + enemyChange
      }
    }
  }

  return cascadeChanges
}
