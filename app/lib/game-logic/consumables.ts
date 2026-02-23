/**
 * Consumables System (MVP)
 *
 * Single-use items that modify encounter resolution.
 * Players can hold a maximum of 2 consumables at a time.
 */

export type ConsumableType =
  | 'stim_patch'
  | 'med_injector'
  | 'signal_scrambler'

export interface ConsumableItem {
  id: string
  type: ConsumableType
  createdAt: string
}

export interface ConsumableDefinition {
  name: string
  description: string
  icon: string
}

export const CONSUMABLE_DEFINITIONS: Record<ConsumableType, ConsumableDefinition> = {
  stim_patch: {
    name: 'Stim Patch',
    description: '+2 to next encounter roll. +1 Heat.',
    icon: '💉',
  },
  med_injector: {
    name: 'Med Injector',
    description: 'Removes Wounded state.',
    icon: '🩹',
  },
  signal_scrambler: {
    name: 'Signal Scrambler',
    description: 'Prevents Heat gain from next encounter. -25% XP reward.',
    icon: '📡',
  },
}

export const MAX_CONSUMABLES = 2
export const CONSUMABLE_DROP_CHANCE = 0.3 // 30% chance after success

/**
 * Parse consumables from database JSON field
 */
export function parseConsumables(json: unknown): ConsumableItem[] {
  if (!json || !Array.isArray(json)) return []
  return json.filter((item): item is ConsumableItem =>
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    ['stim_patch', 'med_injector', 'signal_scrambler'].includes(item.type)
  )
}

/**
 * Find a consumable by ID in the player's inventory
 */
export function findConsumable(
  consumables: ConsumableItem[],
  consumableId: string
): ConsumableItem | undefined {
  return consumables.find(c => c.id === consumableId)
}

/**
 * Remove a consumable from the inventory
 */
export function removeConsumable(
  consumables: ConsumableItem[],
  consumableId: string
): ConsumableItem[] {
  return consumables.filter(c => c.id !== consumableId)
}

/**
 * Check if player can receive a new consumable
 */
export function canReceiveConsumable(consumables: ConsumableItem[]): boolean {
  return consumables.length < MAX_CONSUMABLES
}

/**
 * Generate a random consumable type
 */
export function getRandomConsumableType(): ConsumableType {
  const types: ConsumableType[] = ['stim_patch', 'med_injector', 'signal_scrambler']
  return types[Math.floor(Math.random() * types.length)]
}

/**
 * Create a new consumable item
 */
export function createConsumable(type: ConsumableType): ConsumableItem {
  return {
    id: crypto.randomUUID(),
    type,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Add a consumable to inventory (respecting max limit)
 */
export function addConsumable(
  consumables: ConsumableItem[],
  item: ConsumableItem
): ConsumableItem[] {
  if (consumables.length >= MAX_CONSUMABLES) return consumables
  return [...consumables, item]
}

/**
 * Get the display info for a consumable type
 */
export function getConsumableInfo(type: ConsumableType): ConsumableDefinition {
  return CONSUMABLE_DEFINITIONS[type]
}

/**
 * Check if a type is a valid consumable type
 */
export function isValidConsumableType(type: string): type is ConsumableType {
  return ['stim_patch', 'med_injector', 'signal_scrambler'].includes(type)
}
