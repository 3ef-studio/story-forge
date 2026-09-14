# Definition of Done

Risk-tiered validation expectations for changes to Story Forge. Risk tiers are defined in [CLAUDE.md](../../CLAUDE.md) — read that first for the workflow this checklist plugs into (inspect → understand → propose → blast-radius → approval → implement → validate → document → summarize → stop).

## LOW risk (docs, copy, isolated UI/styling, `app/data/*` content additions that don't change shapes)

- [ ] Change matches what was approved (or, for genuinely LOW-risk work, matches what was asked).
- [ ] `npx tsc --noEmit` passes.
- [ ] No new `docs/*.md` inaccuracies introduced (if the change touches something documented, check the doc still matches).

## MEDIUM risk (`app/lib/game-logic/*`, `app/lib/world/*`, API routes, AI prompts/schemas in `app/lib/ai/*`, dungeon logic, auth-adjacent UI)

Everything in LOW, plus:

- [ ] `npx tsc --noEmit` passes.
- [ ] `npx eslint .` — no *new* errors introduced (the repo currently has 12 pre-existing errors / 56 warnings, documented in [TESTING.md](../TESTING.md); don't let that baseline grow, but you are not required to fix pre-existing ones as a side effect of unrelated work).
- [ ] `npx vitest run` passes. If the change touches `game-logic/conflict/*` or `game-logic/pvp/*`, the existing tests there must still pass unmodified in intent (updating an assertion because behavior intentionally changed is fine; a test starting to fail because of an unrelated regression is not).
- [ ] If the change touches a system with **zero** existing test coverage (see [TESTING.md](../TESTING.md#what-has-zero-test-coverage)), consider whether adding a focused test is in scope — not mandatory for every change, but flag the gap in the summary if you chose not to.
- [ ] Manual smoke test via `npm run dev` for anything touching `/game` or `/dungeon` — exercise the actual changed path in the browser, not just "the build succeeded."
- [ ] If the change touches `app/lib/ai/*`: confirm the Zod schema still bounds every field an LLM response can populate, and that a `null`-return/fallback path still exists (see [AI_ARCHITECTURE.md](../AI_ARCHITECTURE.md)).
- [ ] Relevant `docs/*.md` updated if the change makes something in them inaccurate (most likely `GAME_SYSTEMS.md`, `AI_ARCHITECTURE.md`, or `PROJECT_STATE.md`).

## HIGH risk (Prisma schema/migrations, `prisma db push`, database reset/destructive commands, NextAuth config/session handling, secrets/env, broad-surface dependency upgrades, deployment/infrastructure)

Everything in MEDIUM, plus:

- [ ] **Explicit human approval obtained before implementing**, not just before merging — see [CLAUDE.md](../../CLAUDE.md).
- [ ] For anything touching `prisma/schema.prisma` or migrations: **first confirm the migration history has been reconciled against the live schema** — see [DATA_MODEL.md](../DATA_MODEL.md#-schema-drift--read-before-touching-migrations-or-schema). Never assume `prisma/migrations/` matches the current database. Do not run `prisma migrate dev`, `prisma db push`, or any reset/destructive command without that reconciliation happening first and without it being the explicitly approved action.
- [ ] For auth/session changes: confirm the JWT session strategy and the `User`↔`Character` 1:1 relationship assumptions elsewhere in the codebase (`app/lib/auth.ts` callbacks, every route's `userId: session.user.id` scoping pattern) still hold.
- [ ] For dependency upgrades: `next`, `next-auth`, and `prisma`/`@prisma/client` are all currently pre-1.0-beta or major-version-fresh (see [ARCHITECTURE.md](../ARCHITECTURE.md)) — treat a version bump as a review-worthy change, not a routine one, and re-run the full MEDIUM checklist plus a manual smoke test of login/session and one full action-resolve cycle afterward.
- [ ] State the blast radius explicitly in the summary: what breaks if this is wrong, and how it would be noticed.

## Always

- [ ] Don't fix unrelated pre-existing issues (lint warnings, dead code, other systems' bugs) as a side effect of a scoped change — note them instead, or ask if you think they should be a separate approved change.
- [ ] Don't bundle a HIGH-risk change with a LOW/MEDIUM one — get separate approval and treat it as its own step even if it's small.
- [ ] Never modify the three known pre-existing uncommitted local files (`app/api/dungeon/treasure/route.ts`, `app/dungeon/page.tsx`, `app/components/footer.tsx`) unless the human explicitly asks you to act on them — see [PROJECT_STATE.md](../PROJECT_STATE.md#pre-existing-uncommitted-local-work-as-of-2026-09-13-untouched-by-mission-1-or-mission-2).
