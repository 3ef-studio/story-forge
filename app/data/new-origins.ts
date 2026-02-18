// data/origins.ts
// Drop-in replacement: adds deity selection + alignment + district influence support

export type OriginType =
  | 'champion'
  | 'shard'
  | 'bureau_auditor'
  | 'null_saint'
  | 'paradox_harvester'

export type DeityId =
  | 'aurelion'
  | 'thal_vara'
  | 'typhos'
  | 'nyx_mora'

export type Ideology = 'radiance' | 'stability' | 'entropy' | 'doubt'

// Stored on the PLAYER (not on the origin), but defined here for convenience.
export type AlignmentState = {
  patron: DeityId | null // null for non-divine origins
  value: number // 0–100
  lastDriftDelta?: number
}

// Stored on the DISTRICT / WORLD STATE, but defined here for convenience.
export type DistrictInfluence = Record<Ideology, number> // 0–100 each

export type Origin = {
  id: OriginType
  name: string
  description: string
  backstory: string // Longer narrative for character creation

  // --- NEW (supports Champions/Shards choosing a god; others set false) ---
  requiresDeitySelection: boolean
  deityOptions?: DeityId[]

  // Alignment + world-state hooks (optional, but available for systems)
  alignmentProfile?: {
    driftRate: number // how fast alignment shifts based on behavior
    severedPenaltySeverity: number // how harsh consequences become when misaligned
  }

  // Baseline ideological contribution tendency (world-state influence)
  influenceBias?: Partial<Record<Ideology, number>>

  // Starting bonuses
  startingPowers: string[] // Power IDs player starts with
  startingAttributes: Record<string, number> // Bonus to specific attributes
  startingFactionRep: { factionId: string; reputation: number }[] // Modified starting rep

  // Unique traits
  uniqueTrait: {
    name: string
    description: string
    mechanicalEffect: string // What it actually does in gameplay
  }

  // Story hooks
  personalGoal: string // Suggested character motivation
  nemesisType?: string // Type of enemy this origin attracts
  secretWeakness?: string // Narrative vulnerability

  // Narrative flavor for AI
  narrativeTags: string[] // Helps AI generate appropriate encounters
  voiceTone: string // How this character might speak/think
}

const ALL_DEITIES: DeityId[] = ['aurelion', 'thal_vara', 'typhos', 'nyx_mora']

