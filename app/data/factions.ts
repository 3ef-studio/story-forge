// data/factions.ts

export type FactionAlignment = 'lawful' | 'neutral' | 'chaotic'
export type FactionMorality = 'good' | 'neutral' | 'evil'

export type Faction = {
  id: string
  name: string
  shortName: string // For UI display
  description: string
  ideology: string // Core beliefs - for AI context
  
  // Alignment system
  alignment: FactionAlignment
  morality: FactionMorality
  
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
    description: 'The city\'s law enforcement trying to maintain order in an age of powered individuals',
    ideology: 'Uphold the law, protect citizens, maintain civil order. Deeply conflicted about vigilantes - grateful for help but concerned about accountability.',
    alignment: 'lawful',
    morality: 'good',
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
    recruitmentPitch: 'Work with us officially. Get a badge, follow the rules, and we can do real good together.',
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
    description: 'Organized crime network that has adapted to the age of powers, recruiting powered enforcers',
    ideology: 'Power and profit above all. Laws are for the weak. The strong take what they want.',
    alignment: 'chaotic',
    morality: 'evil',
    startingReputation: 0,
    values: [
      'profit',
      'power',
      'loyalty to the organization',
      'fear and respect',
      'territory control'
    ],
    opposedTo: ['law_enforcement', 'heroes', 'rival_gangs', 'snitches'],
    goals: [
      'expand criminal empire',
      'control powered individuals',
      'eliminate competition',
      'corrupt officials'
    ],
    responseThresholds: {
      hostile: -30,
      suspicious: -10,
      neutral: 10,
      friendly: 40,
      allied: 70
    },
    encounterLikelihood: 0.6,
    powerLevel: 6,
    territories: ['industrial_district', 'docks', 'red_light_district', 'slums'],
    resources: ['money', 'weapons', 'safe_houses', 'informants', 'black_market'],
    allies: ['black_market'],
    rivals: ['street_gangs', 'metro_police'],
    enemies: ['metro_police', 'guardian_initiative'],
    recruitmentPitch: 'You got power. We got money and connections. Together we can own this city.',
    reputationDescriptors: {
      veryNegative: 'Traitor - marked for death',
      negative: 'Problem - needs handling',
      neutral: 'Unknown variable',
      positive: 'Useful asset',
      veryPositive: 'Made member - one of us'
    }
  },

  {
    id: 'guardian_initiative',
    name: 'The Guardian Initiative',
    shortName: 'Guardians',
    description: 'Government-sanctioned superhero team with official authority and resources',
    ideology: 'With great power comes great responsibility. We use our gifts to protect those who cannot protect themselves, operating within the law.',
    alignment: 'lawful',
    morality: 'good',
    startingReputation: 0,
    values: [
      'heroism',
      'self-sacrifice',
      'teamwork',
      'public service',
      'oversight and accountability'
    ],
    opposedTo: ['vigilantism', 'villain_organizations', 'chaos', 'abuse_of_power'],
    goals: [
      'respond to major threats',
      'mentor new heroes',
      'maintain public trust in powered individuals',
      'prevent powered conflicts'
    ],
    responseThresholds: {
      hostile: -50,
      suspicious: -20,
      neutral: 0,
      friendly: 35,
      allied: 65
    },
    encounterLikelihood: 0.4,
    powerLevel: 8,
    territories: ['city_center', 'guardian_hq', 'public_events'],
    resources: ['advanced_tech', 'government_backing', 'training_facilities', 'intel_network'],
    allies: ['metro_police', 'city_government'],
    rivals: ['vigilante_network'],
    enemies: ['syndicate', 'nihilist_collective'],
    recruitmentPitch: 'You have potential. Train with us, join the team, become a real hero.',
    reputationDescriptors: {
      veryNegative: 'Villain - priority threat',
      negative: 'Dangerous individual - monitoring',
      neutral: 'Unaffiliated powered person',
      positive: 'Potential recruit - promising',
      veryPositive: 'Guardian member - trusted ally'
    }
  },

  {
    id: 'vigilante_network',
    name: 'The Vigilante Network',
    shortName: 'Vigilantes',
    description: 'Loose collective of independent heroes who reject official oversight',
    ideology: 'The system is too slow, too corrupt. Real justice requires getting your hands dirty. No badges, no bureaucracy, just results.',
    alignment: 'chaotic',
    morality: 'good',
    startingReputation: 10,
    values: [
      'street justice',
      'protecting the little guy',
      'independence',
      'direct action',
      'freedom from oversight'
    ],
    opposedTo: ['government_control', 'corruption', 'organized_crime', 'bureaucracy'],
    goals: [
      'protect neighborhoods directly',
      'fight crime without red tape',
      'expose corruption',
      'maintain independence'
    ],
    responseThresholds: {
      hostile: -40,
      suspicious: -10,
      neutral: 5,
      friendly: 25,
      allied: 55
    },
    encounterLikelihood: 0.5,
    powerLevel: 5,
    territories: ['slums', 'residential_areas', 'subway_system', 'rooftops'],
    resources: ['local_knowledge', 'safe_houses', 'community_support', 'guerrilla_tactics'],
    allies: ['civilian_population'],
    rivals: ['guardian_initiative', 'metro_police'],
    enemies: ['syndicate', 'corrupt_officials'],
    recruitmentPitch: 'The badges and the official "heroes" don\'t care about these streets. But we do. Join us.',
    reputationDescriptors: {
      veryNegative: 'Sellout - not welcome here',
      negative: 'Suspicious - probably a plant',
      neutral: 'New face on the streets',
      positive: 'Good people - one of us',
      veryPositive: 'Street legend - respected ally'
    }
  },

  {
    id: 'civilian_population',
    name: 'Civilian Population',
    shortName: 'Civilians',
    description: 'Ordinary citizens trying to live their lives amid powered conflicts',
    ideology: 'We just want to be safe. Some powered people help us, some hurt us. We remember both.',
    alignment: 'neutral',
    morality: 'neutral',
    startingReputation: 0,
    values: [
      'personal safety',
      'family protection',
      'normal life',
      'peace and stability'
    ],
    opposedTo: ['collateral_damage', 'powered_conflicts', 'fear', 'chaos'],
    goals: [
      'survive',
      'protect loved ones',
      'return to normalcy',
      'feel safe again'
    ],
    responseThresholds: {
      hostile: -60,
      suspicious: -25,
      neutral: 0,
      friendly: 25,
      allied: 60
    },
    encounterLikelihood: 0.8,
    powerLevel: 1,
    territories: ['everywhere'],
    resources: ['information', 'shelter', 'gratitude', 'votes'],
    allies: [],
    rivals: [],
    enemies: [],
    recruitmentPitch: 'Please... just keep us safe.',
    reputationDescriptors: {
      veryNegative: 'Menace - feared and hated',
      negative: 'Dangerous - avoid if possible',
      neutral: 'Unknown powered individual',
      positive: 'Hero - thanked and praised',
      veryPositive: 'Beloved protector - celebrated'
    }
  },

  {
    id: 'black_market',
    name: 'Black Market Network',
    shortName: 'Black Market',
    description: 'Underground traders dealing in powered-related goods, tech, and information',
    ideology: 'Everything has a price. No questions asked, no judgment passed. We provide what others won\'t.',
    alignment: 'neutral',
    morality: 'neutral',
    startingReputation: 0,
    values: [
      'profit',
      'discretion',
      'neutrality',
      'customer service',
      'information brokering'
    ],
    opposedTo: ['law_enforcement_raids', 'competition', 'snitches', 'price_undercutting'],
    goals: [
      'maximize profit',
      'maintain secrecy',
      'expand network',
      'avoid major heat'
    ],
    responseThresholds: {
      hostile: -50,
      suspicious: -15,
      neutral: 0,
      friendly: 30,
      allied: 65
    },
    encounterLikelihood: 0.3,
    powerLevel: 3,
    territories: ['underground_markets', 'docks', 'hidden_locations'],
    resources: ['rare_items', 'intel', 'connections', 'tech', 'contraband'],
    allies: ['syndicate'],
    rivals: ['metro_police'],
    enemies: [],
    recruitmentPitch: 'You need something? We got it. You got something? We\'ll buy it. Simple business.',
    reputationDescriptors: {
      veryNegative: 'Blacklisted - no service',
      negative: 'Risky customer - cash upfront',
      neutral: 'Potential customer',
      positive: 'Valued client - special access',
      veryPositive: 'VIP - exclusive deals'
    }
  },

  {
    id: 'nihilist_collective',
    name: 'The Nihilist Collective',
    shortName: 'Nihilists',
    description: 'Powered individuals who believe the old world must burn for a new one to rise',
    ideology: 'Society is a lie. Laws are chains. We will tear it all down and rebuild from the ashes. Chaos is the only truth.',
    alignment: 'chaotic',
    morality: 'evil',
    startingReputation: -20,
    values: [
      'destruction of the old order',
      'absolute freedom',
      'chaos as liberation',
      'power without restraint',
      'philosophical purity'
    ],
    opposedTo: ['all_authority', 'structure', 'society', 'rules', 'peace'],
    goals: [
      'destabilize society',
      'recruit disillusioned powered individuals',
      'perform spectacular attacks',
      'prove superiority of chaos'
    ],
    responseThresholds: {
      hostile: -20,
      suspicious: 0,
      neutral: 20,
      friendly: 50,
      allied: 80
    },
    encounterLikelihood: 0.3,
    powerLevel: 7,
    territories: ['abandoned_areas', 'ruins', 'underground', 'chaos_zones'],
    resources: ['ideology', 'fearlessness', 'unpredictability', 'powerful_members'],
    allies: [],
    rivals: ['everyone'],
    enemies: ['guardian_initiative', 'metro_police', 'city_government', 'syndicate'],
    recruitmentPitch: 'You feel it too, don\'t you? The chains. The lies. Join us and be truly free.',
    reputationDescriptors: {
      veryNegative: 'Slave to the system - pathetic',
      negative: 'Still shackled - disappointing',
      neutral: 'Potential for awakening',
      positive: 'Seeing the truth - promising',
      veryPositive: 'Enlightened - one of us'
    }
  },

  {
    id: 'city_government',
    name: 'City Government',
    shortName: 'City Hall',
    description: 'Political leadership struggling to maintain control in the powered age',
    ideology: 'We must balance public safety with civil liberties, manage powered individuals without persecution, and maintain order without tyranny.',
    alignment: 'lawful',
    morality: 'neutral',
    startingReputation: 0,
    values: [
      'political stability',
      'public safety',
      'economic prosperity',
      're-election',
      'managing powered individuals'
    ],
    opposedTo: ['anarchy', 'uncontrolled_powered_activity', 'negative_publicity', 'riots'],
    goals: [
      'regulate powered individuals',
      'maintain public confidence',
      'prevent disasters',
      'stay in power'
    ],
    responseThresholds: {
      hostile: -45,
      suspicious: -20,
      neutral: 0,
      friendly: 35,
      allied: 70
    },
    encounterLikelihood: 0.2,
    powerLevel: 2,
    territories: ['government_quarter', 'city_hall', 'official_events'],
    resources: ['legal_authority', 'budgets', 'policies', 'media_access', 'bureaucracy'],
    allies: ['metro_police', 'guardian_initiative'],
    rivals: ['vigilante_network'],
    enemies: ['nihilist_collective', 'syndicate'],
    recruitmentPitch: 'We need someone like you working with us, not against us. Official sanction, resources, legitimacy.',
    reputationDescriptors: {
      veryNegative: 'Public enemy - wanted',
      negative: 'Problematic individual - under investigation',
      neutral: 'Unregistered powered citizen',
      positive: 'Cooperative asset - valued',
      veryPositive: 'Official hero - city resource'
    }
  },

  {
    id: 'street_gangs',
    name: 'Street Gangs',
    shortName: 'Gangs',
    description: 'Small-time criminals trying to survive while bigger players fight above them',
    ideology: 'This is our turf. We take care of our own. The Syndicate wants to control us, cops want to arrest us, heroes ignore us.',
    alignment: 'chaotic',
    morality: 'neutral',
    startingReputation: 0,
    values: [
      'territory',
      'respect',
      'survival',
      'independence',
      'street code'
    ],
    opposedTo: ['syndicate_control', 'police', 'outsiders', 'disrespect'],
    goals: [
      'control territory',
      'make money',
      'resist Syndicate takeover',
      'survive'
    ],
    responseThresholds: {
      hostile: -35,
      suspicious: -10,
      neutral: 5,
      friendly: 30,
      allied: 60
    },
    encounterLikelihood: 0.6,
    powerLevel: 3,
    territories: ['slums', 'specific_neighborhoods', 'back_alleys', 'gang_territory'],
    resources: ['local_knowledge', 'numbers', 'desperation', 'street_contacts'],
    allies: [],
    rivals: ['syndicate', 'other_gangs'],
    enemies: ['metro_police'],
    recruitmentPitch: 'You help us, we help you. Simple as that. These streets respect power.',
    reputationDescriptors: {
      veryNegative: 'Enemy - kill on sight',
      negative: 'Not welcome here - get lost',
      neutral: 'Outsider - prove yourself',
      positive: 'Cool with us - got our back',
      veryPositive: 'One of us - family'
    }
  },

  {
    id: 'media_corporations',
    name: 'Media Corporations',
    shortName: 'The Media',
    description: 'News networks and social media companies that shape public perception of powered individuals',
    ideology: 'The narrative is power. We decide who\'s a hero and who\'s a villain. We create stars and destroy reputations.',
    alignment: 'neutral',
    morality: 'neutral',
    startingReputation: 0,
    values: [
      'ratings',
      'narratives',
      'exclusives',
      'influence',
      'sensationalism'
    ],
    opposedTo: ['boring_stories', 'media_blackouts', 'competition', 'obscurity'],
    goals: [
      'get the story',
      'shape public opinion',
      'maximize viewership',
      'maintain access'
    ],
    responseThresholds: {
      hostile: -40,
      suspicious: -15,
      neutral: 0,
      friendly: 25,
      allied: 55
    },
    encounterLikelihood: 0.4,
    powerLevel: 2,
    territories: ['everywhere_with_cameras', 'media_hq', 'major_events'],
    resources: ['publicity', 'narrative_control', 'information', 'cameras'],
    allies: ['city_government'],
    rivals: ['anyone_avoiding_publicity'],
    enemies: [],
    recruitmentPitch: 'An exclusive interview. Your side of the story. We can make you a household name.',
    reputationDescriptors: {
      veryNegative: 'Villain - we made you infamous',
      negative: 'Controversial figure - ratings gold',
      neutral: 'Unknown - not newsworthy yet',
      positive: 'Rising star - cover story material',
      veryPositive: 'Beloved icon - ratings gold'
    }
  }
]

