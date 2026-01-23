// data/powers.ts

export type PowerCategory = 'physical' | 'mental' | 'energy' | 'utility' | 'defensive'

export type Power = {
  id: string
  name: string
  description: string
  category: PowerCategory
  
  // Starting stats
  baseLevel: number // Always starts at 1
  baseCombatEffectiveness: number // 1-100, starting combat power
  energyCost: number // Cost per use
  
  // Leveling
  maxLevel: number
  xpToNextLevel: number // Base XP needed (scales with level)
  levelScaling: number // Multiplier for combat effectiveness per level
  
  // Narrative hooks for AI generation
  narrativeStrengths: string[] // What this power is good for in stories
  narrativeWeaknesses: string[] // What this power struggles with
  visualDescription: string // How it looks when used (for flavor text)
  
  // Unlock requirements
  unlockRequirements?: {
    level?: number // Character level needed
    attributeRequirement?: { attributeId: string, minValue: number }
    powerRequired?: string // Must have another power first
  }
  
  // Evolution
  evolvesInto?: string // Advanced version at max level
  
  // Special mechanics
  cooldownTurns?: number // Turns before can use again
  damageOverTime?: boolean // Does it have DOT effects
  areaEffect?: boolean // Affects multiple targets
  requiresLineOfSight?: boolean
}

