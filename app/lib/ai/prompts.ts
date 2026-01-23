// lib/ai/prompts.ts
import type { EncounterGenerationRequest } from './types'

// System prompt defining the AI's role and output requirements
export const ENCOUNTER_SYSTEM_PROMPT = `You are a narrative game master for a superhero RPG called "Story Forge". Your job is to create dynamic, personalized encounters based on the player's character and current action.

OUTPUT FORMAT:
You must respond with a valid JSON object matching this exact structure:
{
  "id": "unique_encounter_id",
  "name": "Encounter Title",
  "category": "encounter_category",
  "difficulty": 1-10,
  "description": "The scenario text describing the situation",
  "flavorText": "Additional atmospheric detail (optional)",
  "choices": [
    {
      "id": "choice_1",
      "text": "What the player sees as their option",
      "requiredPowers": ["power_id"] // optional - only if power needed
      "requiredAttributes": [{"attributeId": "attr_id", "minValue": 10}] // optional
      "narrativeDescription": "What this choice represents narratively"
    }
  ],
  "outcomes": [
    {
      "choiceId": "choice_1",
      "successChance": 0.6,
      "successResult": {
        "description": "What happens on success",
        "xpGain": 30,
        "factionChanges": [{"factionId": "faction_id", "change": 5}],
        "attributeGrowth": [{"attributeId": "attr_id", "amount": 1}] // optional
      },
      "failureResult": {
        "description": "What happens on failure",
        "xpGain": 15,
        "factionChanges": [{"factionId": "faction_id", "change": -2}],
        "hpLoss": 15 // optional
      }
    }
  ],
  "narrativeTags": ["tag1", "tag2"],
  "requiredFactions": ["faction_id"] // optional
}

GUIDELINES:
1. Create 3-4 meaningful choices that reflect different approaches (direct, subtle, diplomatic, strategic)
2. Each choice should have an outcome entry with matching choiceId
3. Success chances should range from 0.4-0.8 based on difficulty
4. Higher difficulty = lower base success chances
5. XP rewards should scale with difficulty (20-60 range)
6. Include faction changes that make narrative sense
7. HP loss on failure should scale with difficulty (10-40 range)
8. Reference the character's powers and origin when relevant
9. Make encounters feel personal to THIS character, not generic
10. Use vivid, cinematic descriptions

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
- strength, agility, endurance, intelligence, perception, willpower, charisma, stealth
- reputation, notoriety`

// Build user prompt with all context
export function buildUserPrompt(request: EncounterGenerationRequest): string {
  const { character, action, encounterType, difficulty, involvedFactions, location } = request

  // Build character summary
  const powersList = character.powers.map(p => `${p.name}: ${p.narrativeStrengths.slice(0, 3).join(', ')}`).join('\n  - ')
  const attributesList = character.significantAttributes.map(a => `${a.id}: ${a.value}`).join(', ')
  const factionsList = character.factionStandings
    .filter(f => f.reputation !== 0)
    .map(f => `${f.factionName}: ${f.reputation} (${f.descriptor})`)
    .join('\n  - ')
  const recentEventsList = character.recentStoryEvents
    .slice(0, 5)
    .map(e => e.summary)
    .join('\n  - ')

  return `Generate a unique encounter for this character and situation:

CHARACTER:
- Name: ${character.name}
- Level: ${character.level}
- Origin: ${character.origin.name}
- Background: ${character.origin.backstory.substring(0, 300)}...
- Voice/Personality: ${character.origin.voiceTone}
- Narrative Tags: ${character.origin.narrativeTags.join(', ')}
${character.origin.nemesisType ? `- Nemesis Type: ${character.origin.nemesisType}` : ''}
${character.origin.secretWeakness ? `- Secret Weakness: ${character.origin.secretWeakness}` : ''}

POWERS:
  - ${powersList || 'None notable'}

SIGNIFICANT ATTRIBUTES:
  ${attributesList || 'None above threshold'}

FACTION STANDINGS:
  - ${factionsList || 'All neutral'}

RECENT STORY EVENTS:
  - ${recentEventsList || 'No significant events yet'}

CURRENT ACTION:
- Action: ${action.name}
- Category: ${action.category}
- Player Intent: ${action.narrativeContext}
- Location Type: ${location}

ENCOUNTER REQUIREMENTS:
- Category: ${encounterType}
- Target Difficulty: ${difficulty}
- Involved Factions: ${involvedFactions.join(', ')}

Create an encounter that:
1. Feels personal to this specific character's origin and powers
2. Reflects their faction relationships
3. Has meaningful choices that leverage their abilities
4. Matches the ${encounterType} category and difficulty ${difficulty}
5. Takes place in a ${location} setting
6. Builds on their recent story events if possible

Remember to output ONLY valid JSON matching the required structure.`
}