export const origins: Origin[] = [
  {
    id: 'champion',
    name: 'Champion (The Oath)',
    description: 'You bind yourself to a divine philosophy and become its disciplined instrument.',
    backstory: `Some people stumble into power. You chose it.

You were shown the ancient conflict beneath the city’s lights—the Cosmic Compact that holds reality together, and the Entropy Alliance that wants to unravel it.

You swore an Oath. Not to a “good cause,” but to an idea strong enough to survive the void. In exchange, you gained stable power: armor for the soul, structure for the mind. Your god does not want you wild. They want you coherent. And when you drift, the Oath tightens.`,

    requiresDeitySelection: true,
    deityOptions: ALL_DEITIES,
    alignmentProfile: {
      driftRate: 0.6,
      severedPenaltySeverity: 2.0,
    },
    influenceBias: {
      radiance: 1,
      stability: 1,
    },

    startingPowers: ['force_field', 'enhanced_durability'],
    startingAttributes: {
      resolve: 2,
      stability: 1,
      presence: 1,
    },
    startingFactionRep: [
      { factionId: 'cosmic_compact', reputation: 5 },
      { factionId: 'entropy_alliance', reputation: -5 },
    ],

    uniqueTrait: {
      name: 'Oath Coherence',
      description: 'Your power is stable when your actions match your patron’s philosophy.',
      mechanicalEffect:
        'When aligned, reduce energy cost of defensive/utility powers. When misaligned, occasional power “stutters” increase energy cost or reduce effect.',
    },

    personalGoal: 'Prove your philosophy can protect the city without breaking it.',
    nemesisType: 'Unravelers, heretics, rival champions, ideological extremists.',
    secretWeakness: 'Repeated betrayal of your oath causes temporary loss of higher-tier abilities.',

    narrativeTags: ['oath', 'discipline', 'ideology', 'divine', 'duty', 'structure', 'consequence'],
    voiceTone:
      'Measured and principled. Speaks in commitments and consequences. Calm under pressure, judgmental of reckless choices.',
  },

  {
    id: 'shard',
    name: 'Shard (The Pact)',
    description: 'You bargain for a raw fragment of divinity and channel power your body was never meant to hold.',
    backstory: `You didn’t swear. You negotiated.

You found a crack in the divine war—an opportunity to take a piece of it and survive. A shard of a god’s power sits inside you like a star behind ribs.

It is strong, fast, and dangerous. Your patron doesn’t need you to be coherent. They need you to be effective. But the price is drift: the more you act against the shard’s nature, the more it fights you from the inside.`,

    requiresDeitySelection: true,
    deityOptions: ALL_DEITIES,
    alignmentProfile: {
      driftRate: 1.2,
      severedPenaltySeverity: 1.2,
    },
    influenceBias: {
      entropy: 1,
      doubt: 1,
    },

    startingPowers: ['energy_blast'],
    startingAttributes: {
      might: 2,
      agility: 1,
    },
    startingFactionRep: [
      { factionId: 'cosmic_compact', reputation: 0 },
      { factionId: 'entropy_alliance', reputation: 0 },
      { factionId: 'black_market', reputation: 5 },
    ],

    uniqueTrait: {
      name: 'Volatile Channel',
      description: 'Your shard can surge — or backlash — depending on stress and alignment.',
      mechanicalEffect:
        'Higher crit / burst potential, but using big powers increases instability. When misaligned, surge chance becomes backlash chance (self-damage, collateral, debuffs).',
    },

    personalGoal: 'Use the shard to reshape the city before it reshapes you.',
    nemesisType: 'Shard-hunters, rival pact-bearers, divine auditors, containment teams.',
    secretWeakness: 'Overuse can cause temporary corruption states that distort choices and outcomes.',

    narrativeTags: ['pact', 'transaction', 'volatile', 'corruption', 'power_at_a_cost', 'reckless', 'dangerous'],
    voiceTone:
      'Direct, impatient, and intense. Rationalizes risk. Alternates between confidence and dark doubt when the shard pushes back.',
  },

  {
    id: 'bureau_auditor',
    name: 'Bureau Auditor (BMA)',
    description: 'A sanctioned metahuman agent enforcing stability through oversight, regulation, and containment.',
    backstory: `The Bureau of Metahuman Affairs doesn’t call it a divine war.

They call it an incident stream.

While gods argue philosophy, the city bleeds. You were trained to stop the bleeding. You carry warrants, protocols, and a mandate: keep superhuman conflict from turning districts into graves.

You don’t worship order. You administer it. And when the city breaks its own rules, you write new ones—at gunpoint.`,

    requiresDeitySelection: false,
    alignmentProfile: {
      driftRate: 0.8,
      severedPenaltySeverity: 1.5,
    },
    influenceBias: {
      stability: 2,
    },

    startingPowers: ['force_field', 'precognition'],
    startingAttributes: {
      stability: 2,
      presence: 1,
      resolve: 1,
    },
    startingFactionRep: [
      { factionId: 'bma', reputation: 15 },
      { factionId: 'city_government', reputation: 10 },
      { factionId: 'vigilante_network', reputation: -5 },
    ],

    uniqueTrait: {
      name: 'Compliance Protocols',
      description: 'You can impose structure on chaotic situations — but it angers the lawless.',
      mechanicalEffect:
        'Reduced encounter randomness in controlled districts. Can “Lockdown” a district to reduce chaos events, but it increases hostility from anarchic/entropy-aligned actors.',
    },

    personalGoal: 'Prevent a district-scale catastrophe while keeping the Bureau’s hands clean.',
    nemesisType: 'Unregistered vigilantes, Typhos cult cells, corruption inside the Bureau.',
    secretWeakness: 'Bureau oversight can restrict your options when politics get involved.',

    narrativeTags: ['government', 'oversight', 'containment', 'procedural', 'control', 'law', 'bureaucracy'],
    voiceTone:
      'Professional, clipped, and pragmatic. Speaks in risk, procedure, and outcomes. Sees mythology as a threat vector.',
  },

  {
    id: 'null_saint',
    name: 'Null Saint',
    description: 'A severed mortal who rejects all gods and weaponizes absence itself.',
    backstory: `You watched miracles become collateral.

Every sermon ends the same way: broken streets, missing people, and someone insisting it was “necessary.”

You learned the oldest heresy: that divinity is not a gift — it’s a dependency. You found the void between powers, the quiet place where divine rules don’t apply.

You don’t pray. You silence.

Where you walk, miracles fail. And that makes you the enemy of everyone who needs miracles to win.`,

    requiresDeitySelection: false,
    alignmentProfile: {
      driftRate: 0.9,
      severedPenaltySeverity: 1.8,
    },
    influenceBias: {
      stability: 1,
      entropy: 1,
    },

    startingPowers: ['enhanced_durability'],
    startingAttributes: {
      resolve: 2,
      willpower: 1,
    },
    startingFactionRep: [
      { factionId: 'cosmic_compact', reputation: -5 },
      { factionId: 'entropy_alliance', reputation: -5 },
      { factionId: 'nihilist_collective', reputation: 10 },
    ],

    uniqueTrait: {
      name: 'Null Field',
      description: 'You suppress divine effects nearby, including your own allies’ miracles.',
      mechanicalEffect:
        'In certain encounters, reduce effectiveness of divine buffs/debuffs on both sides. Strong against illusion and surge effects. Creates “dead zones” in districts that resist ideological saturation.',
    },

    personalGoal: 'Prove the city can survive without gods — or die proving you right.',
    nemesisType: 'Divine enforcers, zealots, Bureau containment teams, Nyx conspirators.',
    secretWeakness: 'Your suppression makes you rely on mortal grit; prolonged battles exhaust you faster.',

    narrativeTags: ['anti_divine', 'null', 'heresy', 'suppression', 'ascetic', 'exorcist', 'principled'],
    voiceTone:
      'Quiet, severe, and uncompromising. Speaks in simple truths. Dislikes spectacle, hates excuses.',
  },

  {
    id: 'paradox_harvester',
    name: 'Paradox Harvester',
    description: 'A scavenger-scientist who extracts usable power from anomalies, shards, and broken laws of reality.',
    backstory: `The Paradox Institute doesn’t worship gods.

They map them.

You’ve seen what divine residue does when it settles into concrete and bone. You’ve learned to bottle the impossible: to harvest contradictions and turn them into tools.

Your power is not sacred. It’s engineered from catastrophe.

That makes you valuable to everyone — and trusted by no one.`,

    requiresDeitySelection: false,
    alignmentProfile: {
      driftRate: 1.0,
      severedPenaltySeverity: 1.1,
    },
    influenceBias: {
      doubt: 1,
      entropy: 1,
    },

    startingPowers: ['telekinesis', 'precognition'],
    startingAttributes: {
      intelligence: 2,
      perception: 1,
      guile: 1,
    },
    startingFactionRep: [
      { factionId: 'paradox_institute', reputation: 15 },
      { factionId: 'black_market', reputation: 5 },
      { factionId: 'city_government', reputation: -5 },
    ],

    uniqueTrait: {
      name: 'Anomaly Extraction',
      description: 'You can convert instability into advantage — at a cost.',
      mechanicalEffect:
        'Gain bonuses when operating in high-entropy or high-doubt districts. Can “Harvest” after encounters to gain temporary buffs or resources, but increases local instability slightly.',
    },

    personalGoal: 'Build a device that can rewrite the terms of the divine conflict — or profit from it first.',
    nemesisType: 'Bureau raids, rival harvesters, entities born from your failed experiments.',
    secretWeakness: 'Your tools can malfunction catastrophically when reality is too stable or too chaotic.',

    narrativeTags: ['science', 'anomaly', 'artifact_tech', 'harvest', 'pragmatic', 'gray_morality', 'forbidden_research'],
    voiceTone:
      'Clinical, curious, and slightly smug. Treats miracles like data. Switches to fear when experiments go wrong.',
  },
]

