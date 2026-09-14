# Story Forge

**Status: PARKED.** No active development phase is currently approved — see [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md#lifecycle-status-parked) for what that means and [docs/LEARNINGS.md](./docs/LEARNINGS.md) for the retrospective. The setup instructions below remain accurate for running the existing codebase.

A browser-based superhero RPG. Players create a superpowered character and act turn-by-turn in a shared city of 5 districts contested by 14 factions — taking AI-flavored but mechanically deterministic encounters, fighting through a turn-based resource minigame, shifting district control, and (optionally) exploring procedurally generated dungeons. See [docs/GAME_SYSTEMS.md](./docs/GAME_SYSTEMS.md) for the full gameplay loop.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Prisma + Neon Postgres · NextAuth v5 (Credentials, JWT) · OpenAI (`gpt-4o-mini`) · Zod · Vitest

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, OPENAI_API_KEY
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (pooled) |
| `DIRECT_URL` | Neon Postgres direct connection (used by Prisma migrations) |
| `NEXTAUTH_SECRET` | NextAuth session signing secret |
| `NEXTAUTH_URL` | Base URL for NextAuth callbacks |
| `OPENAI_API_KEY` | OpenAI API key, used only by the encounter-seed generator (see [docs/AI_ARCHITECTURE.md](./docs/AI_ARCHITECTURE.md)) |

### Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # run a production build
npm run lint     # eslint
npm test         # vitest run
```

There is no `typecheck` script — run `npx tsc --noEmit` directly. There is no CI configured; all checks are run manually. See [docs/TESTING.md](./docs/TESTING.md) for current coverage and known gaps.

## ⚠️ Before touching the database

The migration history in `prisma/migrations/` does not fully match the live schema — several tables (`PvpMatch`, `WorldState`, the entire dungeon subsystem) have no corresponding migration file and were almost certainly applied via `prisma db push`. **Do not run `prisma migrate dev`, `prisma db push`, or any reset command without first reading [docs/DATA_MODEL.md](./docs/DATA_MODEL.md#-schema-drift--read-before-touching-migrations-or-schema).**

## Documentation

Living documentation lives in [`docs/`](./docs) and is the primary source of orientation for this project — start with [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md) for what's currently active, stable, or in progress, and [`CLAUDE.md`](./CLAUDE.md) for the operating guardrails used when working on this repo with Claude Code.

| Doc | Covers |
|---|---|
| [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md) | What's active/stable/stubbed/legacy right now, and the current risk list |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Application layers, request flow, client/server trust boundaries |
| [docs/GAME_SYSTEMS.md](./docs/GAME_SYSTEMS.md) | The gameplay loop and every major deterministic system |
| [docs/AI_ARCHITECTURE.md](./docs/AI_ARCHITECTURE.md) | Where the LLM fits in — narrower than it looks |
| [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) | Prisma schema, migration history, schema-drift warning |
| [docs/DUNGEONS.md](./docs/DUNGEONS.md) | The dungeon subsystem, including current in-progress work |
| [docs/TESTING.md](./docs/TESTING.md) | What's actually tested vs. not |
| [docs/DECISIONS.md](./docs/DECISIONS.md) | Recoverable architectural history |
| [docs/LEARNINGS.md](./docs/LEARNINGS.md) | The retrospective: why the project exists, what it was trying to prove, and why it's parked |
| [docs/development/DEFINITION_OF_DONE.md](./docs/development/DEFINITION_OF_DONE.md) | Validation checklist by risk tier |
