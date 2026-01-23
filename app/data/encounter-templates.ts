// data/encounter-templates.ts

export type EncounterTemplate = {
  id: string
  name: string
  category: string // Maps to action.encounterTypes
  difficulty: number // 1-10
  
  // Requirements for this encounter to trigger
  requiredFactions?: string[] // At least one must be involved
  requiredLocation?: string[]
  minPlayerLevel?: number
  minNotoriety?: number
  minReputation?: number
  
  // Narrative content
  description: string // The scenario text
  flavorText?: string // Additional atmospheric detail
  
  // Player choices
  choices: {
    id: string
    text: string
    requiredPowers?: string[] // Can only choose if you have these
    requiredAttributes?: { attributeId: string, minValue: number }[]
    narrativeDescription: string // What this choice represents
  }[]
  
  // Outcomes per choice
  outcomes: {
    choiceId: string
    successChance: number // Base chance (0-1), modified by player stats
    successResult: {
      description: string
      xpGain: number
      factionChanges: { factionId: string, change: number }[]
      attributeGrowth?: { attributeId: string, amount: number }[]
      itemsGained?: string[]
    }
    failureResult: {
      description: string
      xpGain: number // Usually less than success
      factionChanges: { factionId: string, change: number }[]
      hpLoss?: number
      itemsLost?: string[]
    }
  }[]
  
  // For AI context when generating variations
  narrativeTags: string[]
  canBeReused: boolean // Can this template appear multiple times?
  timesUsed?: number // Track usage for variety
}

