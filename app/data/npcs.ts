// data/npcs.ts

export type NPCType = 'hero' | 'villain' | 'neutral' | 'mentor' | 'rival' | 'informant'
export type NPCThreatLevel = 'minion' | 'elite' | 'boss' | 'legendary'

export type NPC = {
  id: string
  name: string
  alias?: string // Their "super" name if applicable
  type: NPCType
  threatLevel: NPCThreatLevel
  
  // Basic info
  description: string
  appearance: string
  personality: string[]
  
  // Affiliations
  faction: string // Primary faction ID
  secondaryFactions?: string[]
  
  // Combat stats
  baseHP: number
  basePowerLevel: number // 1-100
  powers: string[] // Power IDs they use
  combatStyle: string // How they fight
  
  // Narrative role
  backstory: string
  motivation: string
  goals: string[]
  
  // Relationship dynamics
  relationshipType?: 'nemesis' | 'mentor' | 'ally' | 'rival' | 'romantic_interest' | 'family' | 'informant'
  relationshipTrigger?: {
    originId?: string // Appears if player has this origin
    factionReputation?: { factionId: string, threshold: number }
    playerAction?: string // Appears after specific action
    storylineProgress?: string
  }
  
  // Dialogue/interaction
  greetingHostile: string
  greetingNeutral: string
  greetingFriendly: string
  defeatLine: string
  victoryLine: string
  
  // Loot/rewards
  dropsOnDefeat?: {
    items: { itemId: string, chance: number }[]
    guaranteedXP: number
    guaranteedMoney: number
  }
  
  // Recurring character
  canRecur: boolean
  storyArc?: string // Name of their multi-encounter storyline
  
  // AI generation hints
  narrativeTags: string[]
  voiceTone: string
}