// === DEITY DEFINITIONS ===

export type Deity = {
  id: DeityId
  name: string
  title: string
  description: string
  ideology: Ideology
  values: string[]
  forbiddenActions: string[] // tags that damage alignment when chosen
  favoredActions: string[] // tags that improve alignment when chosen
}

export const deities: Deity[] = [
  {
    id: 'aurelion',
    name: 'Aurelion',
    title: 'The Radiant',
    description: 'God of light, truth, and protection. Aurelion demands clarity and shields the innocent.',
    ideology: 'radiance',
    values: ['protect_civilians', 'truth', 'justice', 'sacrifice', 'heroism'],
    favoredActions: ['protect_civilians', 'lawful', 'heroic', 'self_sacrifice', 'truth_telling'],
    forbiddenActions: ['collateral_damage', 'deception', 'cruelty', 'cowardice', 'betrayal'],
  },
  {
    id: 'thal_vara',
    name: 'Thal-Vara',
    title: 'The Foundation',
    description: 'God of order, institutions, and enduring structure. Thal-Vara values stability over chaos.',
    ideology: 'stability',
    values: ['order', 'law', 'structure', 'patience', 'discipline'],
    favoredActions: ['lawful', 'procedural', 'diplomatic', 'de_escalation', 'institution_support'],
    forbiddenActions: ['collateral_damage', 'anarchy', 'reckless', 'vigilante_justice', 'property_destruction'],
  },
  {
    id: 'typhos',
    name: 'Typhos',
    title: 'The Unmaker',
    description: 'God of entropy, necessary destruction, and transformation through chaos.',
    ideology: 'entropy',
    values: ['change', 'destruction', 'transformation', 'power', 'revolution'],
    favoredActions: ['collateral_damage', 'property_destruction', 'intimidation', 'revolution', 'chaos'],
    forbiddenActions: ['lawful', 'procedural', 'de_escalation', 'institution_support', 'submission'],
  },
  {
    id: 'nyx_mora',
    name: 'Nyx-Mora',
    title: 'The Veil',
    description: 'God of secrets, manipulation, and the power of hidden knowledge.',
    ideology: 'doubt',
    values: ['secrets', 'manipulation', 'knowledge', 'subtlety', 'deception'],
    favoredActions: ['deception', 'manipulation', 'stealth', 'blackmail', 'information_gathering'],
    forbiddenActions: ['truth_telling', 'heroic', 'direct_confrontation', 'transparency', 'naive_trust'],
  },
]

