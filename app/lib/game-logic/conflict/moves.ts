import type { MoveDefinition, MoveId, ConflictResources } from './types';

export const CONFLICT_MOVES: Record<MoveId, MoveDefinition> = {
  pressure: {
    id: 'pressure',
    name: 'Pressure',
    description: 'Spend control to damage opponent stability and position.',
    requires: { control: 1 },
    selfEffect: { control: -1 },
    opponentEffect: { stability: -1, position: -1 },
    counterBonus: {
      triggeredBy: 'stabilize',
      opponentEffect: { stability: -1 },
    },
  },
  seize_control: {
    id: 'seize_control',
    name: 'Seize Control',
    description: 'Trade position for control and weaken opponent control.',
    requires: { position: 2 },
    selfEffect: { control: 1, position: -1 },
    opponentEffect: { control: -1 },
    counterBonus: {
      triggeredBy: 'feint',
      selfEffect: { control: 1 },
    },
  },
  reposition: {
    id: 'reposition',
    name: 'Reposition',
    description: 'Trade stability for better position.',
    requires: { stability: 1 },
    selfEffect: { position: 1, stability: -1 },
    opponentEffect: {},
    counterBonus: {
      triggeredBy: 'pressure',
      selfEffect: { position: 1 },
    },
  },
  stabilize: {
    id: 'stabilize',
    name: 'Stabilize',
    description: 'Recover stability. No requirements.',
    requires: {},
    selfEffect: { stability: 1 },
    opponentEffect: {},
    counterBonus: {
      triggeredBy: 'withdraw',
      selfEffect: { stability: 1, control: 1 },
    },
  },
  feint: {
    id: 'feint',
    name: 'Feint',
    description: 'Spend control to reduce opponent position.',
    requires: { control: 1 },
    selfEffect: { control: -1 },
    opponentEffect: { position: -1 },
    counterBonus: {
      triggeredBy: 'seize_control',
      opponentEffect: { control: -1 },
    },
  },
  withdraw: {
    id: 'withdraw',
    name: 'Withdraw',
    description: 'Gain stability but lose position. No requirements.',
    requires: {},
    selfEffect: { stability: 1, position: -1 },
    opponentEffect: {},
    counterBonus: {
      triggeredBy: 'pressure',
      selfEffect: { stability: 1 },
    },
  },
};

export const ALL_MOVE_IDS: MoveId[] = [
  'pressure',
  'seize_control',
  'reposition',
  'stabilize',
  'feint',
  'withdraw',
];

/** Check if a specific move can be used given current resources */
export function isMoveAvailable(moveId: MoveId, resources: ConflictResources): boolean {
  const move = CONFLICT_MOVES[moveId];
  for (const [key, min] of Object.entries(move.requires)) {
    if ((resources[key as keyof ConflictResources] ?? 0) < (min ?? 0)) {
      return false;
    }
  }
  return true;
}

/** Return all moves available to a combatant with the given resources */
export function getAvailableMoves(resources: ConflictResources): MoveId[] {
  return ALL_MOVE_IDS.filter((id) => isMoveAvailable(id, resources));
}
