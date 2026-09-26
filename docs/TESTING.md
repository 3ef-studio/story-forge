# Testing

What actually exists, what it covers, and — more importantly — what it doesn't. This document exists so the coverage gap doesn't have to be rediscovered from scratch every session.

**Updated 2026-09-16**: a scoped testing-only pass (no product code changed) added 8 new test files (182 test cases) covering the priority list below — escalation/victory, district control-share math, alignment, leverage/heat, dungeon generation determinism, trap/search DC formulas, and an AI schema eval harness. See the dedicated sections below for what's covered and what's mocked. The original numbers from 2026-09-13 are preserved inline for history where relevant.

All numbers below are from a fresh, read-only run performed for this document (2026-09-16): `npx tsc --noEmit`, `npx vitest run`, `npx eslint .`. No product code was fixed or modified — this was a test-only addition.

## Commands

```bash
npx tsc --noEmit   # typecheck
npx vitest run     # unit tests (includes the smoke suite; DB smoke tests skip)
npm run smoke      # smoke suite only — offline, ~1s
npm run smoke:db   # read-only database smoke check (needs DATABASE_URL)
npx eslint .       # lint
```

There is no `typecheck` or `lint`-in-CI script wired up — these are run manually. `npm test` runs `vitest run`.

## Current results (2026-09-25, after merging the 2026-09-16 unit tests and the 2026-09-25 smoke suite)

- **`npx tsc --noEmit`** — 0 errors.
- **`npx vitest run`** — **18 test files, 279/279 tests passing, 4 skipped** (13 files / 233 unit tests from 2026-09-16, unchanged, + 5 files / 46 offline smoke tests from 2026-09-25; the 4-test DB tier skips by default and is run separately via `npm run smoke:db`).
- **`npx eslint .`** — 68 problems: **12 errors, 56 warnings** — identical to the 2026-09-13 baseline across both additions. Not fixed as part of either testing pass per scope; see breakdown below.

## What's actually tested

### Pre-existing (2026-09-13), unchanged

5 files under `app/lib/game-logic/{conflict,pvp}/__tests__/` — the conflict engine and PvP core:

