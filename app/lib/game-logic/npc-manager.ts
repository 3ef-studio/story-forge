/**
 * NPC Manager
 * Handles NPC selection, encounter injection, and memory tracking
 */

import { prisma } from '@/app/lib/db';
import type { Prisma, CharacterNPC } from '@prisma/client';
import { npcs, getNPCById, getNPCsByFaction, getNPCsByLocation, type NPC } from '@/app/data/npcs';

// NPC selection context
export type NPCSelectionContext = {
  factionIds?: string[];
  locationTags?: string[];
  excludeNpcIds?: string[];
};

// NPC injection for encounter description
export type NPCInjection = {
  npcId: string;
  injectionText: string;
};

// NPC memory for Codex display
export type NPCMemory = {
  npc: NPC;
  familiarity: number;
  disposition: number;
  lastSeenAt: Date | null;
  notes: string | null;
  familiarityLabel: string;
  dispositionLabel: string;
};

// Familiarity thresholds
const FAMILIARITY_LABELS: { threshold: number; label: string }[] = [
  { threshold: 5, label: 'Well Known' },
  { threshold: 3, label: 'Acquaintance' },
  { threshold: 1, label: 'Encountered' },
  { threshold: 0, label: 'Stranger' },
];

// Disposition thresholds
const DISPOSITION_LABELS: { threshold: number; label: string }[] = [
  { threshold: 30, label: 'Trusted Ally' },
  { threshold: 15, label: 'Friendly' },
  { threshold: 5, label: 'Warm' },
  { threshold: -5, label: 'Neutral' },
  { threshold: -15, label: 'Cold' },
  { threshold: -30, label: 'Hostile' },
];

function getFamiliarityLabel(familiarity: number): string {
  for (const { threshold, label } of FAMILIARITY_LABELS) {
    if (familiarity >= threshold) return label;
  }
  return 'Stranger';
}

function getDispositionLabel(disposition: number): string {
  for (const { threshold, label } of DISPOSITION_LABELS) {
    if (disposition >= threshold) return label;
  }
  return 'Enemy';
}

/**
 * Select an NPC for an encounter based on faction/location context
 * Prefers NPCs the character has already met (higher familiarity)
 */
export async function selectNPCForEncounter(
  characterId: string,
  context: NPCSelectionContext
): Promise<NPC | null> {
  const { factionIds = [], locationTags = [], excludeNpcIds = [] } = context;

  // Find matching NPCs from static data
  let candidates: NPC[] = [];

  // Filter by faction first (most specific)
  if (factionIds.length > 0) {
    for (const factionId of factionIds) {
      candidates.push(...getNPCsByFaction(factionId));
    }
  }

  // Filter by location if no faction matches
  if (candidates.length === 0 && locationTags.length > 0) {
    for (const tag of locationTags) {
      candidates.push(...getNPCsByLocation(tag));
    }
  }

  // Fallback to all NPCs if no matches
  if (candidates.length === 0) {
    candidates = [...npcs];
  }

  // Remove duplicates and excluded NPCs
  const uniqueCandidates = Array.from(new Set(candidates.map((n) => n.id)))
    .map((id) => getNPCById(id)!)
    .filter((n) => !excludeNpcIds.includes(n.id));

  if (uniqueCandidates.length === 0) return null;

  // Get character's NPC memories to prefer known NPCs
  const knownNPCIds = await prisma.characterNPC.findMany({
    where: {
      characterId,
      npcId: { in: uniqueCandidates.map((n) => n.id) },
    },
    select: { npcId: true, familiarity: true },
  });

  const familiarityMap = new Map(knownNPCIds.map((k) => [k.npcId, k.familiarity]));

  // Sort by familiarity (known NPCs first), then random
  const sortedCandidates = uniqueCandidates.sort((a, b) => {
    const famA = familiarityMap.get(a.id) ?? -1;
    const famB = familiarityMap.get(b.id) ?? -1;
    if (famA !== famB) return famB - famA;
    return Math.random() - 0.5;
  });

  // 60% chance to pick most familiar, 40% random from top 3
  if (Math.random() < 0.6 && sortedCandidates.length > 0) {
    return sortedCandidates[0];
  }

  const topCandidates = sortedCandidates.slice(0, Math.min(3, sortedCandidates.length));
  return topCandidates[Math.floor(Math.random() * topCandidates.length)];
}

/**
 * Build NPC injection text for an encounter description
 */
export async function buildNPCInjection(
  characterId: string,
  npc: NPC
): Promise<NPCInjection> {
  // Get character's memory of this NPC
  const memory = await prisma.characterNPC.findUnique({
    where: {
      characterId_npcId: { characterId, npcId: npc.id },
    },
  });

  const hasMetBefore = memory && memory.familiarity > 0;
  const dispositionMod = memory?.disposition ?? npc.baseDisposition;

  // Build context-aware injection text
  let injectionText: string;

  if (hasMetBefore) {
    const familiarityDesc =
      memory.familiarity >= 3 ? 'familiar' : memory.familiarity >= 2 ? 'recognizable' : 'vaguely familiar';

    if (dispositionMod > 15) {
      injectionText = `Present: ${npc.name} (${npc.role}), a ${familiarityDesc} face who seems pleased to see you. ${npc.visualDescription}`;
    } else if (dispositionMod < -15) {
      injectionText = `Present: ${npc.name} (${npc.role}), a ${familiarityDesc} face whose expression turns cold upon seeing you. ${npc.visualDescription}`;
    } else {
      injectionText = `Present: ${npc.name} (${npc.role}), a ${familiarityDesc} face. ${npc.visualDescription}`;
    }
  } else {
    // First encounter
    injectionText = `Present: ${npc.name}, ${npc.role}. ${npc.visualDescription}`;
  }

  return {
    npcId: npc.id,
    injectionText,
  };
}