export const npcs: NPC[] = [
  // === HEROES ===
  {
    id: 'steel_sentinel',
    name: 'Marcus Kane',
    alias: 'Steel Sentinel',
    type: 'hero',
    threatLevel: 'boss',
    
    description: 'Leader of the Guardian Initiative, a towering figure in reinforced armor',
    appearance: 'Six-foot-five, broad shoulders, dark skin. His armor is polished steel with blue energy lines. Always looks like he just stepped out of a propaganda poster.',
    personality: ['duty-bound', 'idealistic', 'inflexible', 'inspiring', 'judgmental'],
    
    faction: 'guardian_initiative',
    
    baseHP: 200,
    basePowerLevel: 85,
    powers: ['super_strength', 'enhanced_durability', 'flight'],
    combatStyle: 'Tank and control - absorbs damage while corralling enemies. Protects civilians first, punches second.',
    
    backstory: 'Former military officer who gained powers during a black-ops mission gone wrong. Believes in the system and wants powered individuals to work within it. Sees unsanctioned vigilantes as dangerous wildcards.',
    motivation: 'Prove that powered individuals can be trusted by society',
    goals: [
      'Recruit promising powered individuals',
      'Eliminate rogue elements',
      'Maintain Guardian Initiative funding and public support'
    ],
    
    relationshipType: 'rival',
    relationshipTrigger: {
      factionReputation: { factionId: 'guardian_initiative', threshold: -20 }
    },
    
    greetingHostile: '"You\'ve had your chances to do this the right way. Now you answer to me."',
    greetingNeutral: '"We could use someone with your abilities. Join us, work within the system."',
    greetingFriendly: '"Good to see you\'re on the right side. The Initiative could use more like you."',
    defeatLine: '"I underestimated you... but this isn\'t over. The law will catch up to you."',
    victoryLine: '"You\'re under arrest. Maybe some time in a cell will help you see reason."',
    
    dropsOnDefeat: {
      items: [
        { itemId: 'reinforced_suit', chance: 0.3 },
        { itemId: 'power_core_fragment', chance: 0.8 }
      ],
      guaranteedXP: 150,
      guaranteedMoney: 0
    },
    
    canRecur: true,
    storyArc: 'guardian_conflict',
    
    narrativeTags: ['authority_figure', 'lawful_good', 'military', 'leader'],
    voiceTone: 'Authoritative, formal, speaks in terms of duty and responsibility'
  },

  {
    id: 'ghost_light',
    name: 'Sarah Chen',
    alias: 'Ghost Light',
    type: 'hero',
    threatLevel: 'elite',
    
    description: 'Mysterious vigilante who operates in the shadows, rarely seen clearly',
    appearance: 'Slight build, moves like smoke. Wears dark adaptive clothing that seems to blur at the edges. Face always obscured. Voice altered.',
    personality: ['secretive', 'compassionate', 'haunted', 'efficient', 'non-lethal'],
    
    faction: 'vigilante_network',
    secondaryFactions: ['civilian_population'],
    
    baseHP: 120,
    basePowerLevel: 70,
    powers: ['invisibility', 'telekinesis', 'precognition'],
    combatStyle: 'Hit and fade - appears, disarms/disables, vanishes. Never lingers. Uses environment tactically.',
    
    backstory: 'Lost her family to gang violence while police were "too busy." Gained powers shortly after. Now she protects the neighborhoods the system ignores. True identity unknown to everyone.',
    motivation: 'Protect those who have no one else to protect them',
    goals: [
      'Stop street-level crime in neglected neighborhoods',
      'Avoid government attention and registration',
      'Keep her identity secret at all costs'
    ],
    
    relationshipType: 'ally',
    relationshipTrigger: {
      factionReputation: { factionId: 'vigilante_network', threshold: 30 }
    },
    
    greetingHostile: '"You\'re hurting people who can\'t fight back. That makes you my problem."',
    greetingNeutral: '"Interesting. You\'re not what I expected. Watch yourself out here."',
    greetingFriendly: '"The streets need more people like you. Less people like them."',
    defeatLine: '"I miscalculated. Stay away from my neighborhoods."',
    victoryLine: '"You had potential. Shame you wasted it."',
    
    dropsOnDefeat: {
      items: [
        { itemId: 'stealth_cloak', chance: 0.4 },
        { itemId: 'comms_earpiece', chance: 0.6 }
      ],
      guaranteedXP: 100,
      guaranteedMoney: 200
    },
    
    canRecur: true,
    storyArc: 'vigilante_alliance',
    
    narrativeTags: ['mysterious', 'vigilante', 'street_level', 'protective'],
    voiceTone: 'Quiet, measured, speaks only when necessary, hints of trauma beneath professionalism'
  },

  // === VILLAINS ===
  {
    id: 'the_architect',
    name: 'Unknown',
    alias: 'The Architect',
    type: 'villain',
    threatLevel: 'legendary',
    
    description: 'Mastermind behind the Syndicate\'s powered operations. Identity unknown.',
    appearance: 'Never seen directly. Communicates through intermediaries, holograms, or voice modulators. Rumors describe everything from a disfigured scientist to an AI.',
    personality: ['calculating', 'patient', 'ruthless', 'brilliant', 'always_three_steps_ahead'],
    
    faction: 'syndicate',
    
    baseHP: 150,
    basePowerLevel: 95,
    powers: ['telepathy', 'mind_control', 'precognition'],
    combatStyle: 'Never fights directly. Controls others, manipulates situations, always has an escape plan. If cornered, uses overwhelming mental assault.',
    
    backstory: 'No verified information. Some say corporate scientist, others say government experiment gone wrong. The Architect appeared five years ago and transformed organized crime overnight.',
    motivation: 'Unknown - power? Money? Something else?',
    goals: [
      'Expand Syndicate control over all powered criminal activity',
      'Remain anonymous and untouchable',
      'Acquire powered individuals through any means'
    ],
    
    relationshipType: 'nemesis',
    relationshipTrigger: {
      factionReputation: { factionId: 'syndicate', threshold: -50 }
    },
    
    greetingHostile: '"You\'re an interesting variable. Let\'s see how you handle what I\'ve planned for you."',
    greetingNeutral: '"You have potential. Work for me, and I\'ll make you untouchable."',
    greetingFriendly: '"Excellent work. You\'re proving to be a valuable asset."',
    defeatLine: '"Fascinating. You\'re more capable than my models predicted. We\'ll meet again."',
    victoryLine: '"Did you think you were the protagonist of this story? You\'re barely a footnote."',
    
    dropsOnDefeat: {
      items: [
        { itemId: 'syndicate_ledger', chance: 1.0 },
        { itemId: 'power_focus_crystal', chance: 0.5 },
        { itemId: 'power_core_fragment', chance: 1.0 }
      ],
      guaranteedXP: 500,
      guaranteedMoney: 10000
    },
    
    canRecur: true,
    storyArc: 'syndicate_conspiracy',
    
    narrativeTags: ['mastermind', 'mysterious', 'criminal_genius', 'final_boss'],
    voiceTone: 'Calm, clinical, speaks like analyzing a chess game, occasionally shows dark amusement'
  },

  {
    id: 'pyroclasm',
    name: 'Viktor Molotov',
    alias: 'Pyroclasm',
    type: 'villain',
    threatLevel: 'boss',
    
    description: 'Pyromaniac terrorist with overwhelming destructive power',
    appearance: 'Tall, gaunt, covered in burn scars. Eyes have an orange glow. Wears a charred longcoat. Smells of gasoline and smoke.',
    personality: ['unhinged', 'philosophical', 'destructive', 'artistic', 'unpredictable'],
    
    faction: 'nihilist_collective',
    
    baseHP: 160,
    basePowerLevel: 80,
    powers: ['fire_generation', 'enhanced_durability'],
    combatStyle: 'Overwhelming area damage. Sets everything ablaze. No concern for collateral damage or self-preservation. Laughs while burning.',
    
    backstory: 'Former firefighter who developed powers during a warehouse blaze that killed his entire crew. Snapped. Now believes the world needs to burn to be reborn pure.',
    motivation: 'Cleanse the world through fire',
    goals: [
      'Create spectacular acts of destruction',
      'Recruit others who embrace chaos',
      'Burn down symbols of order and authority'
    ],
    
    relationshipType: 'nemesis',
    relationshipTrigger: {
      playerAction: 'respond_to_emergency'
    },
    
    greetingHostile: '"You keep putting out my fires. Let\'s see how you burn!"',
    greetingNeutral: '"Ah, another moth to the flame. Will you join the inferno or fight it?"',
    greetingFriendly: '"Yes! You understand! Together we\'ll watch it all burn!"',
    defeatLine: '"Beautiful... even in defeat, the flames sing..."',
    victoryLine: '"BURN! BURN! Everything must BURN!"',
    
    dropsOnDefeat: {
      items: [
        { itemId: 'power_core_fragment', chance: 0.9 },
        { itemId: 'blackmail_material', chance: 0.3 }
      ],
      guaranteedXP: 180,
      guaranteedMoney: 500
    },
    
    canRecur: true,
    storyArc: 'nihilist_threat',
    
    narrativeTags: ['pyromania', 'terrorism', 'nihilism', 'chaos'],
    voiceTone: 'Manic, poetic about fire and destruction, swings between whispers and shouts'
  },

  // === NEUTRALS ===
  {
    id: 'the_broker',
    name: 'Elena Vasquez',
    alias: 'The Broker',
    type: 'neutral',
    threatLevel: 'elite',
    
    description: 'Information dealer who sells to the highest bidder',
    appearance: 'Sharp business suit, expensive jewelry. Late 40s, perfectly composed. Eyes that miss nothing.',
    personality: ['pragmatic', 'neutral', 'professional', 'opportunistic', 'well-connected'],
    
    faction: 'black_market',
    
    baseHP: 80,
    basePowerLevel: 40,
    powers: ['telepathy'],
    combatStyle: 'Avoids combat. Pays others to fight for her. If forced, reads minds to anticipate and escape.',
    
    backstory: 'Former intelligence analyst who went private sector. Uses her telepathy to verify information and detect lies. Sells secrets to everyone—heroes, villains, government. Loyalty is for sale.',
    motivation: 'Accumulate wealth and leverage',
    goals: [
      'Maintain neutrality to serve all clients',
      'Acquire valuable information',
      'Never pick a losing side'
    ],
    
    relationshipType: 'informant',
    
    greetingHostile: '"You\'ve made enemies of my clients. That\'s bad for business. Leave before this gets expensive."',
    greetingNeutral: '"You need information. I provide information. Let\'s discuss terms."',
    greetingFriendly: '"Ah, a valued customer. I have something that might interest you..."',
    defeatLine: '"You just made a very expensive enemy. I have a long memory and deep pockets."',
    victoryLine: '"Nothing personal. You were simply worth more dead than alive."',
    
    dropsOnDefeat: {
      items: [
        { itemId: 'blackmail_material', chance: 0.8 },
        { itemId: 'comms_earpiece', chance: 0.5 }
      ],
      guaranteedXP: 80,
      guaranteedMoney: 2000
    },
    
    canRecur: true,
    storyArc: 'information_network',
    
    narrativeTags: ['information_broker', 'neutral', 'business', 'telepathy'],
    voiceTone: 'Professional, transactional, speaks like negotiating contracts'
  },

  // === MENTORS ===
  {
    id: 'old_guardian',
    name: 'James Sullivan',
    alias: 'The Old Guardian',
    type: 'mentor',
    threatLevel: 'boss',
    
    description: 'Retired hero from the first generation of powered individuals',
    appearance: 'Elderly but still powerful. Gray hair, weathered face, kind eyes. Moves slower but with absolute confidence.',
    personality: ['wise', 'patient', 'nostalgic', 'principled', 'world-weary'],
    
    faction: 'guardian_initiative',
    secondaryFactions: ['vigilante_network'],
    
    baseHP: 180,
    basePowerLevel: 75,
    powers: ['super_strength', 'enhanced_durability', 'healing'],
    combatStyle: 'Defensive and controlled. Fights only when necessary. Uses minimal force. More interested in teaching than winning.',
    
    backstory: 'One of the first powered individuals to go public. Helped found the Guardian Initiative. Retired after seeing too many young heroes die. Now trains the next generation, officially and unofficially.',
    motivation: 'Prevent young heroes from making his mistakes',
    goals: [
      'Guide promising powered individuals',
      'Share lessons from decades of experience',
      'Prevent unnecessary deaths'
    ],
    
    relationshipType: 'mentor',
    relationshipTrigger: {
      factionReputation: { factionId: 'guardian_initiative', threshold: 15 }
    },
    
    greetingHostile: '"I\'ve fought worse than you, kid. Stand down before you get hurt."',
    greetingNeutral: '"You remind me of myself at your age. Let me give you some advice..."',
    greetingFriendly: '"You\'re learning. Good. But you still have a long way to go."',
    defeatLine: '"Well fought. You\'ve surpassed the teacher. Make me proud out there."',
    victoryLine: '"Lesson learned, I hope. Power without wisdom is just destruction."',
    
    dropsOnDefeat: {
      items: [
        { itemId: 'reinforced_suit', chance: 0.5 },
        { itemId: 'medkit_advanced', chance: 0.7 }
      ],
      guaranteedXP: 120,
      guaranteedMoney: 0
    },
    
    canRecur: true,
    storyArc: 'mentor_training',
    
    narrativeTags: ['mentor', 'retired_hero', 'wisdom', 'old_generation'],
    voiceTone: 'Grandfatherly, speaks in stories and lessons, mix of nostalgia and warning'
  },

  // === RIVALS ===
  {
    id: 'mirror_match',
    name: 'Generated Dynamically',
    alias: 'Your Dark Reflection',
    type: 'rival',
    threatLevel: 'boss',
    
    description: 'A powered individual with similar abilities who made different choices',
    appearance: 'Varies based on player - designed to be a dark mirror of their character',
    personality: ['ambitious', 'ruthless', 'talented', 'arrogant', 'competitive'],
    
    faction: 'syndicate', // Could vary
    
    baseHP: 150,
    basePowerLevel: 75, // Scales with player
    powers: [], // Populated based on player's powers
    combatStyle: 'Mirrors player tactics but without moral restraints. Uses powers more aggressively.',
    
    backstory: 'This NPC is generated based on player origin and powers - represents the path not taken',
    motivation: 'Prove they\'re superior to the player',
    goals: [
      'Defeat the player in combat',
      'Achieve what the player seeks, but first',
      'Show the player their "weakness" of morality'
    ],
    
    relationshipType: 'rival',
    relationshipTrigger: {
      playerAction: 'reach_level_5'
    },
    
    greetingHostile: '"You waste your potential on heroics. Let me show you real power."',
    greetingNeutral: '"We could have been allies. Instead, we\'re enemies. Your choice."',
    greetingFriendly: '"Finally seeing reason? Good. There might be hope for you yet."',
    defeatLine: '"Impossible... we have the same powers... how did you..."',
    victoryLine: '"See? This is what you could be if you stopped holding back."',
    
    dropsOnDefeat: {
      items: [
        { itemId: 'power_core_fragment', chance: 1.0 }
      ],
      guaranteedXP: 200,
      guaranteedMoney: 1000
    },
    
    canRecur: true,
    storyArc: 'rival_confrontation',
    
    narrativeTags: ['rival', 'mirror', 'personal', 'competitive'],
    voiceTone: 'Mocking, knows player intimately, speaks to their doubts and weaknesses'
  }
]

