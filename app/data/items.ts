// data/items.ts

export type ItemType = 'consumable' | 'equipment' | 'quest' | 'crafting' | 'valuable'
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type EquipmentSlot = 'head' | 'body' | 'hands' | 'accessory' | 'weapon' | 'utility'

export type Item = {
  id: string
  name: string
  description: string
  type: ItemType
  rarity: ItemRarity
  
  // Visual/flavor
  flavorText?: string
  
  // Equipment-specific
  equipmentSlot?: EquipmentSlot
  equipmentEffects?: {
    attributeBonus?: Record<string, number> // e.g., { strength: 5 }
    powerBonus?: { powerId: string, effectivenessBonus: number }[] // Boost specific powers
    damageReduction?: number // Percentage
    energyRegeneration?: number // Bonus energy per rest
    specialEffect?: string // Description of unique effect
  }
  
  // Consumable-specific
  consumableEffects?: {
    hpRestore?: number
    energyRestore?: number
    temporaryBuff?: {
      attributeId: string
      bonus: number
      duration: number // In encounters/hours
    }
    removeDebuff?: boolean
  }
  
  // Quest item
  questId?: string // Links to a specific quest/storyline
  
  // Economy
  value: number // Base selling price
  buyPrice?: number // If purchasable
  canDrop: boolean // Can be lost on failure
  stackable: boolean // Can have multiple
  maxStack?: number
  
  // Acquisition
  foundIn: string[] // Where this can be obtained
  droppedBy?: string[] // NPC IDs or encounter types
  craftingRecipe?: {
    requiredItems: { itemId: string, quantity: number }[]
    requiredFaction?: { factionId: string, minReputation: number }
  }
  
  // Narrative hooks
  loreText?: string // Background story of the item
  narrativeTags: string[]
}

