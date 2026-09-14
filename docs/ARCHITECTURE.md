# Architecture

Application layers, request flow, and the client/server trust boundaries that matter for changes. For *what* the systems do, see [GAME_SYSTEMS.md](./GAME_SYSTEMS.md). For the AI layer specifically, see [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md). For the data model, see [DATA_MODEL.md](./DATA_MODEL.md).

Stack (**FACT**, `package.json`): Next.js 16.1.6 (App Router), React 19.2.3, TypeScript 5, Tailwind 4, Prisma 6.19.2 + `@neondatabase/serverless` (Neon Postgres), NextAuth v5.0.0-beta.30 (Credentials provider, JWT sessions), OpenAI SDK 6.16, Zod 4, Vitest 4. No CI (`.github/` absent). Deployed to Vercel (evidenced by early commit history — `"update to enable deploy to vercel"`, `force-dynamic`/`runtime = 'nodejs'` route exports throughout).

## Layers

```
app/(auth)/, app/character-creation/, app/game/, app/dungeon/,
app/map/, app/profile/, app/victory/, app/help/   (Client Components)
        │  fetch()
        ▼
app/api/*/route.ts   (~29 route handlers, all game-mutating routes auth()-gated)
        │
        ├──► app/lib/game-logic/*   deterministic rules (combat, leverage, alignment, ...)
        ├──► app/lib/world/*        deterministic world sim (districts, escalation, reactions)
        ├──► app/lib/dungeon/*      deterministic dungeon generation/session logic
        ├──► app/lib/ai/*           the one AI-calling layer (encounter seeds only)
        └──► prisma (app/lib/db.ts) → Neon Postgres
```

- **Frontend**: every route under `app/` is a Client Component (**FACT**, confirmed by direct inspection — no Server Components or Server Actions were found driving game state in the routes reviewed). Screens are thin fetch-driven shells; `app/components/game/*` (~20 components — ActionSelector, ConflictPane, PrepPhase, FocusChannel, EncounterDisplay, OutcomeDisplay, StoryLogPanel, GoalChoiceModal, CityUpdateCard, AlignmentBadge, DistrictInfluenceDisplay, StorePanel, FightClubPanel, MobileTabBar, etc.) form a dense single-page hub at `/game` rather than a multi-route wizard. `app/data/*` (14 files: districts, factions, actions, powers, origins/new-origins, npcs, goals, items, rivals, archetypes, attributes, encounter-templates, districtModifiers, location-backgrounds) holds static game-design content imported by both client and server code.
- **Backend**: ~29 route handlers under `app/api/*`. Every route that mutates character/game state calls `auth()` (NextAuth) first and scopes the Prisma query by `session.user.id` (the established convention is `prisma.character.findUnique({ where: { userId: session.user.id } })`, confirmed across `action/*`, `character/*`, `pvp/*` routes read for this and the prior archaeology pass).
- **Persistence**: Prisma → Neon Postgres. See DATA_MODEL.md.
- **Game-engine layer**: `app/lib/game-logic/*` and `app/lib/world/*` — plain deterministic TypeScript, no network calls, no AI. This is where "the rules" live.
- **AI layer**: `app/lib/ai/*`, narrowly scoped to encounter-seed content generation. Nothing else in the app calls OpenAI.
- **Background/scheduled work**: none exists. No cron, no queue, no webhook receivers. `cleanStaleCache()` (AI cache eviction) is defined but never invoked by anything in the codebase — a manual or future-cron target, not currently wired up.

## Request flow: one action, end to end

