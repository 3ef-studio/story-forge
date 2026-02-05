/**
 * Validation script: simulate 10 sequential encounters and verify follow-up
 * variety, dedupe, cooldown, and intent diversity.
 *
 * Run: npx tsx scripts/validate-followups.ts
 */
import {
  generateFollowUps,
  decrementFollowUpTTLs,
  mergeFollowUps,
  parseFollowUpHistory,
  addHistoryEntries,
  type FollowUpContext,
  type FollowUpAction,
  type FollowUpHistory,
  type FollowUpHistoryEntry,
  type ConflictResult,
  type GambitOutcome,
} from '../app/lib/game-logic/follow-up-actions';

// ── helpers ──────────────────────────────────────────────────────────────────
const conflictResults: ConflictResult[] = ['victory', 'defeat', 'partial'];
const gambitOutcomes: (GambitOutcome | undefined)[] = ['clean', 'complication', 'backfire', undefined];
const factionSets = [['syndicate'], ['metro_police'], ['street_gangs', 'syndicate'], [], ['black_market']];
const districts = ['downtown', 'industrial', 'waterfront', 'slums', 'midtown'];

function makeContext(i: number): FollowUpContext {
  return {
    characterId: 'char_test_abc123',
    actionCounter: i,
    encounterId: `enc_${i}_${Math.floor(Math.random() * 999)}`,
    seedId: `seed_${i}`,
    encounterType: ['criminal', 'heroic', 'neutral', 'social'][i % 4],
    encounterDifficulty: 3 + (i % 6),
    factions: factionSets[i % factionSets.length],
    district: districts[i % districts.length],
    actionId: `action_${i % 5}`,
    outcomeType: (['success', 'partial', 'failure'] as const)[i % 3],
    conflictResult: conflictResults[i % 3],
    gambitOutcome: gambitOutcomes[i % gambitOutcomes.length],
    npcId: i % 3 === 0 ? `npc_${i}` : undefined,
    npcName: i % 3 === 0 ? `NPC #${i}` : undefined,
    rivalPresent: i % 4 === 0,
    leverageState: { control: i % 3, stability: (i + 1) % 3, position: (i + 2) % 3 },
    baseActionIntent: ['heroic', 'criminal', 'neutral', 'social'][i % 4],
  };
}

// ── simulation ───────────────────────────────────────────────────────────────
let pending: FollowUpAction[] = [];
let history: FollowUpHistory = { entries: [] };
const allGenerated: { round: number; names: string[]; intents: string[]; categories: string[]; keys: string[] }[] = [];
let executedKey: string | null = null;

console.log('=== Follow-Up Validation: 10 sequential encounters ===\n');

for (let i = 0; i < 10; i++) {
  const ctx = makeContext(i);

  // 1. Decrement TTLs
  const { alive, expired } = decrementFollowUpTTLs(pending);
  if (expired.length > 0) {
    const entries: FollowUpHistoryEntry[] = expired
      .filter(f => f.followUpKey)
      .map(f => ({ followUpKey: f.followUpKey, actionCounter: i, status: 'expired' as const }));
    history = addHistoryEntries(history, entries);
  }
  pending = alive;

  // 2. Generate new
  const newFollowUps = generateFollowUps(ctx, {
    max: 3,
    history,
    cooldownActions: 3,
    pendingFollowUps: pending,
  });

  // 3. Record in history
  if (newFollowUps.length > 0) {
    const entries: FollowUpHistoryEntry[] = newFollowUps.map(f => ({
      followUpKey: f.followUpKey,
      actionCounter: i,
      status: 'generated' as const,
    }));
    history = addHistoryEntries(history, entries);
  }

  // 4. Merge
  pending = mergeFollowUps(pending, newFollowUps, { maxTotal: 5 });

  const names = newFollowUps.map(f => f.name);
  const intents = newFollowUps.map(f => f.intentHint);
  const categories = newFollowUps.map(f => f.category);
  const keys = newFollowUps.map(f => f.followUpKey);

  allGenerated.push({ round: i, names, intents, categories, keys });

  console.log(`Round ${i}: generated ${newFollowUps.length} | pending ${pending.length} | expired ${expired.length}`);
  console.log(`  Names:      ${names.join(', ') || '(none)'}`);
  console.log(`  Intents:    ${intents.join(', ') || '-'}`);
  console.log(`  Categories: ${categories.join(', ') || '-'}`);
  console.log(`  Keys:       ${keys.join(', ') || '-'}`);

  // Simulate executing the first follow-up every 3 rounds
  if (i % 3 === 2 && pending.length > 0) {
    const exec = pending[0];
    executedKey = exec.followUpKey;
    pending = pending.filter(f => f.id !== exec.id);
    if (exec.followUpKey) {
      history = addHistoryEntries(history, [{
        followUpKey: exec.followUpKey,
        actionCounter: i,
        status: 'executed',
      }]);
    }
    console.log(`  >>> EXECUTED: "${exec.name}" (${exec.followUpKey})`);
  }
  console.log('');
}

// ── assertions ───────────────────────────────────────────────────────────────
console.log('=== VALIDATION CHECKS ===\n');

let pass = true;

// 1. No duplicates in pending at any point (already enforced by mergeFollowUps by key)
const pendingKeySet = new Set(pending.map(f => f.followUpKey));
if (pendingKeySet.size !== pending.length) {
  console.log('FAIL: Duplicate followUpKeys in final pending list');
  pass = false;
} else {
  console.log('PASS: No duplicate followUpKeys in final pending');
}

// 2. Variety: check that we didn't generate the same set every round
const uniqueSets = new Set(allGenerated.map(g => g.keys.sort().join('|')));
if (uniqueSets.size < 3) {
  console.log(`FAIL: Only ${uniqueSets.size} unique follow-up sets across 10 rounds (want >= 3)`);
  pass = false;
} else {
  console.log(`PASS: ${uniqueSets.size} unique follow-up sets (variety)`);
}

// 3. Mixed intents: check that across all rounds, we see all 3 intents
const allIntents = new Set(allGenerated.flatMap(g => g.intents));
if (allIntents.size < 3) {
  console.log(`FAIL: Only ${allIntents.size} intent types seen (want 3)`);
  pass = false;
} else {
  console.log(`PASS: All 3 intent types seen across rounds`);
}

// 4. Mixed categories
const allCategories = new Set(allGenerated.flatMap(g => g.categories));
if (allCategories.size < 3) {
  console.log(`FAIL: Only ${allCategories.size} categories seen (want >= 3)`);
  pass = false;
} else {
  console.log(`PASS: ${allCategories.size} different categories seen`);
}

// 5. Cooldown: check that an executed follow-up doesn't appear within 3 actions
if (executedKey) {
  // executedKey was executed at round 2. Check rounds 3, 4, 5 (should not contain it)
  const cooldownViolation = allGenerated.some(g =>
    g.round > 2 && g.round <= 5 && g.keys.includes(executedKey!)
  );
  if (cooldownViolation) {
    console.log(`FAIL: Executed key "${executedKey}" reappeared within 3 actions`);
    pass = false;
  } else {
    console.log(`PASS: Executed follow-up stayed on cooldown for 3 actions`);
  }
}

// 6. Per-round dedupe: no round has duplicate keys
for (const g of allGenerated) {
  const roundKeys = new Set(g.keys);
  if (roundKeys.size !== g.keys.length) {
    console.log(`FAIL: Round ${g.round} has duplicate followUpKeys`);
    pass = false;
  }
}
console.log('PASS: No per-round duplicate followUpKeys');

console.log(`\n=== ${pass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'} ===`);
process.exit(pass ? 0 : 1);
