// data/goals.ts
// Goal definitions catalog for character objectives

export type GoalType =
  | 'action_count'
  | 'category_count'
  | 'location_count'
  | 'faction_rep_gain'
  | 'encounter_win_count'
  | 'power_use_count'

export type GoalMetadata = {
  actionId?: string
  category?: string
  location?: string
  factionId?: string
  powerId?: string
}

export type GoalDefinition = {
  id: string
  goalType: GoalType
  titleTemplate: string
  descriptionTemplate: string
  targetValue: number
  xpReward: number
  metadata: GoalMetadata
}

// Goal catalog - deterministic templates
export const goalDefinitions: GoalDefinition[] = [
  // === ACTION COUNT GOALS ===
  {
    id: 'patrol_downtown_3',
    goalType: 'action_count',
    titleTemplate: 'Street Sentinel',
    descriptionTemplate: 'Patrol the city 3 times to establish your presence',
    targetValue: 3,
    xpReward: 50,
    metadata: { actionId: 'patrol' },
  },
  {
    id: 'respond_emergency_2',
    goalType: 'action_count',
    titleTemplate: 'First Responder',
    descriptionTemplate: 'Respond to 2 emergency situations',
    targetValue: 2,
    xpReward: 75,
    metadata: { actionId: 'respond_to_emergency' },
  },

  // === CATEGORY COUNT GOALS ===
  {
    id: 'heroic_actions_5',
    goalType: 'category_count',
    titleTemplate: 'Rising Hero',
    descriptionTemplate: 'Complete 5 heroic actions',
    targetValue: 5,
    xpReward: 100,
    metadata: { category: 'heroic' },
  },
  {
    id: 'criminal_actions_3',
    goalType: 'category_count',
    titleTemplate: 'Life of Crime',
    descriptionTemplate: 'Complete 3 criminal actions',
    targetValue: 3,
    xpReward: 75,
    metadata: { category: 'criminal' },
  },
  {
    id: 'training_actions_4',
    goalType: 'category_count',
    titleTemplate: 'Dedicated Student',
    descriptionTemplate: 'Complete 4 training actions',
    targetValue: 4,
    xpReward: 80,
    metadata: { category: 'training' },
  },
  {
    id: 'social_actions_3',
    goalType: 'category_count',
    titleTemplate: 'People Person',
    descriptionTemplate: 'Complete 3 social actions',
    targetValue: 3,
    xpReward: 60,
    metadata: { category: 'social' },
  },

  // === LOCATION COUNT GOALS ===
  {
    id: 'visit_downtown_4',
    goalType: 'location_count',
    titleTemplate: 'City Center Regular',
    descriptionTemplate: 'Take 4 actions in downtown areas',
    targetValue: 4,
    xpReward: 50,
    metadata: { location: 'downtown' },
  },
  {
    id: 'visit_slums_3',
    goalType: 'location_count',
    titleTemplate: 'Slum Savior',
    descriptionTemplate: 'Take 3 actions in the slums',
    targetValue: 3,
    xpReward: 60,
    metadata: { location: 'slums' },
  },

  // === FACTION REPUTATION GOALS ===
  {
    id: 'gain_police_rep_15',
    goalType: 'faction_rep_gain',
    titleTemplate: 'Friend of the Force',
    descriptionTemplate: 'Gain 15 reputation with Metro Police',
    targetValue: 15,
    xpReward: 75,
    metadata: { factionId: 'metro_police' },
  },
  {
    id: 'gain_civilian_rep_20',
    goalType: 'faction_rep_gain',
    titleTemplate: 'People\'s Champion',
    descriptionTemplate: 'Gain 20 reputation with civilians',
    targetValue: 20,
    xpReward: 80,
    metadata: { factionId: 'civilian_population' },
  },
  {
    id: 'gain_vigilante_rep_15',
    goalType: 'faction_rep_gain',
    titleTemplate: 'One of Us',
    descriptionTemplate: 'Gain 15 reputation with the Vigilante Network',
    targetValue: 15,
    xpReward: 70,
    metadata: { factionId: 'vigilante_network' },
  },
  {
    id: 'gain_syndicate_rep_15',
    goalType: 'faction_rep_gain',
    titleTemplate: 'Making Connections',
    descriptionTemplate: 'Gain 15 reputation with the Syndicate',
    targetValue: 15,
    xpReward: 70,
    metadata: { factionId: 'syndicate' },
  },
  {
    id: 'gain_guardian_rep_15',
    goalType: 'faction_rep_gain',
    titleTemplate: 'Guardian Material',
    descriptionTemplate: 'Gain 15 reputation with the Guardian Initiative',
    targetValue: 15,
    xpReward: 75,
    metadata: { factionId: 'guardian_initiative' },
  },

  // === ENCOUNTER WIN GOALS ===
  {
    id: 'win_encounters_3',
    goalType: 'encounter_win_count',
    titleTemplate: 'Proving Yourself',
    descriptionTemplate: 'Win 3 encounters',
    targetValue: 3,
    xpReward: 60,
    metadata: {},
  },
  {
    id: 'win_encounters_5',
    goalType: 'encounter_win_count',
    titleTemplate: 'Battle Tested',
    descriptionTemplate: 'Win 5 encounters',
    targetValue: 5,
    xpReward: 100,
    metadata: {},
  },

  // === POWER USE GOALS ===
  {
    id: 'use_telepathy_3',
    goalType: 'power_use_count',
    titleTemplate: 'Mind Reader',
    descriptionTemplate: 'Use Telepathy in 3 encounters',
    targetValue: 3,
    xpReward: 50,
    metadata: { powerId: 'telepathy' },
  },
  {
    id: 'use_telekinesis_3',
    goalType: 'power_use_count',
    titleTemplate: 'Moving with Your Mind',
    descriptionTemplate: 'Use Telekinesis in 3 encounters',
    targetValue: 3,
    xpReward: 50,
    metadata: { powerId: 'telekinesis' },
  },
  {
    id: 'use_precognition_3',
    goalType: 'power_use_count',
    titleTemplate: 'Seeing Ahead',
    descriptionTemplate: 'Use Precognition in 3 encounters',
    targetValue: 3,
    xpReward: 50,
    metadata: { powerId: 'precognition' },
  },
  {
    id: 'use_healing_3',
    goalType: 'power_use_count',
    titleTemplate: 'Healer\'s Touch',
    descriptionTemplate: 'Use Healing in 3 encounters',
    targetValue: 3,
    xpReward: 50,
    metadata: { powerId: 'healing' },
  },
  {
    id: 'use_shapeshifting_3',
    goalType: 'power_use_count',
    titleTemplate: 'Many Faces',
    descriptionTemplate: 'Use Shapeshifting in 3 encounters',
    targetValue: 3,
    xpReward: 50,
    metadata: { powerId: 'shapeshifting' },
  },
  {
    id: 'use_super_strength_3',
    goalType: 'power_use_count',
    titleTemplate: 'Show of Strength',
    descriptionTemplate: 'Use Super Strength in 3 encounters',
    targetValue: 3,
    xpReward: 50,
    metadata: { powerId: 'super_strength' },
  },
  {
    id: 'use_enhanced_durability_3',
    goalType: 'power_use_count',
    titleTemplate: 'Taking the Hits',
    descriptionTemplate: 'Use Enhanced Durability in 3 encounters',
    targetValue: 3,
    xpReward: 50,
    metadata: { powerId: 'enhanced_durability' },
  },
  {
    id: 'use_flight_3',
    goalType: 'power_use_count',
    titleTemplate: 'Taking to the Skies',
    descriptionTemplate: 'Use Flight in 3 encounters',
    targetValue: 3,
    xpReward: 50,
    metadata: { powerId: 'flight' },
  },
  {
    id: 'use_force_field_3',
    goalType: 'power_use_count',
    titleTemplate: 'Shield Bearer',
    descriptionTemplate: 'Use Force Field in 3 encounters',
    targetValue: 3,
    xpReward: 50,
    metadata: { powerId: 'force_field' },
  },
]

// Helper to get goal definition by ID
export function getGoalDefinitionById(id: string): GoalDefinition | undefined {
  return goalDefinitions.find(g => g.id === id)
}

// Get goals by type
export function getGoalsByType(goalType: GoalType): GoalDefinition[] {
  return goalDefinitions.filter(g => g.goalType === goalType)
}
