// data/attributes.ts

export type Attribute = {
  id: string
  name: string
  description: string
  baseValue: number // Starting value for new characters (1-100 scale)
  
  // How this attribute grows
  growthTriggers: string[] // Actions/events that can increase this
  growthRate: number // Multiplier for XP gains (0.5 = slow, 1.0 = normal, 2.0 = fast)
  
  // Narrative impact - helps AI understand what this affects
  influencesNarrative: string[] // Story elements this attribute affects
  
  // Mechanical impact
  affectsCombat: boolean
  combatMultiplier?: number // If affects combat, how much (1.0 = normal)
}

export const attributes: Attribute[] = [
  {
    id: 'strength',
    name: 'Strength',
    description: 'Physical power and raw force',
    baseValue: 10,
    growthTriggers: [
      'combat_victory',
      'physical_challenge',
      'power_use:super_strength',
      'intimidation_success',
      'heavy_lifting'
    ],
    growthRate: 1.0,
    influencesNarrative: [
      'intimidation',
      'physical_damage',
      'breaking_objects',
      'rescue_capability',
      'crowd_control'
    ],
    affectsCombat: true,
    combatMultiplier: 1.5
  },
  
  {
    id: 'agility',
    name: 'Agility',
    description: 'Speed, reflexes, and coordination',
    baseValue: 10,
    growthTriggers: [
      'dodge_success',
      'chase_sequence',
      'power_use:super_speed',
      'acrobatic_maneuver',
      'stealth_success'
    ],
    growthRate: 1.0,
    influencesNarrative: [
      'evasion',
      'pursuit',
      'stealth',
      'first_strike',
      'escape_ability'
    ],
    affectsCombat: true,
    combatMultiplier: 1.3
  },
  
  {
    id: 'intelligence',
    name: 'Intelligence',
    description: 'Problem-solving, tactics, and knowledge',
    baseValue: 10,
    growthTriggers: [
      'investigation_success',
      'tactical_victory',
      'puzzle_solved',
      'research_completed',
      'trap_detected'
    ],
    growthRate: 0.8,
    influencesNarrative: [
      'deduction',
      'planning',
      'tech_interaction',
      'weakness_detection',
      'strategy'
    ],
    affectsCombat: true,
    combatMultiplier: 1.2
  },
  
  {
    id: 'charisma',
    name: 'Charisma',
    description: 'Leadership, persuasion, and social influence',
    baseValue: 10,
    growthTriggers: [
      'successful_persuasion',
      'leadership_moment',
      'public_approval',
      'ally_recruited',
      'negotiation_win'
    ],
    growthRate: 0.7,
    influencesNarrative: [
      'negotiation',
      'ally_recruitment',
      'public_perception',
      'leadership',
      'intimidation_alternative'
    ],
    affectsCombat: false
  },
  
  {
    id: 'willpower',
    name: 'Willpower',
    description: 'Mental fortitude and resistance to control',
    baseValue: 10,
    growthTriggers: [
      'resist_mental_attack',
      'overcome_fear',
      'power_use:telepathy',
      'continue_despite_injury',
      'resist_temptation'
    ],
    growthRate: 0.6,
    influencesNarrative: [
      'mental_resistance',
      'fear_immunity',
      'determination',
      'power_control',
      'corruption_resistance'
    ],
    affectsCombat: true,
    combatMultiplier: 1.1
  },
  
  {
    id: 'perception',
    name: 'Perception',
    description: 'Awareness and ability to notice details',
    baseValue: 10,
    growthTriggers: [
      'patrol_action',
      'ambush_detected',
      'clue_discovered',
      'trap_avoided',
      'surveillance_success'
    ],
    growthRate: 0.8,
    influencesNarrative: [
      'ambush_detection',
      'clue_finding',
      'danger_sense',
      'tracking',
      'investigation'
    ],
    affectsCombat: true,
    combatMultiplier: 1.15
  },
  
  {
    id: 'endurance',
    name: 'Endurance',
    description: 'Stamina and ability to sustain effort',
    baseValue: 10,
    growthTriggers: [
      'prolonged_combat',
      'survive_heavy_damage',
      'marathon_action',
      'resist_exhaustion',
      'power_overuse'
    ],
    growthRate: 1.0,
    influencesNarrative: [
      'sustained_activity',
      'damage_resistance',
      'recovery_speed',
      'fatigue_resistance',
      'survival'
    ],
    affectsCombat: true,
    combatMultiplier: 1.4
  },
  
  {
    id: 'stealth',
    name: 'Stealth',
    description: 'Ability to remain undetected',
    baseValue: 10,
    growthTriggers: [
      'stealth_success',
      'infiltration',
      'power_use:invisibility',
      'avoid_detection',
      'shadow_movement'
    ],
    growthRate: 0.9,
    influencesNarrative: [
      'infiltration',
      'surprise_attack',
      'escape',
      'observation',
      'ambush_setup'
    ],
    affectsCombat: true,
    combatMultiplier: 1.25
  },
  
  {
    id: 'reputation',
    name: 'Reputation',
    description: 'How well-known and respected you are',
    baseValue: 0,
    growthTriggers: [
      'public_heroics',
      'media_coverage',
      'major_victory',
      'civilian_rescue',
      'faction_milestone'
    ],
    growthRate: 1.2,
    influencesNarrative: [
      'recognition',
      'civilian_reaction',
      'media_attention',
      'recruitment_offers',
      'villain_targeting'
    ],
    affectsCombat: false
  },
  
  {
    id: 'notoriety',
    name: 'Notoriety',
    description: 'How infamous and feared you are',
    baseValue: 0,
    growthTriggers: [
      'public_crime',
      'violence',
      'villain_action',
      'terror_tactics',
      'faction_opposition'
    ],
    growthRate: 1.2,
    influencesNarrative: [
      'fear_factor',
      'villain_respect',
      'law_enforcement_response',
      'civilian_fear',
      'criminal_recruitment'
    ],
    affectsCombat: true,
    combatMultiplier: 1.1
  }
]

// Helper functions

export function getAttributeById(id: string): Attribute | undefined {
  return attributes.find(attr => attr.id === id)
}

export function getAttributesByCategory(affectsCombat: boolean): Attribute[] {
  return attributes.filter(attr => attr.affectsCombat === affectsCombat)
}

export function calculateAttributeGrowth(
  currentValue: number,
  growthRate: number,
  baseXP: number
): number {
  // Returns new attribute value after growth
  const xpGain = baseXP * growthRate
  const increment = Math.floor(xpGain / 10) // Every 10 XP = 1 attribute point
  return Math.min(100, currentValue + increment) // Cap at 100
}

export function getAttributeModifier(value: number): number {
  // Converts 1-100 value to a modifier for calculations
  // 1-20 = -2, 21-40 = -1, 41-60 = 0, 61-80 = +1, 81-100 = +2
  if (value <= 20) return -2
  if (value <= 40) return -1
  if (value <= 60) return 0
  if (value <= 80) return 1
  return 2
}

export type PlayerAttributes = {
  [key: string]: number // Maps attribute ID to current value
}

export function initializePlayerAttributes(): PlayerAttributes {
  const attrs: PlayerAttributes = {}
  attributes.forEach(attr => {
    attrs[attr.id] = attr.baseValue
  })
  return attrs
}