// === HELPER FUNCTIONS ===

export function getFactionById(id: string): Faction | undefined {
  return factions.find(f => f.id === id)
}

export function getFactionsByAlignment(alignment: FactionAlignment): Faction[] {
  return factions.filter(f => f.alignment === alignment)
}

export function getFactionsByMorality(morality: FactionMorality): Faction[] {
  return factions.filter(f => f.morality === morality)
}

export function getAttitudeLevel(faction: Faction, reputation: number): string {
  if (reputation <= faction.responseThresholds.hostile) return 'hostile'
  if (reputation <= faction.responseThresholds.suspicious) return 'suspicious'
  if (reputation <= faction.responseThresholds.neutral) return 'neutral'
  if (reputation <= faction.responseThresholds.friendly) return 'friendly'
  return 'allied'
}

export function getReputationDescriptor(faction: Faction, reputation: number): string {
  if (reputation <= -60) return faction.reputationDescriptors.veryNegative
  if (reputation <= -20) return faction.reputationDescriptors.negative
  if (reputation <= 19) return faction.reputationDescriptors.neutral
  if (reputation <= 59) return faction.reputationDescriptors.positive
  return faction.reputationDescriptors.veryPositive
}

export function getFactionsInTerritory(territory: string): Faction[] {
  return factions.filter(f => 
    f.territories.includes(territory) || f.territories.includes('everywhere')
  )
}

