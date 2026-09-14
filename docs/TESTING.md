# Testing

What actually exists, what it covers, and — more importantly — what it doesn't. This document exists so the coverage gap doesn't have to be rediscovered from scratch every session.

All numbers below are from a fresh, read-only run performed for this document (2026-09-13): `npx tsc --noEmit`, `npx vitest run`, `npx eslint .`. No fixes were applied.

## Commands

```bash
npx tsc --noEmit   # typecheck
npx vitest run     # unit tests
npx eslint .       # lint
```

There is no `typecheck` or `lint`-in-CI script wired up — these are run manually. `npm test` runs `vitest run`.

## Current results (2026-09-13)

- **`npx tsc --noEmit`** — 0 errors.
- **`npx vitest run`** — 5 test files, **102/102 tests passing**.
- **`npx eslint .`** — 68 problems: **12 errors, 56 warnings**. Not fixed as part of this documentation mission per scope; see breakdown below.

## What's actually tested

All 5 test files live under `app/lib/game-logic/{conflict,pvp}/__tests__/` — the two systems that are already fully deterministic and lowest-risk in the codebase:

| File | What it tests |
|---|---|
| `conflict/__tests__/engine.test.ts` | `initConflict`/`executeTurn`/`evaluateOutcome`/`getPlayerMoves` — resource init and scaling by difficulty, turn/log integrity, move-availability gating, resource clamping, **determinism** (identical inputs → identical outputs, asserted explicitly), build- and opponent-identity-influenced bonuses |
| `conflict/__tests__/build-bonuses.test.ts` | `deriveEncounterContext`, `computeStartingBonuses`, `computeMoveBonus` — attribute/power affinity mapping, bonus capping, power level-gating, determinism |
| `conflict/__tests__/opponent-identity.test.ts` | `resolveOpponentIdentity` — rival-personality → archetype mapping, NPC-tag → archetype mapping, priority order (rival > NPC > fallback), threat-tier math, determinism |
| `conflict/__tests__/ai.test.ts` | `resolveProfile`, `selectOpponentMove` — tag→profile mapping, profile-weighted move selection, explicit determinism assertion. **This tests the deterministic opponent-move heuristic in `conflict/ai.ts`, not any language model.** See [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md#naming-trap-conflictaits-is-not-generative-ai) — no OpenAI-calling code has any test coverage anywhere in the repo. |
| `pvp/__tests__/pvp.test.ts` | Elo update math (`calculateEloUpdate`), `runPvpCombat` simulator — valid outcome shape, determinism, turn cap enforcement (4), simulation purity (inputs not mutated), build/power influence on outcome. Contains explicit comment blocks for *un-implemented* integration scenarios (DB-level cooldown enforcement, energy deduction, unranked-rating immutability) — left as documented TODOs, not executed tests. |

`scripts/validate-followups.ts` is a standalone `tsx`-run simulation script that drives the follow-up-action system through synthetic rounds and prints pass/fail checks to stdout. It is **not** part of `npm test` and does not run in any automated context.

## What has zero test coverage

Every deterministic system outside the conflict engine and PvP core, including exactly the systems this project's complexity review (Mission 1) identified as its core value:

- `alignment.ts`, `leverage.ts`, `district-influence.ts`, `district-state.ts`, `energy-regen.ts`, `power-progression.ts`, `power-gating.ts`, `consumables.ts`, `store.ts`, `goal-manager.ts`, `intent.ts`, `npc-manager.ts`, `patron-reaction.ts`, `rival-generator.ts`, `thread-manager.ts`, `combat/resolve-encounter.ts`
- All of `app/lib/world/*` (`cityControl`, `districtControlShares`, `escalationAndVictory`, `faction-state`, `applyDistrictModifiers`, `applyWorldReactions`, `applyDeathWorldConsequences`, `city-updates`, `seededRng`)
- All of `app/lib/dungeon/*` (`generator`, `movement`, `search`, `trap`, `minimap`, `session`, `types`)
- `character/applyWoundedState.ts`
- Every API route under `app/api/*` — no route-level/integration tests exist
- The entire AI pipeline (`app/lib/ai/*`) — **no mocks, fixtures, or evals exist for any OpenAI-calling code.** There is no way today to verify a prompt or schema change against known-good output without a live API call.

## No CI

No `.github/workflows` directory exists. Nothing runs `tsc`/`vitest`/`eslint` automatically on push or PR — all three are opt-in, human- or agent-invoked commands. A regression in any untested module (the majority of the deterministic game-logic surface) can reach `main` undetected.

## Lint detail (12 errors, 56 warnings, 2026-09-13)

Errors: mostly `prefer-const` (`conflict/engine.ts:501`, `leverage.ts:120`) and unescaped-JSX-entity issues (`app/map/page.tsx:371`, `app/victory/page.tsx:161`, two occurrences). Warnings are overwhelmingly `@typescript-eslint/no-unused-vars` across game-logic and world files — several defined-but-unused constants that look like leftover tuning knobs rather than accidental dead code (e.g. `RIPPLE_SPILLOVER_CHANCE` in `applyWorldReactions.ts`, `LEVERAGE_OVERCAP_MAX` re-export in `conflict/engine.ts`, `computeDistrictLeader` in two files). None are severe; the codebase typechecks cleanly and lints without hard blockers. **Not fixed here** — out of scope for a documentation mission; see [PROJECT_STATE.md](./PROJECT_STATE.md#known-risks).

## Priority if a testing mission is scoped later

In rough order of value (deterministic, high-complexity, currently zero coverage):
1. `escalationAndVictory.ts` — the win condition is a core product promise; a silent regression here is high-impact and easy to miss without a test.
2. `district-state.ts` / `districtControlShares.ts` — the control-share math (must sum to 100) is exactly the kind of invariant that's cheap to test and easy to violate accidentally.
3. `alignment.ts` / `leverage.ts` — pure functions, no I/O, straightforward to unit test.
4. Dungeon generation determinism (`generator.ts` given a fixed seed) and the trap/search DC formulas.
5. An eval/fixture harness for the AI seed schema (`encounter-seed-generator.ts`) — even a handful of recorded good/bad model responses run through `seedSchema`/`validateSeedStructure` would catch prompt-drift regressions that are currently invisible until a player hits them.

This is a recommendation for scoping a future testing mission, not a commitment made by this document — see [PROJECT_STATE.md](./PROJECT_STATE.md) for how this fits into the overall risk list.
