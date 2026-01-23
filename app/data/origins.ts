// data/origins.ts

export type Origin = {
  id: string
  name: string
  description: string
  backstory: string // Longer narrative for character creation
  
  // Starting bonuses
  startingPowers: string[] // Power IDs player starts with
  startingAttributes: Record<string, number> // Bonus to specific attributes
  startingFactionRep: { factionId: string, reputation: number }[] // Modified starting rep
  
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

export const origins: Origin[] = [
  {
    id: 'inherited_artifact',
    name: 'The Inherited Artifact',
    description: 'Your grandmother left you an ancient relic. When you touched it, everything changed.',
    backstory: `You never knew your grandmother was anything special—just stories about her travels, odd collections, languages you'd never heard of. When she died, she left you a single item: an ornate piece that doesn't match any culture you can identify. The moment your skin touched it, you felt something unlock inside you. Power. Knowledge. Voices from the past. Now you're connected to something ancient, something that chose you. But you're not the first to bear this burden, and the artifact's history is written in blood.`,
    
    startingPowers: ['telekinesis'],
    startingAttributes: {
      intelligence: 15,
      willpower: 12,
      perception: 13
    },
    startingFactionRep: [
      { factionId: 'black_market', reputation: 10 },
      { factionId: 'nihilist_collective', reputation: -10 }
    ],
    
    uniqueTrait: {
      name: 'Artifact Whispers',
      description: 'The artifact sometimes shows you fragments of its past or future',
      mechanicalEffect: 'Small chance to receive cryptic hints before major encounters. Gain +2 Intelligence when investigating mysteries.'
    },
    
    personalGoal: 'Uncover the true purpose of the artifact and its connection to your family',
    nemesisType: 'Collectors seeking the artifact, descendants of its previous wielders',
    secretWeakness: 'The artifact can be forcibly separated from you, leaving you powerless',
    
    narrativeTags: ['legacy', 'mystery', 'burden', 'chosen', 'ancient_power', 'family_secrets'],
    voiceTone: 'Curious and cautious, weighs decisions carefully, feels the weight of inheritance'
  },

  {
    id: 'corporate_experiment',
    name: 'The Failed Product',
    description: 'You were part of a corporate enhancement trial. You were the only one who survived.',
    backstory: `The NDA you signed promised "life-changing opportunities." They weren't lying. Corvus BioTech said they were testing nutritional supplements. The other nineteen volunteers died within a week—organ failure, the official report said. You remember their screams. You remember the burns. You remember waking up different. The company tried to silence you, tried to reclaim their "investment." You escaped with files showing this wasn't the first trial, won't be the last. They created you by accident. Now they want you back.`,
    
    startingPowers: ['enhanced_durability', 'healing'],
    startingAttributes: {
      endurance: 16,
      strength: 13,
      willpower: 14
    },
    startingFactionRep: [
      { factionId: 'city_government', reputation: -15 },
      { factionId: 'media_corporations', reputation: 5 }
    ],
    
    uniqueTrait: {
      name: 'Unstable Genetics',
      description: 'Your powers sometimes surge unpredictably under stress',
      mechanicalEffect: 'Critical hits deal 50% more damage but cost extra energy. 10% chance to trigger random power boost during combat.'
    },
    
    personalGoal: 'Expose Corvus BioTech and prevent more deaths',
    nemesisType: 'Corporate recovery teams, other "successful" experiments hunting you',
    secretWeakness: 'Specific pharmaceutical compounds can temporarily suppress your powers',
    
    narrativeTags: ['corporate_conspiracy', 'survivor_guilt', 'hunted', 'experimental', 'whistleblower', 'unstable'],
    voiceTone: 'Cynical about institutions, protective of innocents, carries survivor\'s guilt'
  },

  {
    id: 'dream_walker',
    name: 'The Dream That Stayed',
    description: 'You had the same nightmare for months. Then you woke up with powers from the dream.',
    backstory: `Every night for six months: the same infinite library, the same hooded figure, the same whispered lessons in a language you shouldn't understand. You started keeping a dream journal, sketching the symbols you saw. Then one morning, you woke up and the symbols were carved into your bedroom wall. You knew things you'd never learned. You could do things that shouldn't be possible. The hooded figure appeared one last time: "The tutorial is complete. Your world needs you now." You still don't know if you're awake.`,
    
    startingPowers: ['precognition', 'telepathy'],
    startingAttributes: {
      intelligence: 14,
      perception: 16,
      willpower: 15
    },
    startingFactionRep: [
      { factionId: 'nihilist_collective', reputation: 10 }
    ],
    
    uniqueTrait: {
      name: 'Dream Logic',
      description: 'Reality sometimes bends in small ways around you',
      mechanicalEffect: 'Once per day, reroll a failed action. Intuition-based powers have increased effectiveness.'
    },
    
    personalGoal: 'Understand the source of the dreams and what "your world needs you" means',
    nemesisType: 'Other dream-touched individuals with different "teachers," reality-denying entities',
    secretWeakness: 'Sleep deprivation severely weakens your powers',
    
    narrativeTags: ['surreal', 'chosen', 'trained_by_unknown', 'reality_questions', 'prophetic', 'mysterious_mentor'],
    voiceTone: 'Philosophical, questions what\'s real, speaks in metaphors occasionally'
  },

  {
    id: 'viral_mutation',
    name: 'The Survivor Strain',
    description: 'A pandemic swept through your neighborhood. You were the only one who changed instead of died.',
    backstory: `They called it River Fever—started in the industrial district, spread fast. Your entire apartment block got quarantined. You watched your neighbors through windows, watched them change, watched them die. When your symptoms started, you accepted it. But you didn't die. You transformed. Your body adapted, evolved, became something new. When they finally broke quarantine, they found you alive among the dead. The CDC wanted to study you. You ran. Now you're the last carrier of something that could save lives or end the world.`,
    
    startingPowers: ['shapeshifting', 'healing'],
    startingAttributes: {
      endurance: 15,
      agility: 13,
      willpower: 12
    },
    startingFactionRep: [
      { factionId: 'civilian_population', reputation: -10 },
      { factionId: 'metro_police', reputation: -8 }
    ],
    
    uniqueTrait: {
      name: 'Adaptive Biology',
      description: 'Your body learns from damage and adapts',
      mechanicalEffect: 'Gain temporary resistance to damage types you\'ve recently taken. Healing powers 25% more effective on self.'
    },
    
    personalGoal: 'Determine if you\'re a cure or a threat, protect others from your condition',
    nemesisType: 'Government health agencies, bio-weapon developers, other infected',
    secretWeakness: 'Extreme cold slows your cellular adaptation to near-paralysis',
    
    narrativeTags: ['plague_bearer', 'isolation', 'feared', 'evolving', 'medical_mystery', 'quarantine_survivor'],
    voiceTone: 'Lonely, afraid of what they are, desperate to help despite fear of contamination'
  },

  {
    id: 'empathic_overload',
    name: 'The Mirror Heart',
    description: 'You\'ve always felt what others feel. Then one day, you felt too much.',
    backstory: `Being an empath meant you always knew when someone was lying, hurting, afraid. You thought it was just intuition until the day you walked through downtown during rush hour and felt everyone. Thousands of minds, thousands of emotions, all at once. You collapsed. When you woke up in the hospital, you could still feel them—but now you could do something with it. Project calm into a panicking crowd. Share someone's pain to understand them. Take emotions away entirely. You're a mirror that reflects what people refuse to see in themselves.`,
    
    startingPowers: ['telepathy'],
    startingAttributes: {
      charisma: 16,
      willpower: 15,
      perception: 14
    },
    startingFactionRep: [
      { factionId: 'civilian_population', reputation: 8 },
      { factionId: 'vigilante_network', reputation: 5 }
    ],
    
    uniqueTrait: {
      name: 'Emotional Resonance',
      description: 'You absorb and can redistribute emotional energy',
      mechanicalEffect: 'Social encounters have higher success rates. Can sense hostile intent before ambushes. Taking mental damage also affects nearby enemies.'
    },
    
    personalGoal: 'Help others process their pain while maintaining your own identity',
    nemesisType: 'Emotional vampires, sociopaths immune to your powers, cult leaders wanting to weaponize you',
    secretWeakness: 'Crowds and intense emotions can overwhelm you into catatonia',
    
    narrativeTags: ['empath', 'emotional_power', 'helper', 'overwhelmed', 'connection', 'burden_of_feeling'],
    voiceTone: 'Compassionate but exhausted, understands people deeply, struggles with boundaries'
  },

  {
    id: 'construction_accident',
    name: 'The Reconstruction',
    description: 'You died in an accident. They brought you back wrong.',
    backstory: `The crane cable snapped. Fifteen tons of steel fell thirty floors. You remember the falling, the impact, everything going dark. You remember waking up six months later to doctors who wouldn't meet your eyes. They saved your life with experimental prosthetics, cutting-edge neural interfaces. But the tech did more than replace what you lost—it enhanced, evolved, integrated. You're stronger, faster, but you're not sure how much of you is still... you. The company that "saved" you sent a bill. You sent it back with a hole punched through it.`,
    
    startingPowers: ['super_strength', 'enhanced_durability'],
    startingAttributes: {
      strength: 16,
      endurance: 15,
      willpower: 11
    },
    startingFactionRep: [
      { factionId: 'city_government', reputation: -10 },
      { factionId: 'black_market', reputation: 8 }
    ],
    
    uniqueTrait: {
      name: 'Synthetic Integration',
      description: 'Your cybernetic parts can interface with technology',
      mechanicalEffect: 'Can hack basic electronics during encounters. Immune to poison and disease. Tech-based enemies deal 15% less damage to you.'
    },
    
    personalGoal: 'Reclaim your humanity while exploring the limits of your new form',
    nemesisType: 'The company demanding return of "their property," other cyborg experiments',
    secretWeakness: 'EMPs and strong electromagnetic fields cause severe pain and temporary paralysis',
    
    narrativeTags: ['cyborg', 'rebuilt', 'identity_crisis', 'corporate_property', 'second_chance', 'human_machine'],
    voiceTone: 'Questions their humanity, practical and direct, underlying anger at being made into property'
  },

  {
    id: 'parallel_refugee',
    name: 'The Displaced',
    description: 'You came from a world where you were ordinary. Here, you\'re something else.',
    backstory: `You remember going to sleep in your apartment. You woke up in the same apartment, but everything was slightly wrong. Different president, different history, you don't exist in any records. In this world, whatever made powered individuals possible affected you differently because you're not "from" here. You're not bound by this reality's rules the same way. You just want to go home, but you're starting to suspect home doesn't exist anymore. Maybe it never did. Maybe there's a reason you're here.`,
    
    startingPowers: ['flight', 'force_field'],
    startingAttributes: {
      perception: 15,
      intelligence: 13,
      willpower: 14
    },
    startingFactionRep: [],
    
    uniqueTrait: {
      name: 'Reality Friction',
      description: 'This world\'s physics don\'t fully apply to you',
      mechanicalEffect: 'Defensive powers are 20% more effective. Small chance to "phase" through obstacles. Occasionally notice things that "shouldn\'t" exist here.'
    },
    
    personalGoal: 'Find a way home or understand why you were brought here',
    nemesisType: 'Other dimension-touched beings, entities trying to seal dimensional breaches',
    secretWeakness: 'Certain locations or objects from "this" reality cause disorientation and nausea',
    
    narrativeTags: ['displaced', 'outsider', 'dimensional', 'homesick', 'wrong_world', 'reality_glitch'],
    voiceTone: 'Nostalgic, notices small differences others miss, struggles with belonging'
  },

  {
    id: 'bloodline_awakening',
    name: 'The Dormant Gene',
    description: 'Your family has always been different. It just skipped the last few generations.',
    backstory: `Great-grandmother's stories about "the old ways" seemed like superstition. Tales of ancestors who could call storms, speak to stone, walk through fire. Your parents dismissed it as folklore from the old country. Then puberty hit you weird—thirty years late. One day you're normal, the next you're everything the stories described. Your family tree isn't mythology. It's a genetic timebomb that just went off. Now distant relatives you've never met are reaching out, and not all of them are friendly.`,
    
    startingPowers: ['electricity_manipulation'],
    startingAttributes: {
      willpower: 14,
      intelligence: 12,
      charisma: 13
    },
    startingFactionRep: [
      { factionId: 'civilian_population', reputation: 5 }
    ],
    
    uniqueTrait: {
      name: 'Ancient Lineage',
      description: 'Your powers have deep historical roots',
      mechanicalEffect: 'Powers level up 10% faster. Occasionally receive ancestral "advice" during critical moments. Other powered bloodlines recognize you.'
    },
    
    personalGoal: 'Understand your heritage and what responsibilities come with it',
    nemesisType: 'Rival bloodlines, family members who want to control you, legacy hunters',
    secretWeakness: 'Blood relatives can sense your location and emotional state',
    
    narrativeTags: ['legacy', 'bloodline', 'hereditary', 'family_obligation', 'ancient_power', 'late_bloomer'],
    voiceTone: 'Torn between modern life and ancient duty, respects tradition, family-focused'
  },

  {
    id: 'observer_entity',
    name: 'The Witness',
    description: 'Something from beyond noticed you. Now you carry a piece of it.',
    backstory: `You were in the wrong place at the wrong time—or exactly the right place. A tear in the sky, something vast beyond comprehension looking through. You locked eyes with it for just a moment. It saw you. Really saw you. When the tear sealed, you were changed. You don't have powers—you have a fragment of something cosmic living in your mind. It shows you things, gives you abilities, speaks in geometries and impossible colors. It says it's helping. You're not sure you believe it, but you can't get rid of it, and honestly? The power is addictive.`,
    
    startingPowers: ['energy_blast', 'precognition'],
    startingAttributes: {
      intelligence: 15,
      willpower: 16,
      perception: 14
    },
    startingFactionRep: [
      { factionId: 'nihilist_collective', reputation: 12 }
    ],
    
    uniqueTrait: {
      name: 'Cosmic Insight',
      description: 'You perceive reality through an alien perspective',
      mechanicalEffect: 'Can sense powered individuals nearby. Mental powers have increased range. Occasionally receive warnings about cosmic-level threats.'
    },
    
    personalGoal: 'Determine if the entity is helping you or using you for unknown purposes',
    nemesisType: 'Others touched by similar entities, organizations trying to study/contain you',
    secretWeakness: 'The entity can be temporarily silenced, leaving you powerless and experiencing severe withdrawal',
    
    narrativeTags: ['cosmic_horror', 'possessed', 'chosen_by_other', 'alien_perspective', 'shared_consciousness', 'cosmic_awareness'],
    voiceTone: 'Speaks with unusual clarity about abstract concepts, sometimes references things they shouldn\'t know'
  },

  {
    id: 'probability_anomaly',
    name: 'The Glitch',
    description: 'Statistically, you shouldn\'t exist. But statistics don\'t apply to you anymore.',
    backstory: `Born on February 29th during a leap second, in a city that was simultaneously in two time zones due to a border dispute. A one-in-8.7-billion occurrence. You've always been impossibly lucky—or unlucky, depending on perspective. Won the lottery, then got hit by lightning, then won again. Things just... happen around you. Improbable things. Then you realized you weren't lucky. You were bending probability itself. Cause and effect get weird in your presence. You're a walking paradox, and reality is starting to notice.`,
    
    startingPowers: ['telekinesis', 'invisibility'],
    startingAttributes: {
      perception: 16,
      agility: 14,
      intelligence: 13
    },
    startingFactionRep: [
      { factionId: 'black_market', reputation: 10 }
    ],
    
    uniqueTrait: {
      name: 'Probability Manipulation',
      description: 'Unlikely events cluster around you',
      mechanicalEffect: 'Critical success and critical failure both more common. Can "reroll" once per encounter. Finding rare items/information is easier.'
    },
    
    personalGoal: 'Control your reality-warping nature before it causes catastrophic consequences',
    nemesisType: 'Entities that maintain causality, other probability manipulators creating feedback loops',
    secretWeakness: 'Attempting to force specific outcomes can backfire spectacularly',
    
    narrativeTags: ['probability', 'chaos', 'lucky_unlucky', 'anomaly', 'reality_bender', 'wild_card'],
    voiceTone: 'Bemused by the absurdity, expects the unexpected, makes dark jokes about luck'
  }
]

// === HELPER FUNCTIONS ===

export function getOriginById(id: string): Origin | undefined {
  return origins.find(o => o.id === id)
}

export function getOriginsByNarrativeTag(tag: string): Origin[] {
  return origins.filter(o => o.narrativeTags.includes(tag))
}

export function initializeCharacterFromOrigin(
  origin: Origin,
  characterName: string
): {
  name: string
  originId: string
  powers: string[]
  attributes: Record<string, number>
  factionReputations: Record<string, number>
  personalGoal: string
  uniqueTrait: Origin['uniqueTrait']
} {
  // Start with base attributes (from attributes.ts)
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
    notoriety: 0
  }
  
  // Apply origin bonuses
  const finalAttributes = { ...baseAttributes }
  Object.entries(origin.startingAttributes).forEach(([attr, bonus]) => {
    finalAttributes[attr] = (finalAttributes[attr] || 10) + bonus
  })
  
  // Initialize faction reputations
  const factionReputations: Record<string, number> = {}
  origin.startingFactionRep.forEach(rep => {
    factionReputations[rep.factionId] = rep.reputation
  })
  
  return {
    name: characterName,
    originId: origin.id,
    powers: [...origin.startingPowers],
    attributes: finalAttributes,
    factionReputations,
    personalGoal: origin.personalGoal,
    uniqueTrait: origin.uniqueTrait
  }
}

export function getOriginNarrative(origin: Origin): string {
  return `${origin.backstory}\n\nYour goal: ${origin.personalGoal}`
}

export function getOriginsByStartingPower(powerId: string): Origin[] {
  return origins.filter(o => o.startingPowers.includes(powerId))
}