export const items: Item[] = [
  // === CONSUMABLES ===
  {
    id: 'medkit_basic',
    name: 'Basic Med Kit',
    description: 'Standard medical supplies for treating injuries',
    type: 'consumable',
    rarity: 'common',
    flavorText: 'Bandages, antiseptic, and pain medication. Military surplus.',
    
    consumableEffects: {
      hpRestore: 30
    },
    
    value: 50,
    buyPrice: 75,
    canDrop: false,
    stackable: true,
    maxStack: 5,
    
    foundIn: ['black_market', 'pharmacies', 'loot_drops'],
    narrativeTags: ['medical', 'healing', 'utility']
  },

  {
    id: 'medkit_advanced',
    name: 'Advanced Med Kit',
    description: 'High-grade medical equipment with rapid-healing compounds',
    type: 'consumable',
    rarity: 'uncommon',
    flavorText: 'Stolen from a Guardian Initiative supply cache. Top-tier stuff.',
    
    consumableEffects: {
      hpRestore: 60,
      removeDebuff: true
    },
    
    value: 200,
    buyPrice: 350,
    canDrop: false,
    stackable: true,
    maxStack: 3,
    
    foundIn: ['guardian_hq', 'black_market', 'high_level_loot'],
    droppedBy: ['guardian_members', 'syndicate_enforcers'],
    narrativeTags: ['medical', 'healing', 'military_grade']
  },

  {
    id: 'energy_drink',
    name: 'Adrena-Boost',
    description: 'High-caffeine energy drink designed for powered individuals',
    type: 'consumable',
    rarity: 'common',
    flavorText: '"When normal energy drinks aren\'t enough." - Corvus BioTech marketing slogan',
    
    consumableEffects: {
      energyRestore: 15,
      temporaryBuff: {
        attributeId: 'agility',
        bonus: 3,
        duration: 2
      }
    },
    
    value: 25,
    buyPrice: 40,
    canDrop: true,
    stackable: true,
    maxStack: 10,
    
    foundIn: ['convenience_stores', 'black_market', 'loot_drops'],
    narrativeTags: ['energy', 'stimulant', 'temporary_boost']
  },

  {
    id: 'power_inhibitor_temporary',
    name: 'Nullifier Patch',
    description: 'Temporary power suppression - lasts 30 minutes',
    type: 'consumable',
    rarity: 'rare',
    flavorText: 'Government issue. Stick it on a powered individual to shut them down temporarily.',
    loreText: 'Originally developed for hospitals to safely operate on powered patients. Now used by law enforcement and criminals alike.',
    
    consumableEffects: {
      // Special effect - would need custom handling
    },
    
    value: 500,
    buyPrice: 800,
    canDrop: true,
    stackable: true,
    maxStack: 3,
    
    foundIn: ['black_market', 'police_evidence_room'],
    droppedBy: ['metro_police', 'syndicate_specialists'],
    narrativeTags: ['power_suppression', 'tactical', 'rare']
  },

  // === EQUIPMENT - ARMOR ===
  {
    id: 'kevlar_vest',
    name: 'Kevlar Vest',
    description: 'Military-grade body armor',
    type: 'equipment',
    rarity: 'common',
    equipmentSlot: 'body',
    flavorText: 'Standard police issue. Better than nothing.',
    
    equipmentEffects: {
      damageReduction: 10,
      attributeBonus: { endurance: 2 }
    },
    
    value: 300,
    buyPrice: 500,
    canDrop: true,
    stackable: false,
    
    foundIn: ['black_market', 'police_armory', 'military_surplus'],
    narrativeTags: ['armor', 'protection', 'military']
  },

  {
    id: 'reinforced_suit',
    name: 'Reinforced Combat Suit',
    description: 'Powered individuals-grade protective gear',
    type: 'equipment',
    rarity: 'rare',
    equipmentSlot: 'body',
    flavorText: 'Guardian Initiative standard issue. Lightweight but incredibly durable.',
    loreText: 'Developed by Corvus BioTech under government contract. Weave contains micro-filaments that harden on impact.',
    
    equipmentEffects: {
      damageReduction: 25,
      attributeBonus: { endurance: 5, agility: 3 },
      specialEffect: 'Reduces damage from energy-based attacks by additional 10%'
    },
    
    value: 2000,
    buyPrice: 3500,
    canDrop: false,
    stackable: false,
    
    foundIn: ['guardian_hq', 'high_tier_black_market'],
    droppedBy: ['guardian_members'],
    craftingRecipe: {
      requiredItems: [
        { itemId: 'kevlar_vest', quantity: 2 },
        { itemId: 'power_core_fragment', quantity: 1 }
      ],
      requiredFaction: { factionId: 'guardian_initiative', minReputation: 40 }
    },
    narrativeTags: ['armor', 'advanced', 'guardian_tech']
  },

  // === EQUIPMENT - ACCESSORIES ===
  {
    id: 'comms_earpiece',
    name: 'Encrypted Earpiece',
    description: 'Secure communication device',
    type: 'equipment',
    rarity: 'uncommon',
    equipmentSlot: 'accessory',
    flavorText: 'Stay connected. Stay coordinated. Stay alive.',
    
    equipmentEffects: {
      attributeBonus: { intelligence: 2, perception: 3 },
      specialEffect: 'Enables coordination with faction allies during encounters'
    },
    
    value: 400,
    buyPrice: 650,
    canDrop: true,
    stackable: false,
    
    foundIn: ['black_market', 'tech_shops', 'vigilante_network'],
    narrativeTags: ['communication', 'coordination', 'tech']
  },

  {
    id: 'power_focus_crystal',
    name: 'Power Focus Crystal',
    description: 'Amplifies mental and energy-based abilities',
    type: 'equipment',
    rarity: 'epic',
    equipmentSlot: 'accessory',
    flavorText: 'Hums with latent energy. Warm to the touch.',
    loreText: 'Origins unknown. These crystals appear at sites of major powered conflicts. Some theorize they\'re fragments of whatever caused the powered phenomenon.',
    
    equipmentEffects: {
      attributeBonus: { willpower: 5, intelligence: 3 },
      powerBonus: [
        { powerId: 'telepathy', effectivenessBonus: 15 },
        { powerId: 'telekinesis', effectivenessBonus: 15 },
        { powerId: 'energy_blast', effectivenessBonus: 20 },
        { powerId: 'precognition', effectivenessBonus: 10 }
      ],
      specialEffect: 'Mental powers cost 10% less energy'
    },
    
    value: 5000,
    buyPrice: 8000,
    canDrop: false,
    stackable: false,
    
    foundIn: ['ancient_sites', 'dimensional_rifts', 'elite_black_market'],
    droppedBy: ['cosmic_entities', 'reality_warpers'],
    narrativeTags: ['mystical', 'power_amplifier', 'rare_artifact']
  },

  {
    id: 'stealth_cloak',
    name: 'Photoreactive Cloak',
    description: 'Adaptive camouflage technology',
    type: 'equipment',
    rarity: 'rare',
    equipmentSlot: 'body',
    flavorText: 'Not true invisibility, but close enough in low light.',
    
    equipmentEffects: {
      attributeBonus: { stealth: 8, agility: 3 },
      specialEffect: 'Dramatically increases stealth success rates. Bonus to ambush damage.'
    },
    
    value: 3000,
    canDrop: true,
    stackable: false,
    
    foundIn: ['black_market', 'syndicate_vaults'],
    droppedBy: ['syndicate_assassins', 'corporate_spies'],
    narrativeTags: ['stealth', 'tech', 'infiltration']
  },

  // === WEAPONS / UTILITY ===
  {
    id: 'shock_gloves',
    name: 'Shock Gloves',
    description: 'Electrified combat gloves',
    type: 'equipment',
    rarity: 'uncommon',
    equipmentSlot: 'hands',
    flavorText: 'Adds a little spark to your punches.',
    
    equipmentEffects: {
      attributeBonus: { strength: 3 },
      specialEffect: 'Melee attacks have chance to stun enemies. Synergizes with electricity_manipulation power.'
    },
    
    value: 800,
    buyPrice: 1200,
    canDrop: true,
    stackable: false,
    
    foundIn: ['black_market', 'tech_shops'],
    narrativeTags: ['weapon', 'electricity', 'melee']
  },

  {
    id: 'grappling_hook',
    name: 'Powered Grappling Hook',
    description: 'High-strength cable launcher for urban mobility',
    type: 'equipment',
    rarity: 'uncommon',
    equipmentSlot: 'utility',
    flavorText: 'For those without flight. Vigilante favorite.',
    
    equipmentEffects: {
      attributeBonus: { agility: 4 },
      specialEffect: 'Enables vertical mobility in urban environments. Escape encounters more easily.'
    },
    
    value: 600,
    buyPrice: 900,
    canDrop: true,
    stackable: false,
    
    foundIn: ['black_market', 'tech_shops', 'vigilante_network'],
    narrativeTags: ['mobility', 'utility', 'vigilante_gear']
  },

  // === QUEST ITEMS ===
  {
    id: 'syndicate_ledger',
    name: 'Encrypted Ledger',
    description: 'Syndicate financial records - heavily encrypted',
    type: 'quest',
    rarity: 'rare',
    flavorText: 'Names, numbers, transactions. This could bring down the entire organization.',
    loreText: 'Every criminal empire keeps records. The Syndicate is no different. This ledger documents years of illegal operations.',
    
    questId: 'syndicate_takedown',
    
    value: 0, // Priceless
    canDrop: false,
    stackable: false,
    
    foundIn: ['syndicate_vault'],
    droppedBy: ['syndicate_accountant'],
    narrativeTags: ['evidence', 'syndicate', 'quest_critical']
  },

  {
    id: 'artifact_fragment',
    name: 'Ancient Artifact Fragment',
    description: 'Fragment of an unknown relic, pulses with energy',
    type: 'quest',
    rarity: 'legendary',
    flavorText: 'Whispers seem to emanate from it when no one is looking.',
    loreText: 'One of seven fragments. Together they form... something. The whispers say "find the others."',
    
    questId: 'artifact_collection',
    
    value: 0,
    canDrop: false,
    stackable: true,
    maxStack: 7,
    
    foundIn: ['ancient_sites', 'dimensional_rifts', 'villain_hoards'],
    narrativeTags: ['mystical', 'quest_critical', 'collectible']
  },

  // === CRAFTING MATERIALS ===
  {
    id: 'power_core_fragment',
    name: 'Power Core Fragment',
    description: 'Crystallized energy from defeated powered individuals',
    type: 'crafting',
    rarity: 'rare',
    flavorText: 'Still warm. Still humming with potential.',
    
    value: 500,
    canDrop: true,
    stackable: true,
    maxStack: 20,
    
    foundIn: ['powered_encounters'],
    droppedBy: ['powered_villains', 'powered_heroes'],
    narrativeTags: ['crafting', 'energy', 'powered_essence']
  },

  {
    id: 'tech_components',
    name: 'Advanced Tech Components',
    description: 'High-grade circuitry and processors',
    type: 'crafting',
    rarity: 'uncommon',
    
    value: 200,
    buyPrice: 350,
    canDrop: true,
    stackable: true,
    maxStack: 50,
    
    foundIn: ['tech_labs', 'corporate_facilities', 'black_market'],
    narrativeTags: ['crafting', 'technology']
  },

  // === VALUABLES ===
  {
    id: 'stolen_jewelry',
    name: 'Stolen Jewelry',
    description: 'High-value jewelry from a heist',
    type: 'valuable',
    rarity: 'common',
    flavorText: 'Someone will pay well for this, no questions asked.',
    
    value: 300,
    canDrop: true,
    stackable: true,
    maxStack: 10,
    
    foundIn: ['robbery_loot', 'black_market'],
    narrativeTags: ['valuable', 'criminal', 'sellable']
  },

  {
    id: 'blackmail_material',
    name: 'Compromising Evidence',
    description: 'Dirt on a powerful figure',
    type: 'valuable',
    rarity: 'rare',
    flavorText: 'Photos, documents, recordings. Someone wants this badly.',
    
    value: 2000,
    canDrop: false,
    stackable: true,
    maxStack: 5,
    
    foundIn: ['investigation_rewards', 'infiltration_loot'],
    narrativeTags: ['valuable', 'information', 'leverage']
  }
]

