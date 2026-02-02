// items.ts
// Story Forge Item System (Consumables v1)
//
// Design goals:
// - Items are temporary agency (not permanent power).
// - One-time use consumables.
// - Effects target temporary state only (leverage, energy, hp, money, action TTL/cooldowns,
//   short buffs, conflict resources, story triggers).
// - Items are data-driven. Runtime logic belongs elsewhere.

export type ItemCategory = "tactical" | "strategic" | "recovery" | "story";
export type ItemUseTiming = "anytime" | "preEncounter" | "midConflict" | "postConflict";
export type ItemConsumption = "consume_on_use";

export type LeverageType = "positional" | "informational" | "psychological" | "social";
export type ConflictResource = "control" | "stability" | "position";

// Optional gating for stores and/or use.
export type ItemRequirement =
  | { kind: "minLevel"; level: number }
  | { kind: "minReputation"; factionId: string; rep: number }
  | { kind: "requiresFlag"; flag: string }
  | { kind: "requiresDistrict"; districtId: string }
  | { kind: "requiresPowerTrait"; trait: string };

// Economy fields used by stores (future).
export type ItemEconomy = {
  buyPrice?: number; // if purchasable
  sellValue?: number; // optional if you allow selling later
  storePools?: string[]; // e.g. ["black_market", "pharmacy", "faction_vendor"]
};

// Unified item effects.
// Keep effect types minimal; extend only as needed.
export type ItemEffect =
  // --- Leverage ---
  | { kind: "addLeverage"; leverageType: LeverageType; amount: number; scope?: "immediate" | "nextEncounter" }
  | { kind: "preserveLeverage"; mode: "pauseOnce" | "pauseForActions"; actions?: number }
  | { kind: "convertLeverage"; from: LeverageType; to: LeverageType; amount: number; efficiency?: number }

  // --- Energy / HP ---
  | { kind: "restoreEnergy"; amount: number }
  | { kind: "restoreHp"; amount: number }
  | { kind: "convertHpLossToEnergyLoss"; ratio: number; scope?: "lastEncounter" | "nextEncounter" }

  // --- Money ---
  | { kind: "gainMoney"; amount: number }
  | { kind: "discountStore"; percent: number; scope?: "onePurchase" | "forHours" }

  // --- Action board / TTL (future) ---
  | { kind: "modifyActionTTL"; deltaActions: number; target?: { archetype?: string; tag?: string } }
  | { kind: "reduceActionCooldown"; deltaActions: number; target?: { archetype?: string; tag?: string } }

  // --- Conflict resources (tactical engine) ---
  | {
      kind: "modifyConflictResource";
      target: "player" | "opponent";
      resource: ConflictResource;
      delta: number;
      timing?: "thisTurn" | "nextTurn" | "untilEndOfConflict";
    }
  | { kind: "preventNextLoss"; resource: ConflictResource; amount: number }

  // --- Temporary buffs (treat as leverage-adjacent) ---
  | {
      kind: "temporaryAttributeBoost";
      attributeId: string;
      amount: number;
      duration:
        | { kind: "turns"; turns: number }
        | { kind: "actions"; actions: number }
        | { kind: "minutes"; minutes: number };
    }

  // --- Story triggers ---
  | { kind: "setStoryFlag"; flag: string; value?: boolean }
  | { kind: "unlockAction"; actionId?: string; archetype?: string; tag?: string; duration?: { kind: "actions"; actions: number } | { kind: "minutes"; minutes: number } }
  | { kind: "forceEncounter"; encounterTag: string; intensity?: 1 | 2 | 3 };

export type ItemDefinition = {
  id: string;
  name: string;
  description: string;

  category: ItemCategory;
  useTiming: ItemUseTiming;
  consumption: ItemConsumption;

  // Usually 1 primary effect, optional costs for tradeoffs.
  effects: ItemEffect[];
  costs?: ItemEffect[];

  // Optional metadata for UI / filtering.
  tags?: string[];

  // Store gating and availability.
  requirements?: ItemRequirement[];
  economy?: ItemEconomy;

  // Optional flavor / lore.
  flavorText?: string;
};