// === HELPER FUNCTIONS ===

export function getNPCById(id: string): NPC | undefined {
  return npcs.find(n => n.id === id)
}

export function getNPCsByType(type: NPCType): NPC[] {
  return npcs.filter(n => n.type === type)
}

export function getNPCsByFaction(factionId: string): NPC[] {
  return npcs.filter(n => 
    n.faction === factionId || 
    (n.secondaryFactions && n.secondaryFactions.includes(factionId))
  )
}

export function getNPCsByThreatLevel(threatLevel: NPCThreatLevel): NPC[] {
  return npcs.filter(n => n.threatLevel === threatLevel)
}

export function shouldNPCAppear(
  npc: NPC,
  playerOriginId: string,
  playerFactionReps: Record<string, number>,
  playerLevel: number,
  completedActions: string[],
  storylineProgress: Record<string, number>
): boolean {
  if (!npc.relationshipTrigger) return true // Always available
  
  const trigger = npc.relationshipTrigger
  
  // Check origin trigger
  if (trigger.originId && trigger.originId !== playerOriginId) {
    return false
  }
  
  // Check faction reputation trigger
  if (trigger.factionReputation) {
    const { factionId, threshold } = trigger.factionReputation
    const playerRep = playerFactionReps[factionId] || 0
    if (playerRep < threshold) {
      return false
    }
  }
  
  // Check player action trigger
  if (trigger.playerAction) {
    if (!completedActions.includes(trigger.playerAction)) {
      return false
    }
  }
  
  // Check storyline progress
  if (trigger.storylineProgress) {
    const progress = storylineProgress[trigger.storylineProgress] || 0
    if (progress < 1) {
      return false
    }
  }
  
  return true
}