// === HELPER FUNCTIONS ===

export function getItemById(id: string): Item | undefined {
  return items.find(i => i.id === id)
}

export function getItemsByType(type: ItemType): Item[] {
  return items.filter(i => i.type === type)
}

export function getItemsByRarity(rarity: ItemRarity): Item[] {
  return items.filter(i => i.rarity === rarity)
}

export function getEquippableItems(): Item[] {
  return items.filter(i => i.type === 'equipment')
}

export function getConsumables(): Item[] {
  return items.filter(i => i.type === 'consumable')
}

export function getCraftableItems(): Item[] {
  return items.filter(i => i.craftingRecipe !== undefined)
}

export function canCraftItem(
  item: Item,
  playerInventory: Record<string, number>,
  playerFactionReps: Record<string, number>
): { canCraft: boolean, missingItems?: string[], factionReqMet: boolean } {
  if (!item.craftingRecipe) {
    return { canCraft: false, factionReqMet: true }
  }
  
  // Check faction requirement
  let factionReqMet = true
  if (item.craftingRecipe.requiredFaction) {
    const { factionId, minReputation } = item.craftingRecipe.requiredFaction
    const playerRep = playerFactionReps[factionId] || 0
    factionReqMet = playerRep >= minReputation
  }
  
  // Check material requirements
  const missingItems: string[] = []
  for (const req of item.craftingRecipe.requiredItems) {
    const playerAmount = playerInventory[req.itemId] || 0
    if (playerAmount < req.quantity) {
      missingItems.push(req.itemId)
    }
  }
  
  return {
    canCraft: missingItems.length === 0 && factionReqMet,
    missingItems: missingItems.length > 0 ? missingItems : undefined,
    factionReqMet
  }
}

