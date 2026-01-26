// data/archetypes.ts

export type CharacterArchetypeId =
  | 'brawler'
  | 'skirmisher'
  | 'mind_adept'
  | 'guardian'
  | 'investigator';

export type CharacterArchetype = {
  id: CharacterArchetypeId;
  name: string;
  description: string;
  attributeBonuses: Record<string, number>;
};

export const archetypes: CharacterArchetype[] = [
  {
    id: 'brawler',
    name: 'Brawler',
    description: 'You prefer direct confrontation, relying on raw power and toughness to overcome obstacles.',
    attributeBonuses: {
      strength: 2,
      endurance: 1,
    },
  },
  {
    id: 'skirmisher',
    name: 'Skirmisher',
    description: 'Speed and precision are your weapons. You strike fast and avoid retaliation.',
    attributeBonuses: {
      agility: 2,
      stealth: 1,
    },
  },
  {
    id: 'mind_adept',
    name: 'Mind Adept',
    description: 'Your mental prowess sets you apart. You outthink and outmaneuver your opponents.',
    attributeBonuses: {
      intelligence: 2,
      willpower: 1,
    },
  },
  {
    id: 'guardian',
    name: 'Guardian',
    description: 'You protect others and endure what would break lesser individuals.',
    attributeBonuses: {
      endurance: 2,
      willpower: 1,
    },
  },
  {
    id: 'investigator',
    name: 'Investigator',
    description: 'Nothing escapes your notice. You gather information and strike when the moment is right.',
    attributeBonuses: {
      perception: 2,
      intelligence: 1,
    },
  },
];

export function getArchetypeById(id: string): CharacterArchetype | undefined {
  return archetypes.find((a) => a.id === id);
}