export const powers: Power[] = [
  // === PHYSICAL CATEGORY ===
  {
    id: 'super_strength',
    name: 'Super Strength',
    description: 'Incredible physical power allowing you to lift massive objects and deliver devastating blows',
    category: 'physical',
    baseLevel: 1,
    baseCombatEffectiveness: 20,
    energyCost: 8,
    maxLevel: 10,
    xpToNextLevel: 100,
    levelScaling: 1.3,
    narrativeStrengths: [
      'direct combat',
      'breaking obstacles',
      'intimidation',
      'rescue (lifting debris)',
      'throwing objects',
      'crowd control'
    ],
    narrativeWeaknesses: [
      'subtlety',
      'stealth',
      'precision tasks',
      'ranged combat',
      'investigation'
    ],
    visualDescription: 'Muscles surge with power, objects crumple like paper',
    unlockRequirements: {
      attributeRequirement: { attributeId: 'strength', minValue: 15 }
    },
    evolvesInto: 'titan_strength'
  },

  {
    id: 'super_speed',
    name: 'Super Speed',
    description: 'Move at incredible velocities, making you a blur to normal eyes',
    category: 'physical',
    baseLevel: 1,
    baseCombatEffectiveness: 18,
    energyCost: 10,
    maxLevel: 10,
    xpToNextLevel: 100,
    levelScaling: 1.25,
    narrativeStrengths: [
      'evasion',
      'pursuit',
      'rapid strikes',
      'reconnaissance',
      'escape',
      'rescuing civilians quickly'
    ],
    narrativeWeaknesses: [
      'heavy objects',
      'confined spaces',
      'prolonged combat',
      'precision',
      'stealth (creates wind/noise)'
    ],
    visualDescription: 'A blur of motion, afterimages trailing behind',
    unlockRequirements: {
      attributeRequirement: { attributeId: 'agility', minValue: 20 }
    },
    evolvesInto: 'time_dilation'
  },

  {
    id: 'enhanced_durability',
    name: 'Enhanced Durability',
    description: 'Your body can withstand tremendous punishment',
    category: 'defensive',
    baseLevel: 1,
    baseCombatEffectiveness: 12,
    energyCost: 5,
    maxLevel: 10,
    xpToNextLevel: 120,
    levelScaling: 1.4,
    narrativeStrengths: [
      'tanking damage',
      'protecting others',
      'surviving falls',
      'enduring harsh environments',
      'blocking attacks'
    ],
    narrativeWeaknesses: [
      'offense',
      'mobility',
      'mental attacks',
      'prolonged battles of attrition'
    ],
    visualDescription: 'Attacks bounce off hardened skin, barely leaving a mark',
    unlockRequirements: {
      attributeRequirement: { attributeId: 'endurance', minValue: 15 }
    }
  },

  {
    id: 'wall_crawling',
    name: 'Wall Crawling',
    description: 'Stick to and climb any surface with ease',
    category: 'utility',
    baseLevel: 1,
    baseCombatEffectiveness: 8,
    energyCost: 4,
    maxLevel: 8,
    xpToNextLevel: 80,
    levelScaling: 1.1,
    narrativeStrengths: [
      'infiltration',
      'vertical mobility',
      'ambush positioning',
      'escape routes',
      'surveillance from above'
    ],
    narrativeWeaknesses: [
      'direct combat',
      'open terrain',
      'requires surfaces',
      'ranged attackers'
    ],
    visualDescription: 'Hands and feet adhere to surfaces defying gravity',
    unlockRequirements: {
      attributeRequirement: { attributeId: 'agility', minValue: 12 }
    }
  },

  // === MENTAL CATEGORY ===
  {
    id: 'telepathy',
    name: 'Telepathy',
    description: 'Read minds and communicate mentally',
    category: 'mental',
    baseLevel: 1,
    baseCombatEffectiveness: 10,
    energyCost: 12,
    maxLevel: 10,
    xpToNextLevel: 150,
    levelScaling: 1.2,
    narrativeStrengths: [
      'information gathering',
      'detecting lies',
      'mental communication',
      'understanding motives',
      'interrogation',
      'coordination with allies'
    ],
    narrativeWeaknesses: [
      'physical threats',
      'shielded minds',
      'combat situations',
      'ethical complications'
    ],
    visualDescription: 'Eyes glow faintly as thoughts flow into your mind',
    unlockRequirements: {
      attributeRequirement: { attributeId: 'intelligence', minValue: 18 }
    },
    requiresLineOfSight: true,
    evolvesInto: 'mind_control'
  },

  {
    id: 'telekinesis',
    name: 'Telekinesis',
    description: 'Move objects with your mind',
    category: 'mental',
    baseLevel: 1,
    baseCombatEffectiveness: 16,
    energyCost: 10,
    maxLevel: 10,
    xpToNextLevel: 130,
    levelScaling: 1.3,
    narrativeStrengths: [
      'ranged combat',
      'throwing objects',
      'creating barriers',
      'disarming opponents',
      'environmental manipulation',
      'crowd control'
    ],
    narrativeWeaknesses: [
      'close combat',
      'very heavy objects (at low levels)',
      'multiple simultaneous targets',
      'concentration required'
    ],
    visualDescription: 'Objects float and swirl, guided by invisible force',
    unlockRequirements: {
      attributeRequirement: { attributeId: 'intelligence', minValue: 15 }
    },
    requiresLineOfSight: true,
    areaEffect: true
  },

  {
    id: 'precognition',
    name: 'Precognition',
    description: 'Glimpse moments into the future',
    category: 'mental',
    baseLevel: 1,
    baseCombatEffectiveness: 14,
    energyCost: 15,
    maxLevel: 8,
    xpToNextLevel: 160,
    levelScaling: 1.15,
    narrativeStrengths: [
      'dodge attacks',
      'predict enemy movements',
      'avoid traps',
      'tactical advantage',
      'danger sense'
    ],
    narrativeWeaknesses: [
      'unreliable (flashes, not certainty)',
      'mentally taxing',
      'no offensive capability',
      'can be overwhelming'
    ],
    visualDescription: 'Time seems to stutter, showing glimpses of what\'s to come',
    unlockRequirements: {
      level: 3,
      attributeRequirement: { attributeId: 'perception', minValue: 20 }
    },
    cooldownTurns: 3
  },

  // === ENERGY CATEGORY ===
  {
    id: 'energy_blast',
    name: 'Energy Blast',
    description: 'Project devastating beams of pure energy',
    category: 'energy',
    baseLevel: 1,
    baseCombatEffectiveness: 22,
    energyCost: 12,
    maxLevel: 10,
    xpToNextLevel: 110,
    levelScaling: 1.35,
    narrativeStrengths: [
      'ranged damage',
      'destroying obstacles',
      'multiple targets',
      'intimidation',
      'explosive force'
    ],
    narrativeWeaknesses: [
      'close combat',
      'energy drain',
      'collateral damage',
      'friendly fire risk',
      'obvious/loud'
    ],
    visualDescription: 'Crackling energy builds then explodes outward in a brilliant beam',
    unlockRequirements: {
      attributeRequirement: { attributeId: 'willpower', minValue: 15 }
    },
    areaEffect: true,
    cooldownTurns: 1
  },

  {
    id: 'force_field',
    name: 'Force Field',
    description: 'Generate protective energy barriers',
    category: 'defensive',
    baseLevel: 1,
    baseCombatEffectiveness: 14,
    energyCost: 8,
    maxLevel: 10,
    xpToNextLevel: 120,
    levelScaling: 1.3,
    narrativeStrengths: [
      'protection',
      'shielding others',
      'blocking projectiles',
      'creating cover',
      'trapping enemies'
    ],
    narrativeWeaknesses: [
      'stationary (usually)',
      'drains energy over time',
      'no offensive power',
      'can be flanked'
    ],
    visualDescription: 'Shimmering translucent barrier materializes in the air',
    unlockRequirements: {
      attributeRequirement: { attributeId: 'willpower', minValue: 12 }
    }
  },

  {
    id: 'electricity_manipulation',
    name: 'Electricity Manipulation',
    description: 'Control and generate electrical currents',
    category: 'energy',
    baseLevel: 1,
    baseCombatEffectiveness: 19,
    energyCost: 11,
    maxLevel: 10,
    xpToNextLevel: 115,
    levelScaling: 1.28,
    narrativeStrengths: [
      'stunning enemies',
      'disabling electronics',
      'chain attacks',
      'powering/draining devices',
      'creating electromagnetic fields'
    ],
    narrativeWeaknesses: [
      'grounded enemies',
      'insulated targets',
      'water hazard (to self)',
      'precise control difficult'
    ],
    visualDescription: 'Arcs of lightning dance between your fingers',
    unlockRequirements: {
      level: 2,
      attributeRequirement: { attributeId: 'intelligence', minValue: 12 }
    },
    damageOverTime: true,
    areaEffect: true
  },

  {
    id: 'fire_generation',
    name: 'Fire Generation',
    description: 'Create and control flames',
    category: 'energy',
    baseLevel: 1,
    baseCombatEffectiveness: 21,
    energyCost: 13,
    maxLevel: 10,
    xpToNextLevel: 120,
    levelScaling: 1.32,
    narrativeStrengths: [
      'high damage',
      'area denial',
      'destroying obstacles',
      'light/warmth',
      'intimidation'
    ],
    narrativeWeaknesses: [
      'collateral damage',
      'water/rain',
      'enclosed spaces',
      'friendly fire',
      'smoke inhalation'
    ],
    visualDescription: 'Flames erupt from your hands, heat distorting the air',
    unlockRequirements: {
      level: 2,
      attributeRequirement: { attributeId: 'willpower', minValue: 16 }
    },
    damageOverTime: true,
    areaEffect: true
  },

  // === UTILITY CATEGORY ===
  {
    id: 'flight',
    name: 'Flight',
    description: 'Defy gravity and soar through the air',
    category: 'utility',
    baseLevel: 1,
    baseCombatEffectiveness: 10,
    energyCost: 7,
    maxLevel: 10,
    xpToNextLevel: 100,
    levelScaling: 1.15,
    narrativeStrengths: [
      'mobility',
      'aerial advantage',
      'reconnaissance',
      'escape',
      'rescue from heights',
      'avoiding ground hazards'
    ],
    narrativeWeaknesses: [
      'indoor combat',
      'bad weather',
      'aerial attackers',
      'ground-based powers',
      'visible/exposed'
    ],
    visualDescription: 'You rise into the air, weightless and free',
    unlockRequirements: {
      attributeRequirement: { attributeId: 'agility', minValue: 14 }
    }
  },

  {
    id: 'invisibility',
    name: 'Invisibility',
    description: 'Bend light around yourself to become unseen',
    category: 'utility',
    baseLevel: 1,
    baseCombatEffectiveness: 12,
    energyCost: 14,
    maxLevel: 10,
    xpToNextLevel: 140,
    levelScaling: 1.2,
    narrativeStrengths: [
      'stealth',
      'infiltration',
      'ambush',
      'escape',
      'surveillance',
      'avoiding detection'
    ],
    narrativeWeaknesses: [
      'doesn\'t silence sound',
      'leaves footprints',
      'drains energy quickly',
      'broken by attacking',
      'infrared detection'
    ],
    visualDescription: 'Your form shimmers and fades from view',
    unlockRequirements: {
      level: 3,
      attributeRequirement: { attributeId: 'stealth', minValue: 18 }
    }
  },

  {
    id: 'healing',
    name: 'Regeneration',
    description: 'Rapidly heal wounds and recover from injury',
    category: 'defensive',
    baseLevel: 1,
    baseCombatEffectiveness: 8,
    energyCost: 10,
    maxLevel: 10,
    xpToNextLevel: 130,
    levelScaling: 1.25,
    narrativeStrengths: [
      'sustain in combat',
      'heal others',
      'recover from poison/disease',
      'survive mortal wounds',
      'endurance'
    ],
    narrativeWeaknesses: [
      'no offensive capability',
      'instant death still fatal',
      'energy intensive',
      'slow at low levels'
    ],
    visualDescription: 'Wounds knit together, flesh mending before your eyes',
    unlockRequirements: {
      attributeRequirement: { attributeId: 'endurance', minValue: 18 }
    }
  },

  {
    id: 'shapeshifting',
    name: 'Shapeshifting',
    description: 'Alter your physical form',
    category: 'utility',
    baseLevel: 1,
    baseCombatEffectiveness: 11,
    energyCost: 16,
    maxLevel: 10,
    xpToNextLevel: 170,
    levelScaling: 1.18,
    narrativeStrengths: [
      'disguise',
      'infiltration',
      'adaptation',
      'deception',
      'versatility',
      'escape'
    ],
    narrativeWeaknesses: [
      'mentally taxing',
      'clothing doesn\'t change',
      'difficult to maintain under stress',
      'DNA/scent can reveal',
      'requires concentration'
    ],
    visualDescription: 'Your body flows like liquid, reforming into a new shape',
    unlockRequirements: {
      level: 4,
      attributeRequirement: { attributeId: 'intelligence', minValue: 16 }
    }
  },

  // === ADVANCED POWERS (Evolutions) ===
  {
    id: 'titan_strength',
    name: 'Titan Strength',
    description: 'Godlike physical power capable of leveling buildings',
    category: 'physical',
    baseLevel: 10,
    baseCombatEffectiveness: 45,
    energyCost: 15,
    maxLevel: 15,
    xpToNextLevel: 250,
    levelScaling: 1.4,
    narrativeStrengths: [
      'catastrophic damage',
      'unstoppable force',
      'terrain manipulation',
      'mass destruction',
      'legendary intimidation'
    ],
    narrativeWeaknesses: [
      'excessive collateral damage',
      'difficult to control',
      'makes subtlety impossible'
    ],
    visualDescription: 'The ground cracks beneath your feet, the air itself seems to fear you',
    unlockRequirements: {
      level: 10,
      powerRequired: 'super_strength'
    }
  },

  {
    id: 'time_dilation',
    name: 'Time Dilation',
    description: 'Slow time itself around you',
    category: 'physical',
    baseLevel: 10,
    baseCombatEffectiveness: 38,
    energyCost: 20,
    maxLevel: 15,
    xpToNextLevel: 280,
    levelScaling: 1.35,
    narrativeStrengths: [
      'effectively frozen enemies',
      'perfect evasion',
      'tactical dominance',
      'rescue operations',
      'precision actions'
    ],
    narrativeWeaknesses: [
      'extreme energy drain',
      'disorienting',
      'short duration',
      'can\'t affect some phenomena'
    ],
    visualDescription: 'The world moves in slow motion around you',
    unlockRequirements: {
      level: 10,
      powerRequired: 'super_speed'
    },
    cooldownTurns: 5
  },

  {
    id: 'mind_control',
    name: 'Mind Control',
    description: 'Dominate the thoughts and actions of others',
    category: 'mental',
    baseLevel: 10,
    baseCombatEffectiveness: 32,
    energyCost: 22,
    maxLevel: 15,
    xpToNextLevel: 300,
    levelScaling: 1.3,
    narrativeStrengths: [
      'turning enemies into allies',
      'information extraction',
      'crowd control',
      'infiltration via proxy',
      'preventing violence'
    ],
    narrativeWeaknesses: [
      'morally dubious',
      'strong-willed targets resist',
      'maintaining control is exhausting',
      'obvious ethical line',
      'leaves victims traumatized'
    ],
    visualDescription: 'Their eyes glaze over, their will now yours to command',
    unlockRequirements: {
      level: 10,
      powerRequired: 'telepathy',
      attributeRequirement: { attributeId: 'willpower', minValue: 25 }
    },
    requiresLineOfSight: true,
    cooldownTurns: 4
  }
]