export function useConsumable(item: Item, currentHP: number, maxHP: number, currentEnergy: number): {
  newHP: number
  newEnergy: number
  temporaryBuffs: Array<{ attributeId: string; bonus: number; duration: number }>
} {
  if (item.type !== 'consumable' || !item.consumableEffects) {
    throw new Error('Item is not a consumable')
  }
  
  const effects = item.consumableEffects
  let newHP = currentHP
  let newEnergy = currentEnergy
  const temporaryBuffs: Array<{ attributeId: string; bonus: number; duration: number }> = []
  
  if (effects.hpRestore) {
    newHP = Math.min(maxHP, currentHP + effects.hpRestore)
  }
  
  if (effects.energyRestore) {
    newEnergy = currentEnergy + effects.energyRestore
  }
  
  if (effects.temporaryBuff) {
    temporaryBuffs.push(effects.temporaryBuff)
  }
  
  return { newHP, newEnergy, temporaryBuffs }
}

export function calculateEquipmentBonuses(equippedItems: Item[]): {
  attributeBonuses: Record<string, number>
  powerBonuses: Record<string, number>
  damageReduction: number
  energyRegen: number
  specialEffects: string[]
} {
  const attributeBonuses: Record<string, number> = {}
  const powerBonuses: Record<string, number> = {}
  let damageReduction = 0
  let energyRegen = 0
  const specialEffects: string[] = []
  
  for (const item of equippedItems) {
    if (!item.equipmentEffects) continue
    
    // Attribute bonuses
    if (item.equipmentEffects.attributeBonus) {
      Object.entries(item.equipmentEffects.attributeBonus).forEach(([attr, bonus]) => {
        attributeBonuses[attr] = (attributeBonuses[attr] || 0) + bonus
      })
    }
    
    // Power bonuses
    if (item.equipmentEffects.powerBonus) {
      item.equipmentEffects.powerBonus.forEach(({ powerId, effectivenessBonus }) => {
        powerBonuses[powerId] = (powerBonuses[powerId] || 0) + effectivenessBonus
      })
    }
    
    // Damage reduction (stacks additively)
    if (item.equipmentEffects.damageReduction) {
      damageReduction += item.equipmentEffects.damageReduction
    }
    
    // Energy regeneration
    if (item.equipmentEffects.energyRegeneration) {
      energyRegen += item.equipmentEffects.energyRegeneration
    }
    
    // Special effects
    if (item.equipmentEffects.specialEffect) {
      specialEffects.push(item.equipmentEffects.specialEffect)
    }
  }
  
  return { attributeBonuses, powerBonuses, damageReduction, energyRegen, specialEffects }
}

export type PlayerInventory = {
  items: Record<string, number> // itemId -> quantity
  equipped: Record<EquipmentSlot, string | null> // slot -> itemId
  maxCapacity: number
}

export function canAddItem(
  inventory: PlayerInventory,
  itemId: string,
  quantity: number = 1
): boolean {
  const item = getItemById(itemId)
  if (!item) return false
  
  // Check if stackable
  if (!item.stackable && (inventory.items[itemId] || 0) > 0) {
    return false // Already have one and it's not stackable
  }
  
  // Check stack limit
  if (item.stackable && item.maxStack) {
    const currentAmount = inventory.items[itemId] || 0
    if (currentAmount + quantity > item.maxStack) {
      return false
    }
  }
  
  // Could add capacity checks here if needed
  
  return true
}