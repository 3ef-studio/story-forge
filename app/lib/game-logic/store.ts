/**
 * Store System (MVP)
 *
 * Minimal store that lets players spend money to buy consumables.
 * - 3 offers that refresh every 3 encounters
 * - Fixed pricing per consumable type
 */

import type { ConsumableType } from './consumables';

// ============================================================
// Constants
// ============================================================

export const STORE_REFRESH_INTERVAL = 3; // Refresh after 3 encounters

export const CONSUMABLE_PRICES: Record<ConsumableType, number> = {
  stim_patch: 20,
  signal_scrambler: 30,
  med_injector: 40,
};

// ============================================================
// Types
// ============================================================

export interface StoreOffer {
  id: string;
  type: ConsumableType;
  price: number;
}

// ============================================================
// Store Logic
// ============================================================

/**
 * Generate exactly 3 store offers.
 * Each offer is a different consumable type with fixed pricing.
 */
export function generateStoreOffer(): StoreOffer[] {
  const types: ConsumableType[] = ['stim_patch', 'med_injector', 'signal_scrambler'];

  // Shuffle to randomize order
  const shuffled = [...types].sort(() => Math.random() - 0.5);

  return shuffled.map((type) => ({
    id: crypto.randomUUID(),
    type,
    price: CONSUMABLE_PRICES[type],
  }));
}

/**
 * Parse store offer from database JSON field
 */
export function parseStoreOffer(json: unknown): StoreOffer[] {
  if (!json || !Array.isArray(json)) return [];
  return json.filter((item): item is StoreOffer =>
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    ['stim_patch', 'med_injector', 'signal_scrambler'].includes(item.type) &&
    typeof item.price === 'number'
  );
}

/**
 * Find an offer by ID in the store
 */
export function findOffer(offers: StoreOffer[], offerId: string): StoreOffer | undefined {
  return offers.find(o => o.id === offerId);
}

/**
 * Remove an offer from the store (after purchase)
 */
export function removeOffer(offers: StoreOffer[], offerId: string): StoreOffer[] {
  return offers.filter(o => o.id !== offerId);
}

/**
 * Check if store should be refreshed and return new state.
 * Returns { shouldRefresh, newOffer, newCounter }
 *
 * Refresh conditions:
 * - storeOffer is empty
 * - storeRefreshCounter <= 0
 */
export function maybeRefreshStore(
  currentOffer: StoreOffer[],
  currentCounter: number
): { shouldRefresh: boolean; newOffer: StoreOffer[]; newCounter: number } {
  // If store is empty, generate new offers
  if (currentOffer.length === 0) {
    return {
      shouldRefresh: true,
      newOffer: generateStoreOffer(),
      newCounter: STORE_REFRESH_INTERVAL,
    };
  }

  // If counter has reached 0, refresh the store
  if (currentCounter <= 0) {
    return {
      shouldRefresh: true,
      newOffer: generateStoreOffer(),
      newCounter: STORE_REFRESH_INTERVAL,
    };
  }

  // No refresh needed
  return {
    shouldRefresh: false,
    newOffer: currentOffer,
    newCounter: currentCounter,
  };
}

/**
 * Decrement the store refresh counter (called after each encounter).
 * Returns the new counter value (minimum 0).
 */
export function decrementRefreshCounter(currentCounter: number): number {
  return Math.max(0, currentCounter - 1);
}
