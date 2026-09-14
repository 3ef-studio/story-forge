# AI Architecture

Where the LLM fits into Story Forge, and — more importantly — where it doesn't. This is the single most easily-misread part of the codebase (see the naming trap called out below), so read this before touching anything under `app/lib/ai/*` or `app/lib/game-logic/conflict/`.

All claims below are **FACT**, sourced by reading `app/lib/ai/{encounter-seed-generator,encounter-cache,encounter-personalizer,types,openai}.ts` and `app/lib/game-logic/conflict/{ai,engine}.ts` directly for this document, plus `app/api/action/execute/route.ts` for how the pieces are called.

## The central claim, stated precisely

**The LLM proposes bounded content and numeric parameters for a generic, cacheable encounter template. It never decides whether an action succeeds, and every number it can emit is clamped by a Zod schema before it can reach the database.** All consequential game-state math (success/failure, XP totals actually applied, faction reputation cascades, district control, leveling) happens in deterministic TypeScript in `app/lib/game-logic/*` and `app/lib/world/*`, independent of the AI call.

## Naming trap: `conflict/ai.ts` is not generative AI

`app/lib/game-logic/conflict/ai.ts` (`selectOpponentMove`, `resolveProfile`) implements the opponent's move selection in the Resource Fracture minigame. Despite the filename, **it makes zero calls to OpenAI or any language model.** It is a deterministic, weighted-table heuristic keyed by NPC tags / encounter category → opponent "archetype," unit-tested explicitly for determinism (same context → same move, every time). If you are looking for "the AI" in combat, it is not here — combat is 100% deterministic. See [GAME_SYSTEMS.md](./GAME_SYSTEMS.md#the-conflict-engine-resource-fracture) for the mechanics.

## The two generations of the encounter pipeline

Two encounter-generation code paths exist in the repository:

1. **Legacy monolithic generator** (`app/lib/ai/encounter-generator.ts`) — a single AI call producing a fully personalized encounter directly. **Confirmed dead code**: zero importers anywhere outside itself/tests (verified via `grep`).
2. **Live "seed + personalize" pipeline** — the one actually called from `app/api/action/execute/route.ts`. This is the architecture documented below.

## The live pipeline

```
Action execute
  → findCachedSeed()          deterministic cache lookup (DB)
      HIT  → reuse cached seed
      MISS → generateSeed()   OpenAI call, generic content only
             → cacheSeed()    store for reuse by any player
  → personalizeSeed()         deterministic, zero AI cost
  → encounter returned to client
```

### 1. Seed generation — the only step that calls an LLM

`generateSeed()` in `encounter-seed-generator.ts` calls `gpt-4o-mini` (`app/lib/openai.ts`, JSON mode, `temperature: 0.7`, `maxTokens: 1500`) with a system prompt (`SEED_SYSTEM_PROMPT` + a few-shot example, `seed-prompts.ts`) and a context built from `buildSeedInput()`: `actionCategory`, `moralIntent`, `encounterType`, `difficulty`/`difficultyBucket`, `location`, and a **sorted** list of `involvedFactions`. **No player-specific data is included by design** — no character name, stats, or history — so the resulting seed is generic and safely shareable across every player who hits the same cache key.

The model is asked to produce: a title, situation summary, optional opening style/stake type, up to 2 "seed hooks," and **exactly 4 choices** — one each for approach `direct` / `subtle` / `diplomatic` / `tactical` — each with a matching outcome containing numeric rewards.

### 2. Validation — every number is clamped before anything touches the cache

The raw JSON response is parsed and run through a Zod schema (`seedSchema`) before it is trusted at all:

| Field | Constraint |
|---|---|
| `successChance` | `0.1`–`0.95` |
| success `xpGain` | integer `10`–`100` |
| failure `xpGain` | integer `5`–`50` |
| `factionChanges[].change` | integer `-50`–`50`, `factionId` must be a real ID from `app/data/factions.ts` |
| `attributeGrowth[].amount` | integer `1`–`3`, `attributeId` must be one of 10 known attribute IDs |
| `hpLoss` | integer `0`–`50`, optional |
| `choices` / `outcomes` | exactly 4 each |

On top of the schema, `validateSeedStructure()` enforces structural invariants a schema alone can't: all 4 approach types must be present, choice IDs must be exactly `choice_1..4`, every choice must have a matching outcome, and the text must **not** contain personalization-leakage phrases (`"since last"`, `"as always"`, `"remember when"`) — since the seed is meant to be player-agnostic. `sanitizeText()` additionally strips control characters and HTML/script tags from every string field before storage.

**If validation fails at any step, `generateSeed()` returns `null` and logs the reason — it never throws, and never caches a partially-invalid seed.**

### 3. Caching

