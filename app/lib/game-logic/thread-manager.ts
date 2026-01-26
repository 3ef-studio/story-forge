/**
 * Consequence Thread Manager
 * Manages short-term continuity threads between encounters
 */

import { prisma } from '@/app/lib/db';
import type { Prisma, ConsequenceThread } from '@prisma/client';

// Thread types
export type ThreadType = 'retaliation' | 'recognition' | 'escalation' | 'callback';

// Context for checking if a thread should trigger
export type ActionContext = {
  actionId: string;
  locationTypes?: string[];
  involvedFactions?: string[];
};

// Context for creating threads after encounter resolution
export type OutcomeContext = {
  encounterId?: string;
  encounterType: string;
  difficulty: number;
  involvedFactions?: string[];
  locationType?: string;
  success: boolean;
  factionChanges?: { factionId: string; change: number }[];
  actionId: string;
};

// Thread injection result
export type ThreadInjection = {
  injectionText: string;
  tagsToAdd: string[];
  difficultyMod: number;
};

// Thread payload templates
const THREAD_TEMPLATES: Record<ThreadType, { titles: string[]; summaries: string[]; injections: string[] }> = {
  retaliation: {
    titles: ['Marked', 'Retribution Incoming', 'Unwanted Attention'],
    summaries: [
      'Word spreads fast. Someone has marked you.',
      'Your actions have not gone unnoticed. Enemies are watching.',
      'A score needs settling, and you are on the list.',
    ],
    injections: [
      'Complication: Members of an opposing faction have caught up with you, adding hostility to the situation.',
      'Complication: Your previous actions have earned you enemies, and they choose this moment to make their presence known.',
      'Complication: An ambush was waiting. Your reputation preceded you.',
    ],
  },
  recognition: {
    titles: ['Famous Face', 'Word Gets Around', 'Reputation Precedes You'],
    summaries: [
      'A stranger recognizes you from a recent incident.',
      'Your deeds have earned you recognition in these parts.',
      'People are talking, and your name keeps coming up.',
    ],
    injections: [
      'Complication: You are recognized by bystanders, adding an audience to your actions.',
      'Complication: Someone remembers you from before, complicating the situation with unexpected attention.',
      'Complication: Your growing fame draws curious onlookers and possibly opportunists.',
    ],
  },
  escalation: {
    titles: ['Unfinished Business', 'Rising Stakes', 'The Aftermath'],
    summaries: [
      'The situation is not over. The aftermath is about to hit.',
      'What seemed resolved has only grown worse.',
      'The consequences of your last encounter are catching up.',
    ],
    injections: [
      'Complication: The intensity has escalated. This is more dangerous than expected.',
      'Complication: Previous events have made this situation more volatile.',
      'Complication: The stakes are higher now. Someone has upped the ante.',
    ],
  },
  callback: {
    titles: ['Echoes', 'Familiar Ground', 'Deja Vu'],
    summaries: [
      'A detail from your last encounter returns at the worst moment.',
      'History has a way of repeating itself.',
      'Something from before resurfaces unexpectedly.',
    ],
    injections: [
      'Complication: A familiar element from a previous encounter complicates matters.',
      'Complication: You have been here before, metaphorically speaking. Old patterns emerge.',
      'Complication: An echo of past events intrudes on the present situation.',
    ],
  },
};

// Deterministic random selection based on character ID and current time (hour-based)
function deterministicSelect<T>(items: T[], seed: string): T {
  const hourSeed = Math.floor(Date.now() / (1000 * 60 * 60));
  const hash = seed.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), hourSeed);
  return items[hash % items.length];
}

/**
 * Get the active consequence thread for a character
 */