export const encounterTemplates: EncounterTemplate[] = [
  // === CRIME IN PROGRESS ===
  {
    id: 'convenience_store_robbery',
    name: 'Convenience Store Robbery',
    category: 'crime_in_progress',
    difficulty: 2,
    requiredFactions: ['street_gangs', 'civilian_population'],
    
    description: 'You hear shouting from a 24-hour convenience store. Through the window, you see three masked figures waving guns at the terrified clerk. One is stuffing cash into a backpack while another keeps watch on the door. Civilians across the street are filming with their phones.',
    
    flavorText: 'The lead robber is getting agitated, shouting "Faster! Faster!" at his accomplice.',
    
    choices: [
      {
        id: 'burst_through_door',
        text: 'Burst through the door and confront them directly',
        requiredAttributes: [{ attributeId: 'strength', minValue: 12 }],
        narrativeDescription: 'Direct physical confrontation, high visibility'
      },
      {
        id: 'stealth_disarm',
        text: 'Sneak around back and disarm them quietly',
        requiredAttributes: [{ attributeId: 'stealth', minValue: 10 }],
        narrativeDescription: 'Subtle approach, minimal civilian risk'
      },
      {
        id: 'intimidate_surrender',
        text: 'Make a dramatic entrance and demand they surrender',
        requiredAttributes: [{ attributeId: 'charisma', minValue: 10 }],
        narrativeDescription: 'Psychological approach, plays to the cameras'
      },
      {
        id: 'call_police',
        text: 'Keep watch and coordinate with police',
        narrativeDescription: 'Safe approach, shares credit with law enforcement'
      }
    ],
    
    outcomes: [
      {
        choiceId: 'burst_through_door',
        successChance: 0.7,
        successResult: {
          description: 'You crash through the door. The robbers freeze in shock. Two drop their weapons immediately. The third fires wildly, missing completely. You disarm him in seconds. The clerk is safe, the robbers subdued. Cameras caught everything.',
          xpGain: 30,
          factionChanges: [
            { factionId: 'civilian_population', change: 5 },
            { factionId: 'metro_police', change: 3 },
            { factionId: 'media_corporations', change: 2 }
          ],
          attributeGrowth: [
            { attributeId: 'reputation', amount: 2 }
          ]
        },
        failureResult: {
          description: 'You burst in but slip on spilled merchandise. A robber panics and fires. The bullet grazes your shoulder. In the chaos, they escape through the back. The clerk is safe but shaken. The cameras caught your stumble.',
          xpGain: 15,
          factionChanges: [
            { factionId: 'civilian_population', change: 1 },
            { factionId: 'media_corporations', change: -1 }
          ],
          hpLoss: 15
        }
      },
      {
        choiceId: 'stealth_disarm',
        successChance: 0.65,
        successResult: {
          description: 'You slip through the back door silently. Moving like a shadow, you disable each robber before they realize you\'re there. The clerk barely notices until it\'s over. No shots fired, no injuries. The police arrive to find them gift-wrapped.',
          xpGain: 35,
          factionChanges: [
            { factionId: 'metro_police', change: 4 },
            { factionId: 'civilian_population', change: 3 },
            { factionId: 'vigilante_network', change: 2 }
          ],
          attributeGrowth: [
            { attributeId: 'stealth', amount: 1 }
          ]
        },
        failureResult: {
          description: 'You try to sneak in but knock over a display. The robbers spin around. One grabs the clerk as a hostage. You manage to defuse the situation, but they escape in the confusion. At least no one got hurt.',
          xpGain: 20,
          factionChanges: [
            { factionId: 'civilian_population', change: 2 }
          ]
        }
      },
      {
        choiceId: 'intimidate_surrender',
        successChance: 0.6,
        successResult: {
          description: 'You step into the doorway, power crackling visibly around you. "You have three seconds to drop the guns," you say calmly. They look at each other, then at you, then at their pathetic weapons. The guns clatter to the floor. The crowd outside cheers.',
          xpGain: 32,
          factionChanges: [
            { factionId: 'civilian_population', change: 6 },
            { factionId: 'media_corporations', change: 4 },
            { factionId: 'street_gangs', change: -2 }
          ],
          attributeGrowth: [
            { attributeId: 'reputation', amount: 3 },
            { attributeId: 'charisma', amount: 1 }
          ]
        },
        failureResult: {
          description: 'You make your dramatic entrance but one robber doesn\'t buy it. "Shoot the hero!" he screams. Bullets fly. You dodge most of them but take a hit. They escape in the chaos. The cameras got your bleeding, which isn\'t great for the image.',
          xpGain: 18,
          factionChanges: [
            { factionId: 'civilian_population', change: 1 },
            { factionId: 'media_corporations', change: -2 }
          ],
          hpLoss: 20
        }
      },
      {
        choiceId: 'call_police',
        successChance: 0.8,
        successResult: {
          description: 'You coordinate with dispatch, keeping eyes on the exits. When police arrive, you guide them in. The robbers are caught without incident. The police lieutenant nods at you. "Good work, civilian cooperation." Not glamorous, but effective.',
          xpGain: 20,
          factionChanges: [
            { factionId: 'metro_police', change: 5 },
            { factionId: 'civilian_population', change: 2 }
          ]
        },
        failureResult: {
          description: 'Police response is slow. By the time they arrive, the robbers are gone. At least you kept civilians safe and out of the line of fire. The police thank you for calling it in.',
          xpGain: 10,
          factionChanges: [
            { factionId: 'metro_police', change: 2 }
          ]
        }
      }
    ],
    
    narrativeTags: ['street_crime', 'public', 'media_attention', 'civilian_danger'],
    canBeReused: true
  },

  {
    id: 'gang_turf_war',
    name: 'Turf War Eruption',
    category: 'gang_violence',
    difficulty: 5,
    requiredFactions: ['street_gangs'],
    requiredLocation: ['slums', 'gang_territory'],
    
    description: 'Two rival gangs are shooting at each other across an intersection. Civilians are trapped in the crossfire—a mother shielding her children behind a car, an old man frozen in terror on the sidewalk. This has been brewing for weeks, and tonight it erupted.',
    
    flavorText: 'Muzzle flashes light up the street. Someone is screaming. Sirens wail in the distance but they\'re minutes away.',
    
    choices: [
      {
        id: 'stop_both_sides',
        text: 'Step between them and force a ceasefire',
        requiredPowers: ['super_strength', 'force_field', 'enhanced_durability'],
        narrativeDescription: 'Use overwhelming power to shut down both sides'
      },
      {
        id: 'evacuate_civilians',
        text: 'Focus on getting civilians to safety',
        requiredAttributes: [{ attributeId: 'agility', minValue: 12 }],
        narrativeDescription: 'Prioritize innocent lives over stopping the gangs'
      },
      {
        id: 'take_down_leaders',
        text: 'Identify and neutralize the gang leaders',
        requiredAttributes: [{ attributeId: 'perception', minValue: 14 }],
        narrativeDescription: 'Cut the head off both snakes simultaneously'
      },
      {
        id: 'side_with_locals',
        text: 'Help the local gang defend their territory',
        narrativeDescription: 'The enemy of order might be your ally'
      }
    ],
    
    outcomes: [
      {
        choiceId: 'stop_both_sides',
        successChance: 0.65,
        successResult: {
          description: 'You step into the intersection, absorbing bullets like rain. "ENOUGH!" Your voice echoes off buildings. Both sides freeze. Some drop weapons, others run. The shooting stops. Civilians flee to safety. Both gangs will remember this.',
          xpGain: 50,
          factionChanges: [
            { factionId: 'civilian_population', change: 8 },
            { factionId: 'street_gangs', change: -5 },
            { factionId: 'vigilante_network', change: 4 }
          ],
          attributeGrowth: [
            { attributeId: 'reputation', amount: 3 }
          ]
        },
        failureResult: {
          description: 'You try to interpose yourself but there are too many shooters, too many angles. A bullet finds a gap in your defense, hitting a civilian behind you. The gangs scatter. You carry the wounded to paramedics. The neighborhood will remember you failed them.',
          xpGain: 25,
          factionChanges: [
            { factionId: 'civilian_population', change: -3 }
          ],
          hpLoss: 25
        }
      },
      {
        choiceId: 'evacuate_civilians',
        successChance: 0.75,
        successResult: {
          description: 'You move like lightning, pulling people from the crossfire. The mother and her kids. The old man. A teenager frozen in shock. You get them all to safety while bullets whiz past. The gangs keep fighting but no innocents die tonight.',
          xpGain: 45,
          factionChanges: [
            { factionId: 'civilian_population', change: 10 },
            { factionId: 'vigilante_network', change: 3 }
          ],
          attributeGrowth: [
            { attributeId: 'agility', amount: 1 }
          ]
        },
        failureResult: {
          description: 'You manage to save most of them but you can\'t be everywhere. One civilian doesn\'t make it. You got the others out, but the sound of gunfire and screaming will haunt you.',
          xpGain: 30,
          factionChanges: [
            { factionId: 'civilian_population', change: 3 }
          ],
          hpLoss: 15
        }
      },
      {
        choiceId: 'take_down_leaders',
        successChance: 0.55,
        successResult: {
          description: 'You spot them—the shot-callers directing from behind cover. In seconds, you neutralize both. Without leadership, the gangs break apart, running in different directions. The war is over before police arrive. Both organizations just took a major hit.',
          xpGain: 55,
          factionChanges: [
            { factionId: 'street_gangs', change: -8 },
            { factionId: 'metro_police', change: 6 },
            { factionId: 'civilian_population', change: 6 }
          ],
          attributeGrowth: [
            { attributeId: 'intelligence', amount: 1 },
            { attributeId: 'perception', amount: 1 }
          ]
        },
        failureResult: {
          description: 'You identify one leader and take him down, but his second-in-command rallies the gang. The fighting intensifies. You\'ve made it worse. Eventually they scatter, but not before more blood is spilled.',
          xpGain: 28,
          factionChanges: [
            { factionId: 'street_gangs', change: -4 },
            { factionId: 'civilian_population', change: -1 }
          ],
          hpLoss: 20
        }
      },
      {
        choiceId: 'side_with_locals',
        successChance: 0.7,
        successResult: {
          description: 'The local gang leader recognizes you. "Help us hold the line!" You do. Together you drive off the invaders. Civilians get caught in the crossfire, but the neighborhood stays in local hands. You just picked a side in a gang war.',
          xpGain: 40,
          factionChanges: [
            { factionId: 'street_gangs', change: 10 },
            { factionId: 'metro_police', change: -5 },
            { factionId: 'civilian_population', change: -2 }
          ],
          attributeGrowth: [
            { attributeId: 'notoriety', amount: 2 }
          ]
        },
        failureResult: {
          description: 'You help the locals but they\'re overwhelmed. The invading gang takes the territory anyway. Now both gangs see you as an enemy, and the civilians blame you for the violence.',
          xpGain: 20,
          factionChanges: [
            { factionId: 'street_gangs', change: -6 },
            { factionId: 'civilian_population', change: -4 }
          ],
          hpLoss: 30
        }
      }
    ],
    
    narrativeTags: ['gang_war', 'violence', 'civilian_danger', 'moral_choice'],
    canBeReused: true
  },

  {
    id: 'building_fire_rescue',
    name: 'Apartment Fire',
    category: 'fire_rescue',
    difficulty: 6,
    requiredFactions: ['civilian_population'],
    
    description: 'An apartment building is engulfed in flames. Fire trucks are just arriving but the blaze is spreading fast. You can hear screaming from upper floors. Firefighters are setting up but they\'ll be too late for whoever\'s trapped up there. Black smoke pours from broken windows.',
    
    flavorText: 'A woman on the street is screaming about her daughter on the fourth floor. The heat is intense even from here.',
    
    choices: [
      {
        id: 'fly_rescue',
        text: 'Fly up and pull people out through windows',
        requiredPowers: ['flight'],
        narrativeDescription: 'Direct aerial rescue of trapped victims'
      },
      {
        id: 'strength_breach',
        text: 'Tear through the building to create evacuation routes',
        requiredPowers: ['super_strength'],
        narrativeDescription: 'Use raw power to make safe paths out'
      },
      {
        id: 'endure_and_carry',
        text: 'Run through the flames and carry people out',
        requiredAttributes: [{ attributeId: 'endurance', minValue: 14 }],
        narrativeDescription: 'Tank the damage and save lives through determination'
      },
      {
        id: 'coordinate_rescue',
        text: 'Work with firefighters to organize the rescue',
        requiredAttributes: [{ attributeId: 'intelligence', minValue: 12 }],
        narrativeDescription: 'Support professionals with powers and coordination'
      }
    ],
    
    outcomes: [
      {
        choiceId: 'fly_rescue',
        successChance: 0.8,
        successResult: {
          description: 'You soar up to the fourth floor. The mother\'s daughter first—terrified but alive. Then an elderly couple. A family of four. Trip after trip through smoke and heat until everyone is out. Firefighters applaud. The mother weeps with gratitude. News helicopters caught everything.',
          xpGain: 60,
          factionChanges: [
            { factionId: 'civilian_population', change: 12 },
            { factionId: 'media_corporations', change: 6 },
            { factionId: 'guardian_initiative', change: 4 }
          ],
          attributeGrowth: [
            { attributeId: 'reputation', amount: 4 }
          ]
        },
        failureResult: {
          description: 'You save most of them but the smoke is overwhelming. You miss one room, one family. Firefighters pull them out barely alive. You saved lives, but not all of them. The guilt is crushing.',
          xpGain: 40,
          factionChanges: [
            { factionId: 'civilian_population', change: 5 }
          ],
          hpLoss: 20
        }
      },
      {
        choiceId: 'strength_breach',
        successChance: 0.7,
        successResult: {
          description: 'You tear through walls, creating clear paths to the exits. Residents pour through the holes you\'ve made in the smoke and flames. Your routes bypass the worst of the fire. Everyone gets out. The building is a wreck but it was already doomed. Lives saved.',
          xpGain: 55,
          factionChanges: [
            { factionId: 'civilian_population', change: 10 },
            { factionId: 'metro_police', change: 3 }
          ],
          attributeGrowth: [
            { attributeId: 'strength', amount: 1 }
          ]
        },
        failureResult: {
          description: 'Your breach weakens structural supports. Part of the building collapses. You barely avoid being crushed. Firefighters have to pull back. Some residents make it out through your path, but others are trapped by the collapse.',
          xpGain: 30,
          factionChanges: [
            { factionId: 'civilian_population', change: 2 },
            { factionId: 'city_government', change: -3 }
          ],
          hpLoss: 35
        }
      },
      {
        choiceId: 'endure_and_carry',
        successChance: 0.65,
        successResult: {
          description: 'You run into the inferno. Heat sears your skin but you push through. One person over your shoulder, another under your arm. Again. And again. You\'re burning but you don\'t stop. When you finally emerge with the last victim, you collapse. Paramedics treat your burns. You\'ll heal. They won\'t forget.',
          xpGain: 65,
          factionChanges: [
            { factionId: 'civilian_population', change: 15 },
            { factionId: 'vigilante_network', change: 5 }
          ],
          attributeGrowth: [
            { attributeId: 'endurance', amount: 2 },
            { attributeId: 'reputation', amount: 3 }
          ]
        },
        failureResult: {
          description: 'The heat and smoke are too much. You save three people before you collapse from smoke inhalation. Firefighters pull you out along with other victims. You tried. Your body couldn\'t take it.',
          xpGain: 35,
          factionChanges: [
            { factionId: 'civilian_population', change: 6 }
          ],
          hpLoss: 40
        }
      },
      {
        choiceId: 'coordinate_rescue',
        successChance: 0.75,
        successResult: {
          description: 'You brief the fire chief, share building layout you gathered with your powers, coordinate entry points. Your intel lets firefighters work twice as fast. Together you get everyone out. The chief shakes your hand. "More heroes should work with us like this."',
          xpGain: 50,
          factionChanges: [
            { factionId: 'civilian_population', change: 8 },
            { factionId: 'metro_police', change: 6 },
            { factionId: 'city_government', change: 4 }
          ],
          attributeGrowth: [
            { attributeId: 'intelligence', amount: 1 }
          ]
        },
        failureResult: {
          description: 'Communication breaks down in the chaos. Your coordination helps but isn\'t perfect. Most victims are saved but response is slower than it could\'ve been. Firefighters appreciate the attempt but wish the system worked better.',
          xpGain: 35,
          factionChanges: [
            { factionId: 'civilian_population', change: 4 },
            { factionId: 'metro_police', change: 2 }
          ]
        }
      }
    ],
    
    narrativeTags: ['rescue', 'emergency', 'heroic', 'media_attention', 'life_or_death'],
    canBeReused: true
  },

  {
    id: 'syndicate_recruitment',
    name: 'Syndicate Offer',
    category: 'shady_contact',
    difficulty: 4,
    requiredFactions: ['syndicate'],
    minNotoriety: 10,
    
    description: 'A well-dressed woman approaches you in a dimly lit bar. "My employer has noticed your... talents," she says, sliding a card across the table. It has no name, just an address and a time. "We pay well for people with your skills. The work isn\'t legal, but since when do people like us care about laws?"',
    
    flavorText: 'She\'s calm, professional. This isn\'t her first recruitment pitch. The card is embossed with a snake eating its tail.',
    
    choices: [
      {
        id: 'accept_offer',
        text: 'Take the card and agree to meet',
        narrativeDescription: 'Enter the criminal underworld officially'
      },
      {
        id: 'demand_details',
        text: 'Demand to know more before committing',
        requiredAttributes: [{ attributeId: 'charisma', minValue: 12 }],
        narrativeDescription: 'Negotiate from a position of strength'
      },
      {
        id: 'refuse_politely',
        text: 'Decline but keep the door open',
        narrativeDescription: 'Stay neutral for now'
      },
      {
        id: 'arrest_attempt',
        text: 'Try to apprehend her and gather intel',
        narrativeDescription: 'Use this as an opportunity against the Syndicate'
      }
    ],
    
    outcomes: [
      {
        choiceId: 'accept_offer',
        successChance: 0.9,
        successResult: {
          description: 'You take the card. She smiles. "Welcome to the winning team." You show up at the address—a warehouse full of people like you. Powered. Organized. Well-paid. The Syndicate has its hooks in you now, but the opportunities are real.',
          xpGain: 30,
          factionChanges: [
            { factionId: 'syndicate', change: 15 },
            { factionId: 'metro_police', change: -5 },
            { factionId: 'guardian_initiative', change: -8 }
          ],
          attributeGrowth: [
            { attributeId: 'notoriety', amount: 2 }
          ]
        },
        failureResult: {
          description: 'You show up to the address but it\'s a test—a loyalty test. They want you to hurt someone to prove yourself. You do it, but you can see them measuring you, judging if you\'re reliable. You\'re in, but on thin ice.',
          xpGain: 25,
          factionChanges: [
            { factionId: 'syndicate', change: 8 },
            { factionId: 'civilian_population', change: -3 }
          ]
        }
      },
      {
        choiceId: 'demand_details',
        successChance: 0.6,
        successResult: {
          description: 'She respects the boldness. "Fair enough." She lays out the structure—protection, smuggling, occasional enforcement. Big money, clear rules, loyalty rewarded. You negotiate better terms. She agrees. "I like you. This will work well."',
          xpGain: 35,
          factionChanges: [
            { factionId: 'syndicate', change: 12 },
            { factionId: 'black_market', change: 3 }
          ],
          attributeGrowth: [
            { attributeId: 'charisma', amount: 1 }
          ]
        },
        failureResult: {
          description: 'She doesn\'t appreciate being questioned. "We don\'t audition for talent. Either you\'re in or you\'re not." She takes the card back. "Call us if you change your mind. If we still want you." The opportunity slips away.',
          xpGain: 15,
          factionChanges: [
            { factionId: 'syndicate', change: -3 }
          ]
        }
      },
      {
        choiceId: 'refuse_politely',
        successChance: 0.85,
        successResult: {
          description: 'You decline respectfully. "I appreciate the offer, but I\'m not ready to commit." She nods. "Smart. Take your time. The offer stands. We\'ll be watching." You\'ve kept your options open without burning bridges.',
          xpGain: 20,
          factionChanges: [
            { factionId: 'syndicate', change: 2 }
          ]
        },
        failureResult: {
          description: 'She seems disappointed. "Shame. We could\'ve done great things." As she leaves, you notice other Syndicate members watching. They\'re marking you—not an enemy, but not a friend. Neutrality has its own risks.',
          xpGain: 15,
          factionChanges: []
        }
      },
      {
        choiceId: 'arrest_attempt',
        successChance: 0.4,
        successResult: {
          description: 'You grab her arm. "You\'re under citizen\'s arrest." She laughs, then her guards appear. You fight them off and escape with her phone—loaded with Syndicate contacts. Police are very grateful. The Syndicate is very angry.',
          xpGain: 50,
          factionChanges: [
            { factionId: 'metro_police', change: 10 },
            { factionId: 'syndicate', change: -20 },
            { factionId: 'guardian_initiative', change: 5 }
          ],
          attributeGrowth: [
            { attributeId: 'reputation', amount: 2 }
          ]
        },
        failureResult: {
          description: 'You try to grab her but she was ready. A taser hits you from behind. You wake up in an alley hours later, beaten badly. Message received: don\'t mess with the Syndicate. They know who you are now. That\'s dangerous.',
          xpGain: 20,
          factionChanges: [
            { factionId: 'syndicate', change: -15 }
          ],
          hpLoss: 35
        }
      }
    ],
    
    narrativeTags: ['recruitment', 'criminal', 'moral_choice', 'syndicate'],
    canBeReused: false
  },

  {
    id: 'media_ambush_interview',
    name: 'Ambush Interview',
    category: 'media_encounter',
    difficulty: 3,
    requiredFactions: ['media_corporations'],
    minReputation: 20,
    
    description: 'A reporter and camera crew intercept you after you finish dealing with an incident. "Just a few questions!" she calls out, microphone extended. You recognize her—Miranda Chen, investigative journalist known for tough questions. The camera is already rolling. Passersby are watching.',
    
    flavorText: 'Her first question comes fast: "Your methods have been called reckless. How do you respond to critics who say you\'re making things worse?"',
    
    choices: [
      {
        id: 'thoughtful_response',
        text: 'Give a measured, thoughtful answer',
        requiredAttributes: [{ attributeId: 'intelligence', minValue: 12 }],
        narrativeDescription: 'Handle the interview professionally'
      },
      {
        id: 'charming_deflection',
        text: 'Deflect with charm and humor',
        requiredAttributes: [{ attributeId: 'charisma', minValue: 13 }],
        narrativeDescription: 'Win the crowd without answering directly'
      },
      {
        id: 'no_comment',
        text: 'Refuse to engage and leave',
        narrativeDescription: 'Protect your privacy, look evasive'
      },
      {
        id: 'power_display',
        text: 'Demonstrate your powers dramatically',
        narrativeDescription: 'Let actions speak instead of words'
      }
    ],
    
    outcomes: [
      {
        choiceId: 'thoughtful_response',
        successChance: 0.7,
        successResult: {
          description: 'You articulate your philosophy clearly: why you do what you do, how you make decisions, what principles guide you. Miranda nods, asking follow-ups. By the end, even she seems impressed. The segment airs that night—you come across as intelligent and principled.',
          xpGain: 30,
          factionChanges: [
            { factionId: 'media_corporations', change: 8 },
            { factionId: 'civilian_population', change: 6 },
            { factionId: 'city_government', change: 4 }
          ],
          attributeGrowth: [
            { attributeId: 'reputation', amount: 3 }
          ]
        },
        failureResult: {
          description: 'You try to explain but your words come out tangled. Miranda pounces on contradictions. The edited interview makes you look confused and uncertain. Your intentions were good but you fumbled the execution.',
          xpGain: 15,
          factionChanges: [
            { factionId: 'media_corporations', change: -2 },
            { factionId: 'civilian_population', change: -1 }
          ]
        }
      },
      {
        choiceId: 'charming_deflection',
        successChance: 0.75,
        successResult: {
          description: 'You smile. "Miranda, you know I can\'t reveal all my secrets." You banter, make the crowd laugh, sign an autograph for a kid watching. You don\'t answer the hard questions but nobody cares—you\'re likeable. The segment is pure positive PR.',
          xpGain: 25,
          factionChanges: [
            { factionId: 'media_corporations', change: 5 },
            { factionId: 'civilian_population', change: 8 }
          ],
          attributeGrowth: [
            { attributeId: 'charisma', amount: 1 },
            { attributeId: 'reputation', amount: 2 }
          ]
        },
        failureResult: {
          description: 'You try to charm your way out but Miranda is persistent. "That\'s not an answer," she presses. The crowd starts to sense you\'re dodging. The interview gets uncomfortable. You come across as slippery.',
          xpGain: 15,
          factionChanges: [
            { factionId: 'media_corporations', change: -1 },
            { factionId: 'civilian_population', change: -2 }
          ]
        }
      },
      {
        choiceId: 'no_comment',
        successChance: 0.9,
        successResult: {
          description: '"No comment." You walk away without engaging. Miranda calls after you but you don\'t turn back. The segment airs showing you refusing to answer—mysterious, private. Some people respect the boundary. Others think you\'re hiding something.',
          xpGain: 15,
          factionChanges: [
            { factionId: 'vigilante_network', change: 3 },
            { factionId: 'media_corporations', change: -3 }
          ]
        },
        failureResult: {
          description: 'You refuse to comment but Miranda spins it negatively. "Refuses to answer questions about civilian safety concerns." The framing makes you look guilty of something. Should\'ve engaged or made a cleaner exit.',
          xpGain: 10,
          factionChanges: [
            { factionId: 'media_corporations', change: -5 },
            { factionId: 'civilian_population', change: -3 }
          ]
        }
      },
      {
        choiceId: 'power_display',
        successChance: 0.65,
        successResult: {
          description: 'Instead of words, you demonstrate—a controlled display of your abilities that\'s impressive without being threatening. The crowd gasps. Miranda\'s jaw drops. The footage goes viral. "Actions speak louder than words," you say, then leave. Perfect soundbite.',
          xpGain: 35,
          factionChanges: [
            { factionId: 'media_corporations', change: 10 },
            { factionId: 'civilian_population', change: 7 },
            { factionId: 'guardian_initiative', change: -2 }
          ],
          attributeGrowth: [
            { attributeId: 'reputation', amount: 4 }
          ]
        },
        failureResult: {
          description: 'Your power display goes wrong—property damage, someone gets scared. Miranda captures it all. The segment makes you look reckless and showboating. "This is exactly what critics mean," she says in voiceover. PR disaster.',
          xpGain: 20,
          factionChanges: [
            { factionId: 'media_corporations', change: -4 },
            { factionId: 'civilian_population', change: -5 },
            { factionId: 'city_government', change: -3 }
          ]
        }
      }
    ],
    
    narrativeTags: ['media', 'public_relations', 'reputation_management'],
    canBeReused: true
  }
]