`findCachedSeed()` / `cacheSeed()` (`encounter-cache.ts`) use a **deterministic composite key**: `encounterType:difficultyBucket:location:sortedFactionKey:actionCategory`. Lookup tolerates a ±1 difficulty band and requires only partial (`hasSome`, not `hasEvery`) faction overlap, so a moderately wide range of similar requests can hit the same cached seed. A seed is evicted from active use after `MAX_SEED_USES = 10` (checked at lookup time via `timesUsed`); `cleanStaleCache()` additionally deletes anything over `MAX_CACHE_AGE_DAYS = 30` or `MAX_USES_BEFORE_STALE = 5` for the older, non-seed cache format — but **nothing in the codebase currently calls `cleanStaleCache()`**; it exists as a callable function only (a manual or future-cron target).

This design serves three goals simultaneously, stated directly in the code's own comments: **cost** (most requests are cache hits, avoiding an OpenAI call entirely), **latency** (skips the round-trip), and **consistency** (the same seed key always proposes the same reward envelope, even though personalization varies the surface text).

### 4. Personalization — deterministic, not AI

`personalizeSeed()` in `encounter-personalizer.ts` turns a generic seed into a player-facing encounter using **only** template logic: an opening-line table keyed by `openingStyle`, a stakes-line table keyed by `stakeType`, reputation-tier phrase tables (`hostile`/`unfriendly`/`neutral`/`friendly`/`allied`, derived from the character's numeric faction reputation), a power-flavor-line lookup table (one line per power name, checked in priority order), and tone-prefix rules applied to choice labels (`aggressive` → "Force the issue — …", `cautious` → "Carefully …", etc.). The code comment is explicit about why: *"Deterministic personalization - no AI call needed... ensures cost efficiency and consistent behavior."* This step costs zero additional tokens regardless of how many players see the same seed.

### 5. Fallback chain

If `findCachedSeed()` misses and `generateSeed()` also fails (API error or validation failure), `app/api/action/execute/route.ts` falls back to `getAvailableEncounters()` / `selectRandomEncounter()` over a **static template pool** (`app/data/encounter-templates.ts`) — hand-authored encounters with no AI involvement at all. This means an encounter is always returned; the player never sees a hard failure from the AI layer. Three tiers, in order: cache → AI generation → static templates.

### 6. Reproducibility — scoped, not global

The OpenAI call itself is **not seeded or deterministic**: `temperature: 0.7`, no `seed` parameter is passed to the API. Two cache misses against the same key can produce different seed content. Reproducibility is achieved *around* the model, not *within* it — by caching whatever the model produces the first time and reusing that exact content deterministically thereafter via the composite key. Contrast this with the game's seeded-RNG systems (rival generation, world reactions, dungeon layout), which are reproducible by construction — see below.

## Does AI ever directly write to durable game state?

Indirectly, yes, but only within the Zod-bounded envelope described above: a cached seed's `xpGain`/`factionChanges`/`successChance`/`hpLoss` values are read back by `/api/action/resolve` and applied (after further deterministic adjustment — partial-success gives 50% XP/faction change, consumables can modify the multiplier). The AI never picks whether an encounter succeeds, never mutates `Character` fields directly, and never runs outside the schema's numeric ranges. Success/failure itself is decided by `resolveEncounter()` (a deterministic dice-roll formula over attributes/powers/reputation) **or** by the client-reported conflict-minigame outcome — see [ARCHITECTURE.md](./ARCHITECTURE.md#trust-boundaries) for that separate, unrelated trust question.

## Cost / latency controls, summarized

- Cheap model (`gpt-4o-mini`), not a larger/more expensive one.
- Token caps: 1500 (seed), 2000 (legacy full-generation, now unused).
- Cache-first lookup before any API call is made.
- The seed/personalize split itself is the primary lever — most player-visible "personalized" encounters cost zero additional LLM tokens because personalization is templating, not generation.
- Retry-with-backoff exists for rate-limit/5xx errors (`app/lib/openai.ts`) but **not** for validation failures — a bad-but-parseable response is not retried, it's discarded and falls through the chain above.

## Seeded RNG — three independent implementations (not part of the AI layer, but adjacent)

The game has three separate, non-shared seeded-RNG implementations, none of which touch the AI pipeline:

| Implementation | Algorithm | Used for |
|---|---|---|
| `app/lib/utils/rng.ts` | Mulberry32, seeded from a string hash | Rival generation (`rival-generator.ts`) |
| `app/lib/world/seededRng.ts` | djb2 hash + LCG (MINSTD parameters) | World reactions, seeded by `scopeId + worldTurn + suffix` |
| `app/lib/dungeon/generator.ts` (`SeededRandom` class, inline) | Custom LCG (classic ANSI-C `rand()` constants: `seed*1103515245+12345`) | Dungeon floor layout |

None of these seed the OpenAI call. Reproducibility in this codebase means "the same seed value replays the same deterministic sequence of game-logic randomness," not "the same inputs replay the same AI output." See [DUNGEONS.md](./DUNGEONS.md) for a caveat specific to the dungeon generator's seed origin.