| File | What it tests |
|---|---|
| `conflict/__tests__/engine.test.ts` | `initConflict`/`executeTurn`/`evaluateOutcome`/`getPlayerMoves` — resource init and scaling by difficulty, turn/log integrity, move-availability gating, resource clamping, **determinism** (identical inputs → identical outputs, asserted explicitly), build- and opponent-identity-influenced bonuses |
| `conflict/__tests__/build-bonuses.test.ts` | `deriveEncounterContext`, `computeStartingBonuses`, `computeMoveBonus` — attribute/power affinity mapping, bonus capping, power level-gating, determinism |
| `conflict/__tests__/opponent-identity.test.ts` | `resolveOpponentIdentity` — rival-personality → archetype mapping, NPC-tag → archetype mapping, priority order (rival > NPC > fallback), threat-tier math, determinism |
| `conflict/__tests__/ai.test.ts` | `resolveProfile`, `selectOpponentMove` — tag→profile mapping, profile-weighted move selection, explicit determinism assertion. **This tests the deterministic opponent-move heuristic in `conflict/ai.ts`, not any language model.** See [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md#naming-trap-conflictaits-is-not-generative-ai). |
| `pvp/__tests__/pvp.test.ts` | Elo update math (`calculateEloUpdate`), `runPvpCombat` simulator — valid outcome shape, determinism, turn cap enforcement (4), simulation purity (inputs not mutated), build/power influence on outcome. Contains explicit comment blocks for *un-implemented* integration scenarios (DB-level cooldown enforcement, energy deduction, unranked-rating immutability) — left as documented TODOs, not executed tests. |

### New (2026-09-16) — see the in-session testing report for the full write-up (coverage detail, mocked interfaces, and remaining gaps per module)

8 files, 131 test cases, added in a testing-only pass (no product code changed):

| File | What it tests | External deps mocked |
|---|---|---|
| `app/lib/game-logic/__tests__/alignment.test.ts` | Tier classification, per-tier modifiers, `applyAlignmentDelta` (favored/forbidden actions, deity-specific collateral/deception/civilian/lawful reactions, outcome modifier, drift-rate scaling), value clamping, label generation, `inferActionTags` keyword inference | None — pure functions |
| `app/lib/game-logic/__tests__/leverage.test.ts` | Clamping/caps, prep/focus → leverage-type mapping (including the mechanics-hint-over-category priority), spend/decay rules (priority order on ties), `computeLeverageUpdate` end-to-end, `computeHeatUpdate` (rest/follow-up/decay priority) | None — pure functions |
| `app/lib/world/__tests__/escalationAndVictory.test.ts` | City-share averaging, tier boundaries, district-leader/tie analysis, the win-condition check (`>70%`, no-tie, same-faction-every-district), counter/ripple/difficulty modifiers, and the **win-streak state machine** (`updateVictoryStreakAndWinner`: builds over 2 turns, resets on a non-qualifying turn, restarts on faction change, freezes once won) | `prisma.worldState.{findUnique,create,update}` (in-memory `Map`) |
| `app/lib/world/__tests__/districtControlShares.test.ts` | Default-share initialization, leader computation (controlled vs. contested threshold, tie handling), lazy migration from the legacy `controllingFactionId`/`controlValue` format, the gain algorithm (uncontrolled-first, then highest-share donor), the loss algorithm (capped at current share), normalization to 100 | `prisma.districtState.{findUnique,create,update}` (in-memory `Map`) |
| `app/lib/dungeon/__tests__/trap.test.ts` | Depth→difficulty mapping, the DC/damage tables, perception/disarm check formulas at exact pass/fail boundaries | `Math.random` (pins the d25 roll) |
| `app/lib/dungeon/__tests__/search.test.ts` | No-session/no-secret-nearby cases, the DC-12 stat check (agility-vs-intelligence, "use the better one"), successful discovery persisting to session state, `hasAdjacentSecrets` | `prisma.dungeonSession.{findFirst,findUnique,update}` (in-memory `Map`), `Math.random` (pins the d20 roll) |
| `app/lib/dungeon/__tests__/generator.test.ts` | Structural invariants (exactly 1 STAIRS/BOSS/SECRET, chamber/corridor counts within config bounds, all positions in-bounds, full graph connectivity from STAIRS via OPEN edges, the SECRET room's single dedicated edge to a chamber, content-type distribution), plus **determinism**: two generations with the same mocked `Math.random` draw (which pins the internal seed) produce byte-identical node/edge sets | `prisma.$transaction` + `dungeonFloor/dungeonNode/dungeonEdge.create` (captures what would be persisted), `Math.random` (pins the one-time seed draw) |
| `app/lib/ai/__tests__/encounter-seed-generator.test.ts` | An **eval-harness-style** suite for `generateSeed()`: accepts a fully valid response; sanitizes tag markup (with a documented nuance — see below); rejects malformed JSON, out-of-range numeric fields, invalid faction/attribute IDs, missing approach types, choice/outcome ID mismatches, personalization-leakage phrases, too-few choices, and upstream OpenAI errors — always returning `null`, never throwing; `buildSeedInput`'s difficulty-bucketing and faction-sorting | `generateJSONCompletion` (returns canned JSON fixtures — no network calls) |

`scripts/validate-followups.ts` is a standalone `tsx`-run simulation script that drives the follow-up-action system through synthetic rounds and prints pass/fail checks to stdout. It is **not** part of `npm test` and does not run in any automated context.

### Notable finding from writing these tests

`sanitizeText()` in `app/lib/ai/encounter-seed-generator.ts` strips HTML/script tag *markup* but not tag *contents* — `<script>alert(1)</script>X` becomes `alert(1)X`, not `X`. This is correct-by-design for its actual purpose (the sanitized string only ever flows into JSON consumed by React, which escapes on render, so there is no injection vector) but is worth knowing precisely if anyone changes this function's contract later.

## Smoke suite (`tests/smoke/`, added 2026-09-25)

A shallow "are the essential systems basically working?" layer, separate from the detailed unit tests above. It asserts **invariants** (ranges, shapes, round-trips, determinism), deliberately not exact balance numbers, so balance tweaks shouldn't break it.

**Offline tier — `npm run smoke`** (no DB, no OpenAI key, no network; 46 tests, <1s):

| File | Covers |
|---|---|
| `core-loop.smoke.test.ts` | Encounter preview/resolution for every approach; a full conflict played to a terminal outcome; PvP combat within the turn cap + zero-sum Elo; follow-up generate→merge→TTL cycle stays deduped/bounded; the seed prompt's few-shot example parses into a valid 4-choice seed, and `personalizeSeed` turns it into an encounter without changing its mechanics |
| `progression.smoke.test.ts` | Leverage gain/spend/caps, heat clamp, alignment deltas for every deity, intent clamp/bands, energy regen, power XP/levelling and gating, consumable inventory cap + JSON round-trip, store offer generation/refresh |
| `world.smoke.test.ts` | Default district shares sum to 100; city shares, faction tiers and `checkWinCandidate` agree on a dominated city and find no winner in an untouched one; `computeCityControl` percentages sum to 100; district modifiers preserve sign within ±50; seeded RNG determinism; dungeon trap DC scaling and check consistency |
| `data.smoke.test.ts` | Every `app/data/*` table loads with unique ids; district adjacency, origin → power/faction/attribute/deity references resolve; every origin can create a character |

Import-safety rules (FACT, verified 2026-09-25): helpers from Prisma-importing modules are safe to import because `app/lib/db.ts` constructs the client lazily. `app/lib/openai.ts` constructs its client **at import time**, so the smoke suite must never import `encounter-seed-generator.ts` or `encounter-generator.ts` — only the deterministic half of the AI pipeline (`encounter-personalizer.ts`, `seed-prompts.ts`) is covered.

**Database tier — `npm run smoke:db`** (opt-in; skipped by `npm test`/`npm run smoke`; also enabled by `SMOKE_DB=1`). Loads `DATABASE_URL` from the environment, `.env.local`, or `.env`, and fails (not skips) if it's missing. All queries run inside a Postgres `READ ONLY` transaction, so the database itself rejects any write. Checks: `SELECT 1`; **every model table and scalar column in `schema.prisma` exists in the live database** (via `information_schema`, a direct check against the schema-drift risk in [DATA_MODEL.md](./DATA_MODEL.md)); one trivial read through the generated Prisma client. It checks schema → DB only; extra objects in the DB are not reported.

Validation performed when this was added (2026-09-25): offline tier passes; three deliberate one-line breakages (win condition, leverage cap, Elo sign) were each caught and reverted; the DB tier was run against a disposable local Postgres 16 built from `prisma migrate diff --from-empty` SQL — passes when healthy, fails with a clear message when `DATABASE_URL` is missing or unreachable, and names the exact table/column when one is dropped; a write attempted inside the same read-only transaction pattern was rejected by Postgres (`25006`).

**Run against the real Neon database (2026-09-25, same day):** the first pass hit a 5s Vitest test-timeout on the connectivity check's first query — the connection had actually succeeded (later queries in the same run completed in a few hundred ms), it was just a cold-started Neon branch taking longer than 5s to wake up. The connectivity test's timeout was bumped to 15s; a clean **4/4 pass** followed, including the schema-drift check — **no drift detected between `schema.prisma` and the live Neon schema** as of this date.

## What still has zero test coverage

The smoke suite above touches many of the modules below at a *does-it-run* level; it does not replace real unit-test coverage, which remains absent for:

- `district-influence.ts`, `energy-regen.ts`, `power-progression.ts`, `power-gating.ts`, `consumables.ts`, `store.ts`, `goal-manager.ts`, `intent.ts`, `npc-manager.ts`, `patron-reaction.ts`, `rival-generator.ts`, `thread-manager.ts`, `combat/resolve-encounter.ts`
- `app/lib/world/{cityControl,faction-state,applyDistrictModifiers,applyWorldReactions,applyDeathWorldConsequences,city-updates,seededRng}.ts`
- `app/lib/dungeon/{movement,minimap,session,types}.ts` (session lifecycle — enter/complete/fail/abandon — is untested; movement/minimap are untested)
- `character/applyWoundedState.ts`
- Every API route under `app/api/*` — no route-level/integration tests exist anywhere
- `app/lib/ai/encounter-personalizer.ts` and `encounter-cache.ts` — the deterministic personalization and DB-caching layers are untested (only seed generation/validation is now covered)
- District-state's DB-facing orchestration (`getDistrictStates`, `updateDistrictStateFromEncounter`) — the underlying share math it calls (`districtControlShares.ts`) is now tested, but the orchestration layer itself is not

## No CI

No `.github/workflows` directory exists. Nothing runs `tsc`/`vitest`/`eslint` automatically on push or PR — all three are opt-in, human- or agent-invoked commands. A regression in any untested module can reach `main` undetected. This remains true after the 2026-09-16 testing pass — more of the codebase is now covered, but nothing enforces that coverage automatically.

## Lint detail (12 errors, 56 warnings, 2026-09-13)

Errors: mostly `prefer-const` (`conflict/engine.ts:501`, `leverage.ts:120`) and unescaped-JSX-entity issues (`app/map/page.tsx:371`, `app/victory/page.tsx:161`, two occurrences). Warnings are overwhelmingly `@typescript-eslint/no-unused-vars` across game-logic and world files — several defined-but-unused constants that look like leftover tuning knobs rather than accidental dead code (e.g. `RIPPLE_SPILLOVER_CHANCE` in `applyWorldReactions.ts`, `LEVERAGE_OVERCAP_MAX` re-export in `conflict/engine.ts`, `computeDistrictLeader` in two files). None are severe; the codebase typechecks cleanly and lints without hard blockers. **Not fixed here** — out of scope for a documentation mission; see [PROJECT_STATE.md](./PROJECT_STATE.md#known-risks).

## Priority if a further testing pass is scoped later

The original 2026-09-13 priority list (escalation/victory, district-share math, alignment/leverage, dungeon-generation determinism, an AI-schema eval harness) was fully addressed on 2026-09-16, and the 2026-09-25 smoke suite added a broad shallow safety net on top. If picking this up again, in rough order of value:

1. Dungeon session lifecycle (`session.ts`: `enterDungeon`, `completeDungeon`, `failDungeon`, `abandonDungeon`) — still genuinely untested at any level (not touched by the smoke suite either), and it's where the documented faction-control stub lives (see [DUNGEONS.md](./DUNGEONS.md#stub-dungeon-completion-does-not-currently-affect-districtfaction-control)); a mocked-Prisma suite similar to the ones added for `escalationAndVictory`/`districtControlShares` would fit the same pattern.
2. `app/lib/world/applyWorldReactions.ts` / `applyDeathWorldConsequences.ts` — still genuinely untested at any level; the ripple/counter and death-fallout logic. Higher effort (touches districtState + the `seededRng.ts` seeded RNG) but meaningful given it's part of the "living city" system.
3. A route-level/integration test for at least `POST /api/action/resolve`, given it's the single largest, most consequential handler in the codebase and currently has zero coverage of any kind, smoke-level included.
4. `energy-regen.ts` / `power-progression.ts` and `app/lib/ai/encounter-personalizer.ts` — now have smoke-level "does it run and stay in-range" coverage (`progression.smoke.test.ts`, `core-loop.smoke.test.ts`) but no real unit tests. Lower priority than the above since they're no longer *zero* coverage, but still worth detailed tests eventually — all are pure/deterministic and need no mocking.

This is a recommendation for scoping a future testing pass, not a commitment made by this document — see [PROJECT_STATE.md](./PROJECT_STATE.md) for how this fits into the overall risk list.
