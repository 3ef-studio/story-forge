import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import {
  parseStoreOffer,
  findOffer,
  removeOffer,
  maybeRefreshStore,
} from '@/app/lib/game-logic/store';
import {
  parseConsumables,
  createConsumable,
  addConsumable,
  MAX_CONSUMABLES,
} from '@/app/lib/game-logic/consumables';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PurchaseRequestBody {
  offerId: string;
}

function isPurchaseRequestBody(value: unknown): value is PurchaseRequestBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.offerId === 'string';
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!isPurchaseRequestBody(rawBody)) {
      return NextResponse.json(
        { error: 'Missing offerId' },
        { status: 400 }
      );
    }

    const { offerId } = rawBody;

    // Use transaction to prevent double-buy race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Load player
      const character = await tx.character.findUnique({
        where: { userId: session.user!.id },
      });

      if (!character) {
        throw new Error('CHARACTER_NOT_FOUND');
      }

      // Parse current store and consumables
      const storeOffer = parseStoreOffer((character as { storeOffer?: unknown }).storeOffer);
      const consumables = parseConsumables((character as { consumables?: unknown }).consumables);

      // Validate offerId exists in store
      const offer = findOffer(storeOffer, offerId);
      if (!offer) {
        throw new Error('OFFER_NOT_FOUND');
      }

      // Validate player has < 2 consumables
      if (consumables.length >= MAX_CONSUMABLES) {
        throw new Error('INVENTORY_FULL');
      }

      // Validate player has enough money
      if (character.money < offer.price) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      // Deduct money
      const newMoney = character.money - offer.price;

      // Add the consumable to inventory
      const newConsumable = createConsumable(offer.type);
      const updatedConsumables = addConsumable(consumables, newConsumable);

      // Remove the offer from store
      const updatedStoreOffer = removeOffer(storeOffer, offerId);

      // Check if store needs refresh after this purchase
      const storeRefreshCounter = (character as { storeRefreshCounter?: number }).storeRefreshCounter ?? 0;
      const storeState = maybeRefreshStore(updatedStoreOffer, storeRefreshCounter);

      // Update character
      await tx.character.update({
        where: { id: character.id },
        data: {
          money: newMoney,
          consumables: JSON.parse(JSON.stringify(updatedConsumables)),
          storeOffer: JSON.parse(JSON.stringify(storeState.newOffer)),
          storeRefreshCounter: storeState.newCounter,
        },
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Store] Purchased ${offer.type} for $${offer.price}. Money: ${character.money} -> ${newMoney}`);
      }

      return {
        success: true,
        purchased: {
          type: offer.type,
          price: offer.price,
        },
        money: newMoney,
        consumables: updatedConsumables,
        storeOffer: storeState.newOffer,
        storeRefreshCounter: storeState.newCounter,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    // Handle known errors
    if (error instanceof Error) {
      switch (error.message) {
        case 'CHARACTER_NOT_FOUND':
          return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        case 'OFFER_NOT_FOUND':
          return NextResponse.json({ error: 'Offer not found in store' }, { status: 400 });
        case 'INVENTORY_FULL':
          return NextResponse.json({ error: 'Inventory full (max 2 consumables)' }, { status: 400 });
        case 'INSUFFICIENT_FUNDS':
          return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
      }
    }

    console.error('Store purchase error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
