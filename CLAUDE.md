# Claude operating guide — Story Forge

Story Forge is a solo-built browser RPG with durable player data (Postgres/Neon via Prisma), live database migrations, an OpenAI integration, and — as of the Mission 1 archaeology pass (2026-09-13) — a confirmed migration/schema-drift issue. It warrants more ceremony than a typical CRUD or static-content repo. This file is the entry point; the docs it links to hold the actual content.

## Start here

- [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md) — what's active/stable/stubbed/in-progress right now, and the current known-risks list. Read this first in any new session.
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — layers, request flow, client/server trust boundaries.
- [docs/GAME_SYSTEMS.md](./docs/GAME_SYSTEMS.md) — the gameplay loop and every major deterministic system.
- [docs/AI_ARCHITECTURE.md](./docs/AI_ARCHITECTURE.md) — where the LLM fits in (narrower than it looks — read this before touching anything under `app/lib/ai/*` or assuming `conflict/ai.ts` is AI-related, it isn't).
- [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) — schema, migrations, and the drift warning.
- [docs/DUNGEONS.md](./docs/DUNGEONS.md) — the newest, most actively-changing subsystem.
- [docs/TESTING.md](./docs/TESTING.md) — what's actually tested (narrow) vs. not.
- [docs/SECURITY_ADVISORIES.md](./docs/SECURITY_ADVISORIES.md) — point-in-time dependency advisory review (what's applicable, what was patched, what remains and why).
- [docs/DECISIONS.md](./docs/DECISIONS.md) — recoverable architectural history, with explicit `NEEDS HUMAN CONTEXT` markers (several resolved with author retrospective context as of Mission 3).
- [docs/LEARNINGS.md](./docs/LEARNINGS.md) — the retrospective/learning record: why the project exists, what it was trying to prove, and why it's parked. Read this for product/process context; it does not change any risk tier or operating rule above.
- [docs/development/DEFINITION_OF_DONE.md](./docs/development/DEFINITION_OF_DONE.md) — validation checklist by risk tier.

## Project status

**Story Forge is currently PARKED** — see [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md#lifecycle-status-parked). No active development phase is approved. A session opened on this repository should default to read/documentation/inspection work unless the human explicitly initiates a resumption.

## Workflow

For any change beyond a trivial LOW-risk fix:

**inspect → understand → propose → identify blast radius → get approval for MEDIUM/HIGH → implement only the approved scope → validate → update living docs → summarize → stop.**

- **Inspect/understand** using the docs above before reading raw source from scratch — they exist so you don't have to re-derive the architecture every session. Verify a doc's claim against the actual file before relying on it for anything you're about to change; docs can go stale, source cannot.
- **Propose** what you intend to do and why, before doing it, for anything MEDIUM or HIGH.
- **Blast radius**: state plainly what could break and how it would be noticed.
- **Approval**: required before implementing MEDIUM/HIGH work — not just before merging. A prior approval does not carry forward to a new, different change.
- **Implement only the approved scope.** Don't fix unrelated issues, refactor adjacent code, or expand scope because you noticed something else — note it instead.
- **Validate** per [DEFINITION_OF_DONE.md](./docs/development/DEFINITION_OF_DONE.md), matched to the risk tier.
- **Update living docs** — most likely `PROJECT_STATE.md`, and whichever of `GAME_SYSTEMS.md`/`AI_ARCHITECTURE.md`/`DATA_MODEL.md`/`DUNGEONS.md`/`TESTING.md` the change affects. Don't let them drift.
- **Summarize, then stop.** Don't continue into unrequested follow-on work.

## Risk tiers

**LOW** — proceed with light confirmation: documentation, copy, isolated UI/styling, `app/data/*` content additions that don't change shapes or types.

**MEDIUM** — propose and get explicit approval before implementing: gameplay behavior or balance numbers, deterministic rule changes in `app/lib/game-logic/*` or `app/lib/world/*`, new or changed API routes, AI prompts/schemas in `app/lib/ai/*`, dungeon logic, auth-adjacent UI (not NextAuth config itself).

**HIGH** — explicit approval required before implementing, and treated as its own reviewed step even after approval (never bundled with other changes):
- Any change to `prisma/schema.prisma`.
- Any migration creation or application (`prisma migrate dev`, `prisma migrate deploy`, or similar).
- `prisma db push`.
- Any database reset or other destructive database command.
- Changes to NextAuth config, session/JWT handling, or the `User`↔`Character` relationship model.
- `.env`/secrets/environment configuration.
- Dependency upgrades to `next`, `next-auth`, `prisma`/`@prisma/client`, or anything else with broad surface area (several of these are currently pre-1.0-beta or major-version-fresh — see [ARCHITECTURE.md](./docs/ARCHITECTURE.md)).
- Deployment/infrastructure configuration.

## Database guardrails (strengthened following the Mission 1 schema-drift finding)

**Never assume `prisma/migrations/` matches the current database schema.** `PvpMatch`, `WorldState`, and the entire dungeon subsystem exist in `schema.prisma` with no corresponding migration file — they were almost certainly applied via `prisma db push`, meaning the migration history is incomplete. Full detail: [DATA_MODEL.md](./docs/DATA_MODEL.md#-schema-drift--read-before-touching-migrations-or-schema).

Before **any** future schema work:
1. Reconcile/baseline the migration history against the live schema first — do not run `prisma migrate dev` against an assumed-clean baseline.
2. Treat schema changes, migration creation/application, `prisma db push`, and database reset/destructive commands as **HIGH risk** per the tiers above, every time, with no exceptions for "small" changes.
3. Do not run any schema-mutating command without it being the explicit, approved action for that turn.

## Pre-existing uncommitted local work

As of 2026-09-13 the working tree has three pre-existing uncommitted changes: `app/api/dungeon/treasure/route.ts` (new), `app/dungeon/page.tsx` (modified), `app/components/footer.tsx` (modified, unrelated to the other two). Do not modify, stage, commit, or discard these unless the human explicitly asks you to act on them in a given session — see [PROJECT_STATE.md](./docs/PROJECT_STATE.md#pre-existing-uncommitted-local-work-as-of-2026-09-13-untouched-by-mission-1-or-mission-2). Check `git status` at the start of a session and compare against this list rather than assuming it's still current.

## Documentation standards

When updating any `docs/*.md`: distinguish **FACT** (directly evidenced in code/history), **INFERENCE** (a reasonable reading, not explicitly stated), and **NEEDS HUMAN CONTEXT** (intent that cannot be recovered from the repository — don't invent it). Don't duplicate content across docs; link instead. Never put secret values (API keys, connection strings, tokens) in documentation — env var names and purposes only.