// === HELPER FUNCTIONS ===

export function getPowerById(id: string): Power | undefined {
  return powers.find(p => p.id === id)
}

export function getPowersByCategory(category: PowerCategory): Power[] {
  return powers.filter(p => p.category === category)
}

export function getStarterPowers(): Power[] {
  return powers.filter(p => !p.unlockRequirements || 
    (!p.unlockRequirements.level && !p.unlockRequirements.powerRequired))
}

export function getAvailablePowers(
  characterLevel: number,
  currentPowers: string[],
  attributes: Record<string, number>
): Power[] {
  return powers.filter(power => {
    // Already have this power
    if (currentPowers.includes(power.id)) return false
    
    // Check requirements
    if (power.unlockRequirements) {
      const req = power.unlockRequirements
      
      // Level requirement
      if (req.level && characterLevel < req.level) return false
      
      // Prerequisite power
      if (req.powerRequired && !currentPowers.includes(req.powerRequired)) return false
      
      // Attribute requirement
      if (req.attributeRequirement) {
        const attrValue = attributes[req.attributeRequirement.attributeId] || 0
        if (attrValue < req.attributeRequirement.minValue) return false
      }
    }
    
    return true
  })
}

export function calculateCombatPower(power: Power, currentLevel: number): number {
  return Math.floor(
    power.baseCombatEffectiveness * Math.pow(power.levelScaling, currentLevel - 1)
  )
}

export function calculateXPForLevel(power: Power, targetLevel: number): number {
  // XP requirement increases exponentially
  return Math.floor(power.xpToNextLevel * Math.pow(1.15, targetLevel - 1))
}

export type PlayerPower = {
  powerId: string
  currentLevel: number
  currentXP: number
  timesUsed: number
}

export function addPowerXP(
  playerPower: PlayerPower,
  xpGain: number
): { leveled: boolean, newLevel?: number } {
  const power = getPowerById(playerPower.powerId)
  if (!power) return { leveled: false }
  
  playerPower.currentXP += xpGain
  playerPower.timesUsed++
  
  const xpNeeded = calculateXPForLevel(power, playerPower.currentLevel + 1)
  
  if (playerPower.currentXP >= xpNeeded && playerPower.currentLevel < power.maxLevel) {
    playerPower.currentLevel++
    playerPower.currentXP -= xpNeeded
    return { leveled: true, newLevel: playerPower.currentLevel }
  }
  
  return { leveled: false }
}