// === HELPER FUNCTIONS ===

export function getEncounterTemplateById(id: string): EncounterTemplate | undefined {
  return encounterTemplates.find(e => e.id === id)
}

export function getEncountersByCategory(category: string): EncounterTemplate[] {
  return encounterTemplates.filter(e => e.category === category)
}

export function getEncountersByDifficulty(minDiff: number, maxDiff: number): EncounterTemplate[] {
  return encounterTemplates.filter(e => e.difficulty >= minDiff && e.difficulty <= maxDiff)
}

export function getAvailableEncounters(
  category: string,
  difficulty: number,
  playerLevel: number,
  playerReputation: number,
  playerNotoriety: number,
  involvedFactions: string[],
  location?: string
): EncounterTemplate[] {
  return encounterTemplates.filter(template => {
    // Match category
    if (template.category !== category) return false
    
    // Check difficulty is reasonable (within 2 levels)
    if (Math.abs(template.difficulty - difficulty) > 2) return false
    
    // Check level requirement
    if (template.minPlayerLevel && playerLevel < template.minPlayerLevel) return false
    
    // Check reputation/notoriety requirements
    if (template.minReputation && playerReputation < template.minReputation) return false
    if (template.minNotoriety && playerNotoriety < template.minNotoriety) return false
    
    // Check faction involvement
    if (template.requiredFactions && template.requiredFactions.length > 0) {
      const hasFaction = template.requiredFactions.some(f => involvedFactions.includes(f))
      if (!hasFaction) return false
    }
    
    // Check location
    if (template.requiredLocation && location) {
      if (!template.requiredLocation.includes(location)) return false
    }
    
    return true
  })
}

