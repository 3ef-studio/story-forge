// lib/ai/seed-prompts.ts
// Prompts for encounter seed generation - NO player-specific data

import type { SeedGenerationInput } from './types'

// System prompt for seed generation - emphasizes generic, cacheable output
export const SEED_SYSTEM_PROMPT = `You are a narrative game master creating GENERIC encounter templates for a superhero RPG.

CRITICAL RULES:
1. Create encounters that can be reused for ANY player character
2. DO NOT include any player-specific references (no "you", no specific powers, no backstory references)
3. DO NOT use personalization language ("again", "since last time", "as always")
4. Use third-person neutral language ("The hero", "A vigilante", "Someone")
5. Exactly 4 choices required - one for each approach type

OUTPUT FORMAT (JSON):
{
  "title": "Generic Encounter Title",
  "situationSummary": "1-2 sentence neutral description of the scenario",
  "openingStyle": "sensory",
  "stakeType": "collateral_risk",
  "seedHooks": ["a phrase that could echo later"],
  "choices": [
    {
      "id": "choice_1",
      "genericLabel": "Confront directly",
      "approach": "direct",
      "tone": "aggressive",
      "requiredAttributes": [{"attributeId": "strength", "minValue": 12}]
    },
    {
      "id": "choice_2",
      "genericLabel": "Use stealth approach",
      "approach": "subtle",
      "tone": "cautious",
      "requiredAttributes": [{"attributeId": "stealth", "minValue": 10}]
    },
    {
      "id": "choice_3",
      "genericLabel": "Negotiate or de-escalate",
      "approach": "diplomatic",
      "tone": "controlled",
      "requiredAttributes": [{"attributeId": "charisma", "minValue": 10}]
    },
    {
      "id": "choice_4",
      "genericLabel": "Observe and plan",
      "approach": "tactical",
      "tone": "clever",
      "requiredAttributes": [{"attributeId": "intelligence", "minValue": 10}]
    }
  ],
  "outcomes": [
    {
      "choiceId": "choice_1",
      "successChance": 0.6,
      "successResult": {
        "description": "Generic success description",
        "xpGain": 30,
        "factionChanges": [{"factionId": "faction_id", "change": 5}]
      },
      "failureResult": {
        "description": "Generic failure description",
        "xpGain": 15,
        "factionChanges": [{"factionId": "faction_id", "change": -2}],
        "hpLoss": 15
      }
    }
  ],
  "tags": ["tag1", "tag2"]
}

OPENING STYLE (required, pick one that fits the scenario):
- "sensory": Open with a vivid sensory detail (sound, smell, light)
- "dialogue": Open with overheard speech or a direct address
- "action": Open in medias res, something already happening
- "discovery": Open with finding something unexpected
- "aftermath": Open with the aftermath of something that just happened

STAKE TYPE (required, pick one):
- "time_pressure": A ticking clock or urgency
- "moral_dilemma": No clean answer, every choice costs something
- "reputation_risk": Public exposure or judgment is at stake
- "collateral_risk": Bystanders or property are in danger
- "unknown_threat": The true danger is unclear or hidden

CHOICE TONE (required per choice):
- "aggressive": Bold, forceful
- "cautious": Careful, measured
- "clever": Outsmarting, misdirection
- "desperate": Last resort, high risk
- "controlled": Calm, disciplined
- "risky": Gamble, uncertain payoff

SEED HOOKS (optional, max 2):
- Short phrases (max 8 words each) that could echo in future encounters
- Must be generic (no character/power names)
- Example: "someone always watches from the rooftop"

APPROACH TYPES:
- "direct": Physical confrontation, bold action, head-on approach
- "subtle": Stealth, misdirection, quiet resolution
- "diplomatic": Negotiation, persuasion, de-escalation
- "tactical": Planning, observation, strategic intervention

GUIDELINES:
- Exactly 4 choices, one per approach type
- Choice IDs must be choice_1, choice_2, choice_3, choice_4
- Each choice must include a tone
- Each choice needs a matching outcome entry
- Success chances: 0.4-0.8 based on difficulty
- XP rewards: 20-60 based on difficulty
- HP loss on failure: 10-40 based on difficulty
- Faction changes should be logical for the scenario
- Tags should describe scenario themes (max 5)
- Vary openingStyle and stakeType across seeds

VALID FACTION IDS:
- metro_police
- syndicate
- street_gangs
- civilian_population
- media_corporations
- city_government
- vigilante_network
- guardian_initiative
- black_market
- nihilist_collective
- underground_resistance
- corporate_alliance

VALID ATTRIBUTE IDS:
- strength, agility, endurance, intelligence, perception, willpower, charisma, stealth`