// === HELPER FUNCTIONS ===

export function getOriginById(id: string): Origin | undefined {
  return origins.find((o) => o.id === id)
}

export function getDeityById(id: string): Deity | undefined {
  return deities.find((d) => d.id === id)
}

export function getOriginsByNarrativeTag(tag: string): Origin[] {
  return origins.filter((o) => o.narrativeTags.includes(tag))
}

export function requiresDeitySelection(origin: Origin): boolean {
  return origin.requiresDeitySelection === true
}

export function getDeityOptions(origin: Origin): DeityId[] {
  return origin.deityOptions ?? []
}

/**
 * Initialize character from origin with deity support
 */
export function initializeCharacterFromOrigin(
  origin: Origin,
  characterName: string,
  deityId?: DeityId
): {
  name: string
  originId: string
  powers: string[]
  attributes: Record<string, number>
  factionReputations: Record<string, number>
  personalGoal: string
  uniqueTrait: Origin['uniqueTrait']
  patronDeityId: DeityId | null
  alignmentValue: number | null
} {
  // Start with base attributes
  const baseAttributes: Record<string, number> = {
    strength: 10,
    agility: 10,
    intelligence: 10,
    charisma: 10,
    willpower: 10,
    perception: 10,
    endurance: 10,
    stealth: 10,
    reputation: 0,
    notoriety: 0,
    // New attributes from new-origins
    resolve: 10,
    stability: 10,
    presence: 10,
    might: 10,
    guile: 10,
  }

  // Apply origin bonuses
  const finalAttributes = { ...baseAttributes }
  Object.entries(origin.startingAttributes).forEach(([attr, bonus]) => {
    finalAttributes[attr] = (finalAttributes[attr] || 10) + bonus
  })

  // Initialize faction reputations
  const factionReputations: Record<string, number> = {}
  origin.startingFactionRep.forEach((rep) => {
    factionReputations[rep.factionId] = rep.reputation
  })

  // Determine alignment value based on deity selection
  const hasDeity = origin.requiresDeitySelection && deityId
  const alignmentValue = hasDeity ? 50 : null // Start at 50 (neutral) if divine origin
  const patronDeityId = hasDeity ? deityId : null

  return {
    name: characterName,
    originId: origin.id,
    powers: [...origin.startingPowers],
    attributes: finalAttributes,
    factionReputations,
    personalGoal: origin.personalGoal,
    uniqueTrait: origin.uniqueTrait,
    patronDeityId,
    alignmentValue,
  }
}

export function getOriginNarrative(origin: Origin): string {
  return `${origin.backstory}\n\nYour goal: ${origin.personalGoal}`
}

export function getOriginsByStartingPower(powerId: string): Origin[] {
  return origins.filter((o) => o.startingPowers.includes(powerId))
}

/**
 * Get ideology bias for district influence from origin and deity
 */
export function getInfluenceBias(
  origin: Origin,
  deityId: DeityId | null
): Partial<Record<Ideology, number>> {
  const bias: Partial<Record<Ideology, number>> = { ...origin.influenceBias }

  // Add deity influence
  if (deityId) {
    const deity = getDeityById(deityId)
    if (deity) {
      // Small bonus to the deity's ideology
      bias[deity.ideology] = (bias[deity.ideology] || 0) + 2
    }
  }

  return bias
}