export function selectRandomEncounter(availableEncounters: EncounterTemplate[]): EncounterTemplate | null {
  if (availableEncounters.length === 0) return null
  
  // Prefer encounters that have been used less
  const sorted = [...availableEncounters].sort((a, b) => {
    const aUses = a.timesUsed || 0
    const bUses = b.timesUsed || 0
    return aUses - bUses
  })
  
  // Weight toward less-used encounters
  const weights = sorted.map((_, i) => Math.pow(0.8, i))
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  
  let random = Math.random() * totalWeight
  for (let i = 0; i < sorted.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return sorted[i]
    }
  }
  
  return sorted[0]
}

export function calculateOutcomeSuccess(
  outcome: EncounterTemplate['outcomes'][0],
  playerPowers: string[],
  playerAttributes: Record<string, number>,
  choice: EncounterTemplate['choices'][0]
): boolean {
  let successChance = outcome.successChance
  
  // Bonus for having required powers
  if (choice.requiredPowers) {
    const hasPowers = choice.requiredPowers.some(p => playerPowers.includes(p))
    if (hasPowers) successChance += 0.1
  }
  
  // Bonus for exceeding attribute requirements
  if (choice.requiredAttributes) {
    choice.requiredAttributes.forEach(req => {
      const playerValue = playerAttributes[req.attributeId] || 0
      const excess = playerValue - req.minValue
      if (excess > 5) successChance += 0.05
      if (excess > 10) successChance += 0.05
    })
  }
  
  // Cap at 0.95 (always 5% chance of failure)
  successChance = Math.min(0.95, successChance)
  
  return Math.random() < successChance
}