/**
 * Record an NPC encounter (create or update CharacterNPC)
 */
export async function recordNPCEncounter(
  characterId: string,
  npcId: string,
  dispositionChange: number = 0,
  notes?: string,
  tx?: Prisma.TransactionClient
): Promise<CharacterNPC> {
  const client = tx ?? prisma;

  const existing = await client.characterNPC.findUnique({
    where: {
      characterId_npcId: { characterId, npcId },
    },
  });

  if (existing) {
    // Update existing record
    const updateData: Prisma.CharacterNPCUpdateInput = {
      familiarity: { increment: 1 },
      disposition: { increment: dispositionChange },
      lastSeenAt: new Date(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    return client.characterNPC.update({
      where: { id: existing.id },
      data: updateData,
    });
  } else {
    // Create new record
    const npc = getNPCById(npcId);
    const baseDisposition = npc?.baseDisposition ?? 0;

    return client.characterNPC.create({
      data: {
        characterId,
        npcId,
        familiarity: 1,
        disposition: baseDisposition + dispositionChange,
        lastSeenAt: new Date(),
        notes,
      },
    });
  }
}

/**
 * Get all known NPCs for a character (for Codex)
 */
export async function getKnownNPCs(characterId: string): Promise<NPCMemory[]> {
  const characterNPCs = await prisma.characterNPC.findMany({
    where: { characterId },
    orderBy: [{ familiarity: 'desc' }, { lastSeenAt: 'desc' }],
  });

  const memories: NPCMemory[] = [];

  for (const cn of characterNPCs) {
    const npc = getNPCById(cn.npcId);
    if (!npc) continue;

    memories.push({
      npc,
      familiarity: cn.familiarity,
      disposition: cn.disposition,
      lastSeenAt: cn.lastSeenAt,
      notes: cn.notes,
      familiarityLabel: getFamiliarityLabel(cn.familiarity),
      dispositionLabel: getDispositionLabel(cn.disposition),
    });
  }

  return memories;
}

/**
 * Get a single NPC's memory for a character
 */
export async function getNPCMemory(
  characterId: string,
  npcId: string
): Promise<NPCMemory | null> {
  const npc = getNPCById(npcId);
  if (!npc) return null;

  const characterNPC = await prisma.characterNPC.findUnique({
    where: {
      characterId_npcId: { characterId, npcId },
    },
  });

  if (!characterNPC) {
    // Return base NPC data with default memory
    return {
      npc,
      familiarity: 0,
      disposition: npc.baseDisposition,
      lastSeenAt: null,
      notes: null,
      familiarityLabel: 'Stranger',
      dispositionLabel: getDispositionLabel(npc.baseDisposition),
    };
  }

  return {
    npc,
    familiarity: characterNPC.familiarity,
    disposition: characterNPC.disposition,
    lastSeenAt: characterNPC.lastSeenAt,
    notes: characterNPC.notes,
    familiarityLabel: getFamiliarityLabel(characterNPC.familiarity),
    dispositionLabel: getDispositionLabel(characterNPC.disposition),
  };
}

/**
 * Update disposition based on encounter outcome
 */
export function calculateDispositionChange(
  success: boolean,
  npcFactionId: string | undefined,
  factionChanges?: { factionId: string; change: number }[]
): number {
  let change = 0;

  // Base change from success/failure
  if (success) {
    change += 2;
  } else {
    change -= 1;
  }

  // Faction alignment bonus/penalty
  if (npcFactionId && factionChanges) {
    const factionChange = factionChanges.find((f) => f.factionId === npcFactionId);
    if (factionChange) {
      // Mirror faction reputation changes
      change += Math.sign(factionChange.change) * 3;
    }
  }

  return change;
}

/**
 * Calculate disposition change for social actions (higher base than combat)
 */
export function calculateSocialDispositionChange(
  npcFactionId?: string,
  factionChanges?: { factionId: string; change: number }[]
): number {
  // Social actions are inherently relationship-building
  let change = 5;

  if (npcFactionId && factionChanges) {
    const factionChange = factionChanges.find((f) => f.factionId === npcFactionId);
    if (factionChange) {
      if (factionChange.change > 0) {
        change += 3;
      } else if (factionChange.change < 0) {
        change -= 2;
      }
    }
  }

  return change;
}

/**
 * Record a social interaction with an NPC (non-encounter social actions)
 * Returns metadata for the API response
 */
export async function recordSocialInteraction(
  characterId: string,
  npcId: string,
  factionChanges?: { factionId: string; change: number }[],
  tx?: Prisma.TransactionClient
): Promise<{
  npcId: string;
  npcName: string;
  npcRole: string;
  dispositionChange: number;
  dispositionLabel: string;
}> {
  const npc = getNPCById(npcId);
  const npcName = npc?.name ?? 'Unknown';
  const npcRole = npc?.role ?? 'Unknown';
  const npcFactionId = npc?.factionId;

  const dispositionChange = calculateSocialDispositionChange(npcFactionId, factionChanges);

  const record = await recordNPCEncounter(characterId, npcId, dispositionChange, undefined, tx);

  return {
    npcId,
    npcName,
    npcRole,
    dispositionChange,
    dispositionLabel: getDispositionLabel(record.disposition),
  };
}
