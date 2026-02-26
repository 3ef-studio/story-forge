'use client';

import { useState } from 'react';
import { AnimatedCard } from '@/app/components/ui/AnimatedCard';
import { Badge } from '@/app/components/ui/badge';
import { ShoppingBag, Loader2 } from 'lucide-react';
import type { StoreOffer } from '@/app/lib/game-logic/store';
import { CONSUMABLE_DEFINITIONS, MAX_CONSUMABLES, type ConsumableItem } from '@/app/lib/game-logic/consumables';

interface StorePanelProps {
  money: number;
  storeOffer: StoreOffer[];
  storeRefreshCounter: number;
  consumables: ConsumableItem[];
  onPurchase: (offerId: string) => Promise<void>;
}

export function StorePanel({
  money,
  storeOffer,
  storeRefreshCounter,
  consumables,
  onPurchase,
}: StorePanelProps) {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const inventoryFull = consumables.length >= MAX_CONSUMABLES;

  const handlePurchase = async (offerId: string) => {
    setPurchasingId(offerId);
    try {
      await onPurchase(offerId);
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <AnimatedCard variant="panel" className="panel-glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          Store
        </h3>
        <Badge variant="outline" className="text-green-400 border-green-400/30">
          ${money}
        </Badge>
      </div>

      {/* Refresh counter */}
      <div className="text-xs text-white/40">
        Refreshes in {storeRefreshCounter} encounter{storeRefreshCounter !== 1 ? 's' : ''}
      </div>

      {/* Inventory warning */}
      {inventoryFull && (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
          Inventory full (max {MAX_CONSUMABLES})
        </div>
      )}

      {/* Store offers */}
      <div className="space-y-2">
        {storeOffer.length === 0 ? (
          <div className="text-sm text-white/40 text-center py-4">
            No items available
          </div>
        ) : (
          storeOffer.map((offer) => {
            const def = CONSUMABLE_DEFINITIONS[offer.type];
            const canAfford = money >= offer.price;
            const canBuy = canAfford && !inventoryFull;
            const isPurchasing = purchasingId === offer.id;

            return (
              <div
                key={offer.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10"
              >
                <span className="text-xl">{def.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white/90 truncate">
                    {def.name}
                  </div>
                  <div className="text-xs text-white/50 truncate">
                    {def.description}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                    ${offer.price}
                  </span>
                  <button
                    onClick={() => handlePurchase(offer.id)}
                    disabled={!canBuy || isPurchasing}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      canBuy && !isPurchasing
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    {isPurchasing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Buy'
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AnimatedCard>
  );
}