export async function getActiveThread(characterId: string): Promise<ConsequenceThread | null> {
  return prisma.consequenceThread.findFirst({
    where: {
      characterId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Increment thread aging - called once per action execute
 * If thread expires, marks it inactive
 */
export async function incrementThreadAging(
  characterId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma;

  const activeThread = await client.consequenceThread.findFirst({
    where: { characterId, isActive: true },
  });

  if (!activeThread) return;

  const newActionsElapsed = activeThread.actionsElapsed + 1;
  const shouldExpire = newActionsElapsed >= activeThread.expiresInActions;

  await client.consequenceThread.update({
    where: { id: activeThread.id },
    data: {
      actionsElapsed: newActionsElapsed,
      isActive: !shouldExpire,
    },
  });
}

/**
 * Check if a thread should trigger given the current action context
 */
export function threadTriggered(thread: ConsequenceThread, context: ActionContext): boolean {
  // Check trigger conditions (OR logic - any match triggers)
  if (thread.triggerActionId && thread.triggerActionId === context.actionId) {
    return true;
  }

  if (thread.triggerLocationType && context.locationTypes?.includes(thread.triggerLocationType)) {
    return true;
  }

  if (thread.triggerFactionId && context.involvedFactions?.includes(thread.triggerFactionId)) {
    return true;
  }

  return false;
}

/**
 * Build the injection object for a triggered thread
 */
export function buildThreadInjection(thread: ConsequenceThread): ThreadInjection {
  return {
    injectionText: thread.injectionText,
    tagsToAdd: ['consequence_thread', thread.type],
    difficultyMod: thread.type === 'escalation' ? 1 : 0,
  };
}

/**
 * Consume a thread after it has been used (marks inactive)
 */
export async function consumeThread(
  threadId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma;

  await client.consequenceThread.update({
    where: { id: threadId },
    data: { isActive: false },
  });
}

/**
 * Maybe create a new thread from encounter outcome
 * Only creates if no active thread exists
 */
export async function maybeCreateThreadFromOutcome(
  characterId: string,
  context: OutcomeContext,
  tx?: Prisma.TransactionClient
): Promise<ConsequenceThread | null> {
  const client = tx ?? prisma;

  // Check if there's already an active thread
  const existingThread = await client.consequenceThread.findFirst({
    where: { characterId, isActive: true },
  });

  if (existingThread) {
    return null; // Only one active thread at a time
  }

  // Probability check: 25% on success, 35% on failure
  const probability = context.success ? 0.25 : 0.35;
  const roll = Math.random();

  if (roll > probability) {
    return null; // No thread created
  }

  // Determine thread type based on context
  const threadType = determineThreadType(context);

  // Determine trigger conditions
  const triggerConditions = determineTriggerConditions(context);

  // Get template content
  const template = THREAD_TEMPLATES[threadType];
  const title = deterministicSelect(template.titles, characterId);
  const summary = deterministicSelect(template.summaries, characterId);
  const injectionText = deterministicSelect(template.injections, characterId);

  // Create the thread
  const newThread = await client.consequenceThread.create({
    data: {
      characterId,
      type: threadType,
      title,
      summary,
      injectionText,
      triggerActionId: triggerConditions.triggerActionId,
      triggerLocationType: triggerConditions.triggerLocationType,
      triggerFactionId: triggerConditions.triggerFactionId,
      expiresInActions: 4,
      createdFromEncounterId: context.encounterId,
    },
  });

  return newThread;
}

/**
 * Determine thread type based on outcome context
 */
function determineThreadType(context: OutcomeContext): ThreadType {
  const { success, factionChanges, difficulty } = context;

  // Negative faction changes or failure → retaliation
  const hasNegativeFactionChange = factionChanges?.some((c) => c.change < 0);
  if (!success || hasNegativeFactionChange) {
    // Prefer retaliation if there's a specific faction involved
    if (hasNegativeFactionChange) {
      return 'retaliation';
    }
  }

  // High difficulty → escalation
  if (difficulty >= 7) {
    return 'escalation';
  }

  // Positive faction changes or public locations → recognition
  const hasPositiveFactionChange = factionChanges?.some((c) => c.change > 0);
  const isPublicLocation = ['downtown', 'financial_district', 'waterfront'].includes(
    context.locationType || ''
  );
  if (success && (hasPositiveFactionChange || isPublicLocation)) {
    return 'recognition';
  }

  // Default to callback
  return 'callback';
}

/**
 * Determine trigger conditions based on context
 */
function determineTriggerConditions(context: OutcomeContext): {
  triggerActionId: string | null;
  triggerLocationType: string | null;
  triggerFactionId: string | null;
} {
  const { involvedFactions, locationType, actionId, factionChanges } = context;

  // Priority 1: Faction trigger (especially if there was a negative change)
  const negativeFaction = factionChanges?.find((c) => c.change < 0);
  if (negativeFaction) {
    return {
      triggerFactionId: negativeFaction.factionId,
      triggerLocationType: null,
      triggerActionId: null,
    };
  }

  if (involvedFactions && involvedFactions.length > 0) {
    return {
      triggerFactionId: involvedFactions[0],
      triggerLocationType: null,
      triggerActionId: null,
    };
  }

  // Priority 2: Location trigger
  if (locationType) {
    return {
      triggerFactionId: null,
      triggerLocationType: locationType,
      triggerActionId: null,
    };
  }

  // Priority 3: Action trigger (repeating the same action)
  return {
    triggerFactionId: null,
    triggerLocationType: null,
    triggerActionId: actionId,
  };
}

/**
 * Get active thread for character (for API/UI use)
 */
export async function getActiveThreadForDisplay(characterId: string): Promise<{
  id: string;
  type: string;
  title: string;
  summary: string;
  expiresIn: number;
} | null> {
  const thread = await getActiveThread(characterId);

  if (!thread) return null;

  return {
    id: thread.id,
    type: thread.type,
    title: thread.title,
    summary: thread.summary,
    expiresIn: thread.expiresInActions - thread.actionsElapsed,
  };
}