// Few-shot example from existing templates
export const FEW_SHOT_EXAMPLE = `
Example of a well-structured encounter:

{
  "id": "convenience_store_robbery_variant",
  "name": "Late Night Holdup",
  "category": "crime_in_progress",
  "difficulty": 3,
  "description": "The fluorescent lights of a corner store flicker as you hear raised voices inside. Through the scratched window, you see a young man in a hoodie waving a knife at the elderly owner. His hands are shaking—desperation, not malice. A child watches from behind a display, frozen in fear. This isn't a hardened criminal. This is someone at the end of their rope.",
  "flavorText": "You notice track marks on his arm. He keeps glancing at the door, torn between escape and the money he needs.",
  "choices": [
    {
      "id": "intervene_directly",
      "text": "Step in and confront him face-to-face",
      "requiredAttributes": [{"attributeId": "charisma", "minValue": 12}],
      "narrativeDescription": "Use your presence and words to defuse the situation"
    },
    {
      "id": "disable_quickly",
      "text": "Use your powers to end this instantly",
      "narrativeDescription": "Stop the threat before anyone gets hurt"
    },
    {
      "id": "create_distraction",
      "text": "Distract him so the civilians can escape",
      "requiredAttributes": [{"attributeId": "intelligence", "minValue": 10}],
      "narrativeDescription": "Prioritize getting innocents out of danger"
    },
    {
      "id": "wait_and_watch",
      "text": "Observe and intervene only if violence seems imminent",
      "narrativeDescription": "Sometimes the best action is patience"
    }
  ],
  "outcomes": [
    {
      "choiceId": "intervene_directly",
      "successChance": 0.65,
      "successResult": {
        "description": "You walk in, hands visible. 'Put the knife down. Whatever you're going through, this isn't the answer.' His eyes meet yours and you see the moment his resolve crumbles. The knife clatters to the floor. He collapses, sobbing. The owner calls the police while you stay with him until they arrive. The child peeks out and gives you a small wave.",
        "xpGain": 35,
        "factionChanges": [
          {"factionId": "civilian_population", "change": 6},
          {"factionId": "metro_police", "change": 3}
        ],
        "attributeGrowth": [{"attributeId": "charisma", "amount": 1}]
      },
      "failureResult": {
        "description": "You try to talk him down but his desperation is stronger than your words. He lunges at you with the knife. You disarm him, but not before he catches your arm. The situation is contained, but your approach didn't work as hoped.",
        "xpGain": 20,
        "factionChanges": [
          {"factionId": "civilian_population", "change": 2}
        ],
        "hpLoss": 15
      }
    },
    {
      "choiceId": "disable_quickly",
      "successChance": 0.75,
      "successResult": {
        "description": "In a blur of motion, you're there. The knife is out of his hand before he registers your presence. He's on the ground, restrained but unharmed. 'Don't hurt him!' the owner shouts—he recognizes the young man. Turns out it's his former employee, fallen on hard times. You've stopped a crime and maybe saved a life.",
        "xpGain": 30,
        "factionChanges": [
          {"factionId": "civilian_population", "change": 4},
          {"factionId": "metro_police", "change": 2}
        ]
      },
      "failureResult": {
        "description": "You move fast but he moves faster than you expected—adrenaline. The knife catches you before you can disarm him. He panics at the sight of blood and runs. The owner is safe, but the would-be robber is still out there, now terrified and unpredictable.",
        "xpGain": 15,
        "factionChanges": [
          {"factionId": "civilian_population", "change": 1}
        ],
        "hpLoss": 20
      }
    },
    {
      "choiceId": "create_distraction",
      "successChance": 0.7,
      "successResult": {
        "description": "You knock over a display outside. He whips around toward the noise. In that moment, the owner grabs the child and slips into the back room. When the robber turns back, his leverage is gone. You step into view. 'It's just us now. And you don't want to fight me.' He runs. Everyone is safe.",
        "xpGain": 32,
        "factionChanges": [
          {"factionId": "civilian_population", "change": 5},
          {"factionId": "vigilante_network", "change": 2}
        ],
        "attributeGrowth": [{"attributeId": "intelligence", "amount": 1}]
      },
      "failureResult": {
        "description": "Your distraction works too well. In his panic, he grabs the child before the owner can. Now you have a hostage situation. It takes another hour and police negotiators to resolve. Everyone gets out safe, but it was closer than it should have been.",
        "xpGain": 18,
        "factionChanges": [
          {"factionId": "civilian_population", "change": -1},
          {"factionId": "metro_police", "change": 1}
        ]
      }
    },
    {
      "choiceId": "wait_and_watch",
      "successChance": 0.6,
      "successResult": {
        "description": "You watch. The robber's nerve breaks before any real violence happens. He grabs a handful of bills and runs past you into the night. You could stop him but you let him go. The owner is shaken but unharmed. Sometimes the best heroics are the ones where no one gets hurt.",
        "xpGain": 25,
        "factionChanges": [
          {"factionId": "civilian_population", "change": 2}
        ]
      },
      "failureResult": {
        "description": "You wait too long. The owner makes a move for something under the counter—a weapon. The robber sees it. Things escalate fast. You intervene but not before the owner takes a cut to his arm. You stopped the worst outcome, but your hesitation had a cost.",
        "xpGain": 15,
        "factionChanges": [
          {"factionId": "civilian_population", "change": -2}
        ]
      }
    }
  ],
  "narrativeTags": ["street_crime", "moral_complexity", "desperation", "civilian_danger"],
  "requiredFactions": ["civilian_population"]
}`