1. Client `POST /api/action/execute` — auth check, energy check, deterministic encounter-trigger roll, encounter content resolved (cache → AI seed → static template; see AI_ARCHITECTURE.md), response includes the encounter and its 4 choices.
2. Client renders the encounter; player picks a choice → optional Prep phase → optional Focus mode → the **Resource Fracture** conflict minigame runs entirely in the browser (`ConflictPane`, backed by `app/lib/game-logic/conflict/engine.ts`).
3. Client `POST /api/action/resolve` with `encounterId`, `choiceId`, and (if a minigame was played) a `conflictOutcome` payload — result (`victory`/`defeat`/`stalemate`), `turnsUsed`, and final resource snapshots.
4. Server resolves the outcome (see Trust boundaries below), then — inside a single `prisma.$transaction` — writes: HP/energy/XP/level, leverage, heat, alignment (if applicable), district influence, attribute growth, faction reputation (with cascading effects via `calculateReputationImpact`), power progression, consumables/store state, and pending follow-up actions. Outside that transaction it also updates `DistrictState` control shares (`updateDistrictStateFromEncounter`), applies world ripple/counter reactions (`applyWorldReactions`), and runs the escalation/victory check (`runEscalationCheck`), which increments the world turn and may set a winner.

## Trust boundaries

This is the most important architectural fact to know before changing anything in the conflict/PvP path.

**The Resource Fracture minigame is simulated entirely client-side, and the server does not independently re-simulate it.** `POST /api/action/resolve` and `POST /api/pvp/resolve` both accept a client-reported outcome object as an input to resolution. The relevant code, read directly from `app/api/action/resolve/route.ts`:

```ts
// Validate that conflict outcome data looks legitimate (player actually played the game)
// We trust the client's result because the Resource Fracture game has complex win conditions
// (e.g., depleting any single resource to 0, turn limits, etc.) that we don't replicate server-side
function isLegitimateConflictOutcome(co: ConflictOutcomePayload): boolean {
  // ...checks result is one of victory/defeat/stalemate, and that any provided
  // resource values are non-negative integers...
  // ...soft-checks that *some* depletion or turn count occurred...
  // "Don't reject — could be edge case, but log it"
  return true;
}
```

That is the entire validation: shape and range checks, not a re-run of the minigame's rules. If the check passes, the client's reported `result` is mapped directly to `success`/`partial`/`failure` and used to select which reward branch to apply. `/api/pvp/resolve` has an equivalent shape check (`isPvpResolveRequest`) and the same trust pattern for Elo-affecting outcomes.

**What this document will and won't claim**: the in-code comment explains *why* the server doesn't re-simulate (the minigame's win conditions are complex enough that replicating them server-side was apparently judged not worth doing). Whether that was a deliberate, accepted MVP tradeoff or simply hasn't been revisited is **NEEDS HUMAN CONTEXT** — the comment explains the mechanism, not the product decision behind it. Practically: a modified client could report a fabricated `victory`/`player_victory` and receive full rewards or a ranked Elo win. This is documented as a known risk, not something to fix as part of documentation work — see [PROJECT_STATE.md](./PROJECT_STATE.md#known-risks).

Everything **outside** the conflict-outcome field itself is server-authoritative: energy, leverage, heat, and consumable effects are computed from database state plus a narrow set of client-supplied selections (prep type, focus mode) that are validated against fixed enums, not trusted as free-form values.

## Authorization pattern

Every game-mutating route checked in this and the prior archaeology pass scopes its Prisma query to the authenticated session's own `Character` (`userId: session.user.id`) or explicitly verifies ownership before returning/mutating a shared resource (e.g. `pvp/resolve` checks `match.attackerCharacter.userId === session.user.id` before allowing resolution). One exception: `POST /api/pvp/cleanup` only enforces its `CRON_SECRET` bearer-token check *if* `CRON_SECRET` is set in the environment — it is not currently present in `.env`/`.env.example`, so as configured today this endpoint (which deletes old `PvpMatch` rows) has no auth enforcement. See PROJECT_STATE.md for the full risk list.

## What's explicitly not here

- No middleware-based route protection — each route calls `auth()` individually.
- No rate limiting on game-mutating routes (only auth's login/signup endpoints have it, and that's in-memory/per-instance — see PROJECT_STATE.md).
- No server-side replication of client-computed game logic beyond the shape checks described above.
- No background jobs, cron, or queues of any kind.