export function getNPCGreeting(
  npc: NPC,
  playerFactionReps: Record<string, number>
): string {
  const npcFactionRep = playerFactionReps[npc.faction] || 0
  
  if (npcFactionRep >= 30) {
    return npc.greetingFriendly
  } else if (npcFactionRep <= -30) {
    return npc.greetingHostile
  } else {
    return npc.greetingNeutral
  }
}

export function scaleNPCToPlayer(
  npc: NPC,
  playerLevel: number,
  playerPowerLevel: number
): NPC {
  const scaled = { ...npc }
  
  // Scale HP based on player level
  scaled.baseHP = Math.floor(npc.baseHP * (1 + (playerLevel - 1) * 0.1))
  
  // Scale power level to be challenging but fair
  scaled.basePowerLevel = Math.min(100, Math.floor(playerPowerLevel * 0.9))
  
  return scaled
}

export type NPCEncounter = {
  npcId: string
  context: string // Why they're appearing
  playerReputation: number // With their faction
  isRecurring: boolean // Have we met before?
  previousOutcome?: 'player_victory' | 'npc_victory' | 'stalemate'
}

export function generateNPCEncounter(
  availableNPCs: NPC[],
  encounterContext: string,
  playerFactionReps: Record<string, number>
): NPCEncounter | null {
  if (availableNPCs.length === 0) return null
  
  // Weight by relevance to context and faction alignment
  const npc = availableNPCs[Math.floor(Math.random() * availableNPCs.length)]
  
  return {
    npcId: npc.id,
    context: encounterContext,
    playerReputation: playerFactionReps[npc.faction] || 0,
    isRecurring: false // Would check database
  }
}