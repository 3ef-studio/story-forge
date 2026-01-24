// lib/ai/encounter-personalizer.ts
// Personalizes encounter seeds with character context - cheap, no structure changes

import type { EncounterSeed, PersonalizerInput, PersonalizedEncounter, CharacterContext } from './types'
import type { EncounterTemplate } from '@/app/data/encounter-templates'

// Deterministic personalization - no AI call needed
// This approach ensures cost efficiency and consistent behavior

type RepTier = 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied'

// Get reputation tier from numeric value
function getReputationTier(reputation: number): RepTier {
  if (reputation <= -50) return 'hostile'
  if (reputation <= -20) return 'unfriendly'
  if (reputation >= 50) return 'allied'
  if (reputation >= 20) return 'friendly'
  return 'neutral'
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

function intersects(a: readonly string[], b: readonly string[]): boolean {
  const setB = new Set(b)
  for (const v of a) if (setB.has(v)) return true
  return false
}

// Build personalizer input from character context
export function buildPersonalizerInput(
  seed: EncounterSeed,
  character: CharacterContext
): PersonalizerInput {
  const recentFactionTags = character.previousEncounters
    .slice(0, 3)
    .flatMap(e => e.factionsInvolved)

  return {
    seed,
    characterName: character.name,
    originName: character.origin.name,
    powerNames: character.powers.map(p => p.name),
    reputationTiers: character.factionStandings.map(fs => ({
      factionId: fs.factionId,
      tier: getReputationTier(fs.reputation),
    })),
    // NOTE: today these are faction ids; keep name for compatibility
    recentEncounterTags: uniq(recentFactionTags),
  }
}

// Personalize seed into full encounter - DETERMINISTIC, no AI
export function personalizeSeed(input: PersonalizerInput): PersonalizedEncounter {
  const { seed, powerNames, reputationTiers, recentEncounterTags } = input

  // Build personalized narrative intro
  const description = buildPersonalizedDescription(seed, powerNames, reputationTiers, recentEncounterTags)

  // Build personalized choice labels
  const personalizedChoices = seed.choices.map(choice => ({
    id: choice.id,
    text: personalizeChoiceLabel(choice.genericLabel, powerNames),
    requiredPowers: choice.requiredPowers,
    requiredAttributes: choice.requiredAttributes,
    narrativeDescription: choice.genericLabel, // Keep generic as narrative description
  }))

  // Build personalized title (lightweight)
  const name = personalizeTitle(seed.title, seed, recentEncounterTags)

  // Optional flavor text based on reputation + callbacks
  const flavorText = buildFlavorText(seed, reputationTiers, recentEncounterTags)

  return {
    seedId: seed.seedId,
    category: seed.category,
    difficulty: seed.difficulty,
    outcomes: seed.outcomes,
    tags: seed.tags,
    name,
    description,
    flavorText,
    choices: personalizedChoices,
  }
}

// -----------------------------
// Narrative building blocks
// -----------------------------

function buildPersonalizedDescription(
  seed: EncounterSeed,
  powerNames: string[],
  reputationTiers: { factionId: string; tier: RepTier }[],
  recentEncounterTags: string[]
): string {
  let description = seed.situationSummary

  // 1) Faction-aware tone (only if relevant)
  const relevantReputation = reputationTiers.find(r =>
    seed.involvedFactions.includes(r.factionId) && r.tier !== 'neutral'
  )

  if (relevantReputation && relevantReputation.tier !== 'neutral') {
    const tierPhrases: Record<Exclude<RepTier, 'neutral'>, string> = {
      hostile: 'You can feel the hostility before anyone says a word.',
      unfriendly: 'There’s tension here—eyes linger a little too long.',
      friendly: 'Your name buys you a moment of hesitation.',
      allied: 'A subtle nod tells you you’re not alone in this.',
    }

    // Now tier is narrowed to Exclude<RepTier, 'neutral'>, so indexing is safe.
    description += ` ${tierPhrases[relevantReputation.tier]}`
  }

  // 2) Power touch (one line, subtle, deterministic)
  const powerLine = buildPowerLine(powerNames, seed.tags)
  if (powerLine) {
    description += ` ${powerLine}`
  }

  // 3) Callback line (best-effort with what we have: recent factions)
  const callback = buildCallbackLine(seed, recentEncounterTags)
  if (callback) {
    description += ` ${callback}`
  }

  return description
}

function buildPowerLine(powerNames: string[], seedTags: string[]): string | undefined {
  const powers = powerNames.map(p => p.toLowerCase())
  const tags = seedTags.map(t => t.toLowerCase())

  const hasPower = (name: string) => powers.includes(name.toLowerCase())
  const tagHas = (kw: string) => tags.some(t => t.includes(kw))

  // Prefer lines that match the moment (tags), otherwise pick first matching power in priority order.
  const lines: Array<{ when: () => boolean; line: string }> = [
    // High-signal tag matches
    {
      when: () => (tagHas('hostage') || tagHas('civilian')) && hasPower('Telepathy'),
      line: 'You skim the surface thoughts nearby—panic, bargaining, and a single steady mind trying not to break.',
    },
    {
      when: () => (tagHas('hostage') || tagHas('civilian')) && hasPower('Precognition'),
      line: 'A flash—someone screams, glass shatters—then you’re back. A warning, not a promise.',
    },

    // Power-driven defaults (priority order)
    {
      when: () => hasPower('Mind Control'),
      line: 'You feel the temptation—one clean push and this ends… but the line you cross won’t uncross itself.',
    },
    {
      when: () => hasPower('Telepathy'),
      line: 'A faint pressure builds behind your eyes as other minds bleed into focus.',
    },
    {
      when: () => hasPower('Telekinesis'),
      line: 'Loose objects seem to “weigh” differently to you now—everything is a tool if you decide it is.',
    },
    {
      when: () => hasPower('Precognition'),
      line: 'Time stutters. You get the sense you’re looking at the edge of a bad moment before it arrives.',
    },
    {
      when: () => hasPower('Time Dilation') || hasPower('Super Speed'),
      line: 'The world slows just enough to make choice feel like a weapon.',
    },
    {
      when: () => hasPower('Titan Strength') || hasPower('Super Strength'),
      line: 'You test your grip on reality—doors, walls, and weapons all feel like they could give way.',
    },
    {
      when: () => hasPower('Enhanced Durability') || hasPower('Regeneration'),
      line: 'You steady yourself. Whatever happens, you can take the hit and keep moving.',
    },
    {
      when: () => hasPower('Force Field'),
      line: 'A familiar tension in the air—like invisible glass waiting to be shaped into cover.',
    },
    {
      when: () => hasPower('Energy Blast'),
      line: 'Energy prickles along your skin, the kind that turns hesitation into collateral damage if you’re sloppy.',
    },
    {
      when: () => hasPower('Electricity Manipulation'),
      line: 'Static crawls over your hands. Lights, locks, nerves—everything conductive becomes a possibility.',
    },
    {
      when: () => hasPower('Fire Generation'),
      line: 'Heat blooms at your fingertips—powerful, loud, and hard to hide once it’s out.',
    },
    {
      when: () => hasPower('Invisibility'),
      line: 'You think in angles and blind spots. Being seen is optional—until you act.',
    },
    {
      when: () => hasPower('Shapeshifting'),
      line: 'Faces are just masks. You feel how easily you could become someone else for a minute.',
    },
    {
      when: () => hasPower('Flight') || hasPower('Wall Crawling'),
      line: 'You scan above and around—routes most people don’t even consider.',
    },
  ]

  const match = lines.find(l => l.when())
  return match?.line
}


function buildCallbackLine(seed: EncounterSeed, recentEncounterTags: string[]): string | undefined {
  // Today, recentEncounterTags are faction IDs (from your buildPersonalizerInput),
  // so we can only do faction-based callbacks deterministically.
  const overlapFaction = seed.involvedFactions.find(f => recentEncounterTags.includes(f))
  if (overlapFaction) {
    return 'The city has patterns. This feels like one of them tightening again.'
  }

  // If no overlap, do nothing—better than forced generic noise
  return undefined
}

// -----------------------------
// Choice personalization (power-aware, no structure change)
// -----------------------------

function inferApproachFromLabel(label: string): 'direct' | 'subtle' | 'diplomatic' | 'tactical' | 'neutral' {
  const l = label.toLowerCase()
  if (l.includes('storm') || l.includes('confront') || l.includes('charge') || l.includes('attack')) return 'direct'
  if (l.includes('sneak') || l.includes('alternate') || l.includes('back') || l.includes('quiet') || l.includes('slip')) return 'subtle'
  if (l.includes('negot') || l.includes('talk') || l.includes('reason') || l.includes('persuade')) return 'diplomatic'
  if (l.includes('diversion') || l.includes('trap') || l.includes('plan') || l.includes('ambush') || l.includes('set up')) return 'tactical'
  return 'neutral'
}

function personalizeChoiceLabel(genericLabel: string, powerNames: string[]): string {
  const approach = inferApproachFromLabel(genericLabel)
  const powers = powerNames.map(p => p.toLowerCase())

  const has = (name: string) => powers.includes(name.toLowerCase())

  // Very light suffixes, deterministic, short
  if (approach === 'subtle') {
    if (has('Invisibility')) return `${genericLabel} (vanish first)`
    if (has('Shapeshifting')) return `${genericLabel} (wear a face)`
    if (has('Telepathy')) return `${genericLabel} (read the room)`
    if (has('Wall Crawling')) return `${genericLabel} (high angle)`
  }

  if (approach === 'direct') {
    if (has('Titan Strength') || has('Super Strength')) return `${genericLabel} (overpower them)`
    if (has('Time Dilation') || has('Super Speed')) return `${genericLabel} (hit fast)`
    if (has('Enhanced Durability') || has('Regeneration')) return `${genericLabel} (take the hit)`
    if (has('Energy Blast') || has('Fire Generation')) return `${genericLabel} (bring force)`
  }

  if (approach === 'diplomatic') {
    if (has('Telepathy')) return `${genericLabel} (sense intent)`
    if (has('Mind Control')) return `${genericLabel} (dangerous leverage)`
  }

  if (approach === 'tactical') {
    if (has('Force Field')) return `${genericLabel} (make cover)`
    if (has('Telekinesis')) return `${genericLabel} (use the environment)`
    if (has('Electricity Manipulation')) return `${genericLabel} (kill the lights)`
    if (has('Precognition')) return `${genericLabel} (avoid the trap)`
    if (has('Flight')) return `${genericLabel} (control distance)`
  }

  return genericLabel
}


// Personalize title based on recent encounter context
function personalizeTitle(baseTitle: string, seed: EncounterSeed, recentTags: string[]): string {
  // Keep titles mostly stable. Only add a subtle suffix if the same factions are repeating.
  const repeatedFaction = seed.involvedFactions.find(f => recentTags.includes(f))
  if (!repeatedFaction) return baseTitle

  // Prevent "(Again)" spam if seed titles are reused frequently
  if (baseTitle.toLowerCase().includes('again') || baseTitle.toLowerCase().includes('familiar')) {
    return baseTitle
  }

  return `${baseTitle} (Familiar Territory)`
}

// Build optional flavor text based on reputation + callbacks
function buildFlavorText(
  seed: EncounterSeed,
  reputationTiers: { factionId: string; tier: RepTier }[],
  recentEncounterTags: string[]
): string | undefined {
  const extremeRep = reputationTiers.find(r =>
    seed.involvedFactions.includes(r.factionId) &&
    (r.tier === 'hostile' || r.tier === 'allied')
  )

  if (extremeRep?.tier === 'hostile') {
    return 'Word travels fast. You can feel people bracing for trouble when you show up.'
  }
  if (extremeRep?.tier === 'allied') {
    return 'Your presence changes the temperature of the room—small, subtle advantages appear.'
  }

  // If recent factions overlap, add a continuity hint
  if (intersects(seed.involvedFactions, recentEncounterTags)) {
    return 'You’ve seen this shape of trouble before. The city keeps repeating itself.'
  }

  return undefined
}

// Convert PersonalizedEncounter to EncounterTemplate for API compatibility
export function toEncounterTemplate(
  personalized: PersonalizedEncounter,
  seedId: string
): EncounterTemplate {
  return {
    id: seedId,
    name: personalized.name,
    category: personalized.category,
    difficulty: personalized.difficulty,
    description: personalized.description,
    flavorText: personalized.flavorText,
    choices: personalized.choices,
    outcomes: personalized.outcomes.map(o => ({
      choiceId: o.choiceId,
      successChance: o.successChance,
      successResult: {
        description: o.successResult.description,
        xpGain: o.successResult.xpGain,
        factionChanges: o.successResult.factionChanges,
        attributeGrowth: o.successResult.attributeGrowth,
      },
      failureResult: {
        description: o.failureResult.description,
        xpGain: o.failureResult.xpGain,
        factionChanges: o.failureResult.factionChanges,
        hpLoss: o.failureResult.hpLoss,
      },
    })),
    narrativeTags: personalized.tags,
    canBeReused: true,
    timesUsed: 0,
  }
}

// Simple character context builder for personalization (lighter than full context)
export function buildLightCharacterContext(character: {
  name: string
  originId: string
  powers: { powerId: string }[]
  factionReputations: { factionId: string; reputation: number }[]
}, origins: Map<string, { name: string }>, powers: Map<string, { name: string }>): {
  name: string
  originName: string
  powerNames: string[]
  reputationTiers: { factionId: string; tier: RepTier }[]
} {
  const origin = origins.get(character.originId)
  const powerNames = character.powers
    .map(p => powers.get(p.powerId)?.name)
    .filter((n): n is string => !!n)

  return {
    name: character.name,
    originName: origin?.name || 'Unknown',
    powerNames,
    reputationTiers: character.factionReputations.map(fr => ({
      factionId: fr.factionId,
      tier: getReputationTier(fr.reputation),
    })),
  }
}