// Starter catalog (data only). Expand freely later.
export const items: ItemDefinition[] = [
  // --- Tactical ---
  {
    id: "smoke_charge",
    name: "Smoke Charge",
    description: "A dense smoke burst that breaks lines of sight and buys a moment of advantage.",
    category: "tactical",
    useTiming: "midConflict",
    consumption: "consume_on_use",
    tags: ["stealth", "escape", "tactical"],
    effects: [{ kind: "modifyConflictResource", target: "player", resource: "position", delta: 2, timing: "thisTurn" }],
    economy: { buyPrice: 450, sellValue: 150, storePools: ["black_market"] },
  },
  {
    id: "flash_device",
    name: "Flash Device",
    description: "A blinding burst that scrambles timing and interrupts clean decisions.",
    category: "tactical",
    useTiming: "midConflict",
    consumption: "consume_on_use",
    tags: ["tactical", "control"],
    effects: [{ kind: "modifyConflictResource", target: "opponent", resource: "control", delta: -2, timing: "thisTurn" }],
    economy: { buyPrice: 500, sellValue: 175, storePools: ["black_market"] },
  },
  {
    id: "adrenal_injector",
    name: "Adrenal Injector",
    description: "A risky boost that keeps you moving through setbacks.",
    category: "tactical",
    useTiming: "midConflict",
    consumption: "consume_on_use",
    tags: ["recovery", "tactical"],
    effects: [{ kind: "preventNextLoss", resource: "stability", amount: 2 }],
    costs: [{ kind: "restoreEnergy", amount: -10 }], // optional tradeoff (implement later)
    economy: { buyPrice: 600, sellValue: 200, storePools: ["pharmacy", "black_market"] },
  },
  {
    id: "stimulant_injector",
    name: "Stimulant Injector",
    description: "A quick boost of energy to keep you going.",
    category: "tactical",
    useTiming: "midConflict",
    consumption: "consume_on_use",
    tags: ["energy", "tactical"],
    effects: [{ kind: "restoreEnergy", amount: 20 }],
    economy: { buyPrice: 400, sellValue: 150, storePools: ["pharmacy", "black_market"] },
  },

  // --- Strategic ---
  {
    id: "surveillance_burst",
    name: "Surveillance Burst",
    description: "A short-lived feed from a compromised camera network.",
    category: "strategic",
    useTiming: "preEncounter",
    consumption: "consume_on_use",
    tags: ["intel", "setup"],
    effects: [
      { kind: "addLeverage", leverageType: "informational", amount: 1, scope: "nextEncounter" },
      { kind: "preserveLeverage", mode: "pauseOnce" },
    ],
    economy: { buyPrice: 650, sellValue: 220, storePools: ["black_market", "faction_vendor"] },
  },
  {
    id: "forged_credentials",
    name: "Forged Credentials",
    description: "A clean-looking identity that opens doors before anyone asks questions.",
    category: "strategic",
    useTiming: "preEncounter",
    consumption: "consume_on_use",
    tags: ["social", "access"],
    effects: [{ kind: "addLeverage", leverageType: "social", amount: 1, scope: "nextEncounter" }],
    economy: { buyPrice: 700, sellValue: 250, storePools: ["black_market"] },
  },
  {
    id: "safe_passage_token",
    name: "Safe Passage Token",
    description: "A quiet favor that lowers your exposure—for a while.",
    category: "strategic",
    useTiming: "postConflict",
    consumption: "consume_on_use",
    tags: ["heat", "stealth"],
    effects: [{ kind: "modifyActionTTL", deltaActions: 1, target: { tag: "urgent" } }], // placeholder: later interpret as "reduce heat / slow decay"
    economy: { buyPrice: 900, sellValue: 300, storePools: ["faction_vendor"] },
  },

  // --- Recovery ---
  {
    id: "emergency_medkit",
    name: "Emergency Medkit",
    description: "Field supplies that keep you moving at a cost.",
    category: "recovery",
    useTiming: "postConflict",
    consumption: "consume_on_use",
    tags: ["medical", "recovery"],
    effects: [{ kind: "restoreHp", amount: 25 }],
    economy: { buyPrice: 350, sellValue: 120, storePools: ["pharmacy"] },
  },
  {
    id: "focus_stimulant",
    name: "Focus Stimulant",
    description: "Sharpens your edge—briefly.",
    category: "recovery",
    useTiming: "postConflict",
    consumption: "consume_on_use",
    tags: ["energy", "recovery"],
    effects: [{ kind: "restoreEnergy", amount: 30 }],
    costs: [{ kind: "modifyActionTTL", deltaActions: -1 }], // placeholder for “raises heat / urgency”
    economy: { buyPrice: 500, sellValue: 160, storePools: ["pharmacy", "black_market"] },
  },

  // --- Story ---
  {
    id: "encrypted_ledger",
    name: "Encrypted Ledger",
    description: "A ledger full of names, payments, and leverage—if you can use it fast enough.",
    category: "story",
    useTiming: "anytime",
    consumption: "consume_on_use",
    tags: ["story", "intel", "faction"],
    effects: [
      { kind: "setStoryFlag", flag: "has_encrypted_ledger", value: true },
      { kind: "unlockAction", tag: "ledger_followup", duration: { kind: "actions", actions: 2 } },
      { kind: "forceEncounter", encounterTag: "ledger_heat", intensity: 1 },
    ],
    economy: { buyPrice: 1200, sellValue: 400, storePools: ["black_market"] },
    requirements: [{ kind: "minLevel", level: 3 }],
  },
  {
    id: "gang_insignia",
    name: "Gang Insignia",
    description: "A symbol that changes who talks to you—and who doesn’t.",
    category: "story",
    useTiming: "anytime",
    consumption: "consume_on_use",
    tags: ["story", "access"],
    effects: [{ kind: "unlockAction", tag: "underground_access", duration: { kind: "actions", actions: 3 } }],
    economy: { buyPrice: 1000, sellValue: 350, storePools: ["black_market"] },
  },
];

// Convenience helpers (optional)
export function getItemById(id: string): ItemDefinition | undefined {
  return items.find((it) => it.id === id);
}