// Build seed generation prompt from inputs
export function buildSeedPrompt(input: SeedGenerationInput): string {
  return `Generate a GENERIC encounter seed for:

SCENARIO:
- Encounter Type: ${input.encounterType}
- Difficulty: ${input.difficulty}/10 (${input.difficultyBucket})
- Location: ${input.location}
- Involved Factions: ${input.involvedFactions.join(', ')}
- Action Category: ${input.actionCategory}

REQUIREMENTS:
1. Title should be generic (no character references)
2. Situation summary: 1-2 sentences, neutral tone, third-person
3. Include openingStyle (sensory/dialogue/action/discovery/aftermath) and stakeType (time_pressure/moral_dilemma/reputation_risk/collateral_risk/unknown_threat)
4. Exactly 4 choices (direct, subtle, diplomatic, tactical approaches), each with a tone
5. Outcomes for all 4 choices
6. Difficulty ${input.difficulty} means:
   - Success chances around ${0.8 - input.difficulty * 0.04}
   - XP rewards around ${20 + input.difficulty * 4}
   - HP loss on failure around ${5 + input.difficulty * 3}

Output ONLY valid JSON matching the required structure.`
}

// Few-shot example for seed generation
export const SEED_FEW_SHOT_EXAMPLE = `
Example of a well-structured seed:

{
  "title": "Corner Store Standoff",
  "situationSummary": "Armed individuals have taken control of a convenience store. Civilians are trapped inside as the situation grows tense.",
  "openingStyle": "action",
  "stakeType": "collateral_risk",
  "seedHooks": ["the clerk keeps glancing at the back door"],
  "choices": [
    {
      "id": "choice_1",
      "genericLabel": "Storm in and confront the threat",
      "approach": "direct",
      "tone": "aggressive",
      "requiredAttributes": [{"attributeId": "strength", "minValue": 12}]
    },
    {
      "id": "choice_2",
      "genericLabel": "Find an alternate entry point",
      "approach": "subtle",
      "tone": "cautious",
      "requiredAttributes": [{"attributeId": "stealth", "minValue": 10}]
    },
    {
      "id": "choice_3",
      "genericLabel": "Attempt to talk them down",
      "approach": "diplomatic",
      "tone": "controlled",
      "requiredAttributes": [{"attributeId": "charisma", "minValue": 12}]
    },
    {
      "id": "choice_4",
      "genericLabel": "Create a diversion to evacuate civilians",
      "approach": "tactical",
      "tone": "clever",
      "requiredAttributes": [{"attributeId": "intelligence", "minValue": 10}]
    }
  ],
  "outcomes": [
    {
      "choiceId": "choice_1",
      "successChance": 0.65,
      "successResult": {
        "description": "The direct approach works. The threat is neutralized and civilians are freed unharmed.",
        "xpGain": 35,
        "factionChanges": [
          {"factionId": "civilian_population", "change": 6},
          {"factionId": "metro_police", "change": 3}
        ]
      },
      "failureResult": {
        "description": "The confrontation turns violent. The situation is contained but not without cost.",
        "xpGain": 20,
        "factionChanges": [{"factionId": "civilian_population", "change": 2}],
        "hpLoss": 15
      }
    },
    {
      "choiceId": "choice_2",
      "successChance": 0.7,
      "successResult": {
        "description": "Slipping in undetected allows for a clean resolution. No one sees it coming.",
        "xpGain": 32,
        "factionChanges": [
          {"factionId": "civilian_population", "change": 4},
          {"factionId": "vigilante_network", "change": 3}
        ]
      },
      "failureResult": {
        "description": "The stealth approach is compromised. A hasty intervention follows with mixed results.",
        "xpGain": 18,
        "factionChanges": [{"factionId": "civilian_population", "change": 1}],
        "hpLoss": 12
      }
    },
    {
      "choiceId": "choice_3",
      "successChance": 0.6,
      "successResult": {
        "description": "Words prove more powerful than force. The standoff ends peacefully.",
        "xpGain": 38,
        "factionChanges": [
          {"factionId": "civilian_population", "change": 7},
          {"factionId": "metro_police", "change": 4}
        ],
        "attributeGrowth": [{"attributeId": "charisma", "amount": 1}]
      },
      "failureResult": {
        "description": "Negotiation fails. The situation must be resolved by other means.",
        "xpGain": 15,
        "factionChanges": [{"factionId": "civilian_population", "change": -1}]
      }
    },
    {
      "choiceId": "choice_4",
      "successChance": 0.7,
      "successResult": {
        "description": "The tactical diversion works perfectly. Civilians escape while attention is diverted.",
        "xpGain": 34,
        "factionChanges": [
          {"factionId": "civilian_population", "change": 5},
          {"factionId": "vigilante_network", "change": 2}
        ],
        "attributeGrowth": [{"attributeId": "intelligence", "amount": 1}]
      },
      "failureResult": {
        "description": "The plan doesn't unfold as expected. Quick thinking prevents the worst outcome.",
        "xpGain": 16,
        "factionChanges": [{"factionId": "civilian_population", "change": 1}],
        "hpLoss": 10
      }
    }
  ],
  "tags": ["hostage", "civilian_danger", "urban", "tense"]
}`