export function getHostileFactions(playerReputations: Record<string, number>): Faction[] {
  return factions.filter(f => {
    const rep = playerReputations[f.id] || 0
    return rep <= f.responseThresholds.hostile
  })
}

export function getFriendlyFactions(playerReputations: Record<string, number>): Faction[] {
  return factions.filter(f => {
    const rep = playerReputations[f.id] || f.startingReputation
    return rep >= f.responseThresholds.friendly
  })
}

export function getConflictingFactions(faction: Faction): Faction[] {
  const conflictIds = [...faction.rivals, ...faction.enemies]
  return factions.filter(f => conflictIds.includes(f.id))
}

export function getAlliedFactions(faction: Faction): Faction[] {
  return factions.filter(f => faction.allies.includes(f.id))
}

export function calculateReputationImpact(
  baseFaction: Faction,
  reputationChange: number,
  allReputations: Record<string, number>
): Record<string, number> {
  const impacts: Record<string, number> = {
    [baseFaction.id]: reputationChange
  }
  
  // Allied factions get 25% of positive changes
  if (reputationChange > 0) {
    baseFaction.allies.forEach(allyId => {
      impacts[allyId] = Math.floor(reputationChange * 0.25)
    })
  }
  
  // Enemy factions get opposite reaction (50% inverse)
  baseFaction.enemies.forEach(enemyId => {
    impacts[enemyId] = Math.floor(reputationChange * -0.5)
  })
  
  // Rival factions get smaller opposite reaction (25% inverse)
  baseFaction.rivals.forEach(rivalId => {
    impacts[rivalId] = Math.floor(reputationChange * -0.25)
  })
  
  return impacts
}

export type PlayerFactionReputation = {
  factionId: string
  reputation: number
  attitudeLevel: string
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