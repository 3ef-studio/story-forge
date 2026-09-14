# Data Model

Prisma/Postgres schema summary, migration history, and — most importantly — a schema-drift warning that must be resolved before any future migration work. `prisma/schema.prisma` remains the authoritative field-level source; this document is a map, not a duplicate.

All claims **FACT**, sourced from a full read of `prisma/schema.prisma` and `prisma/migrations/*` for this document.

## Model inventory (21 models)

### Identity

- **`User`** — auth identity: `email` (unique), `passwordHash` (bcryptjs). 1:1 with `Character` (`Character.userId @unique`) — **no multi-character-per-user support**.
- **`Character`** — the central aggregate. Nearly all scalar simulation state lives directly on this row rather than being normalized out: level/XP/HP/energy/money, `currentDistrict`, leverage as three separate int columns (`leverageControl`/`Stability`/`Position`), `actionCounter`, `heat`, wounded-state fields, `factionId`, `intentScore` (−100..100), `pendingFollowUps`/`followUpHistory` (JSON), patron-deity/alignment fields, `consumables` (JSON array, capped at 2 items in application code), `storeOffer` (JSON, 3-offer rotation), and PvP rating/W/L/matches. This is a deliberately wide "god row" — well-guarded with `$transaction` on every write path reviewed, but a growing concentration-of-concern as more systems accrete onto it.

### Character satellites (1:many, cascade-delete on `Character`)

`CharacterAttribute`, `CharacterPower`, `FactionReputation`, `InventoryItem`, `StoryEvent` (AI-context/history log, tagged), `ActionCooldown`, `CharacterGoal`, `ConsequenceThread` (`type`: retaliation/recognition/escalation/callback, `expiresInActions`), `CharacterNPC` (familiarity/disposition per NPC), `Rival` (1:1, unlocked level 5).

### World / meta state

- **`DistrictState`** — per `(characterId, districtId)`: `shares` (JSON, faction-id → percentage, sums to 100), 4 ideological influence meters (`influenceRadiance`/`Stability`/`Entropy`/`Doubt`, 0–100 each), plus a legacy `controlValue`/`controllingFactionId` pair now described in-schema as "derived from leader share."
- **`WorldState`** — one row per `scopeId` (= `characterId`, world state is per-character-scoped, not shared across all players): `worldTurn` counter, last-counter-faction tracking, and permanent victory fields (`winnerFactionId`, `wonAtTurn`, `winStreakFactionId`, `winStreakCount`).
- **`CachedEncounter`** — the AI seed/encounter cache (see AI_ARCHITECTURE.md). `choices`/`outcomes` are JSON blobs holding either the legacy full-encounter format or the current seed format, disambiguated at read time by shape.
- **`EncounterRun`** — dense, append-only telemetry: prep/focus selections, gambit roll/outcome, full leverage before/after, turn-by-turn conflict timeline (JSON), opponent identity, timing (`executeMs`/`resolveMs`). Clearly built for balance analysis. **Not observed to be read back by any application code** in this review — write-only instrumentation as far as could be determined; whether a dashboard or analysis script consumes it elsewhere is **NEEDS HUMAN CONTEXT**.

### PvP

- **`PvpMatch`** — `mode` (RANKED/UNRANKED), attacker/defender character refs, Elo before/after, `result` (WIN/LOSS from attacker's perspective), `transcriptJson` (full combat log; a `{ pending: true }` marker gates re-resolution).

### Dungeon (see [DUNGEONS.md](./DUNGEONS.md) for the subsystem write-up)

- **`DungeonFloor`** — one per `(districtId, depth)`, holds the generation `seed: Int` "for reproducibility."
- **`DungeonNode`** — typed `CHAMBER`/`CORRIDOR`/`JUNCTION`/`BOSS`/`STAIRS`/`SECRET`, with `contentType` `COMBAT`/`ELITE`/`TRAP`/`EVENT`/`TREASURE`.
- **`DungeonEdge`** — `OPEN`/`LOCKED`/`SECRET` connections between nodes.
- **`DungeonSession`** — a character's live run: `currentNodeId` plus `discoveredNodeIds`/`discoveredEdgeIds`/`clearedNodeIds` as denormalized `String[]` arrays (not join tables), `state` (`ACTIVE`/`COMPLETED`/`FAILED`).

## Persisted vs. derived vs. write-only

- **Persisted, read back and mutated regularly**: attributes, powers, reputation, goals, threads, NPCs, rivals, district shares/influence, dungeon session state, PvP record.
- **Derived on read, not separately stored**: district "leader"/tier labels, city-control percentages, escalation win-streak evaluation (all computed fresh from `DistrictState.shares` each time via `escalationAndVictory.ts`).
- **Write-only / not observed to be consumed**: `EncounterRun` telemetry (see above).

## Auth

**FACT**, `app/lib/auth.ts`. NextAuth v5 beta, single `CredentialsProvider`, **JWT session strategy** (`session: { strategy: 'jwt' }` — no database-session table exists in the schema, consistent with this). Password hashing via `bcryptjs` (`compare()` against `User.passwordHash`, hashed at signup with a cost factor of 12 per the signup route). The JWT callback stashes a `hasCharacter` boolean on the token for onboarding routing. Session → User → Character is a strict 1:1 chain; there is no concept of switching between multiple characters.

`app/lib/auth-helpers.ts` adds email normalization (trim + lowercase), Unicode NFKC password normalization, structured `[AUTH]` log lines with hashed (not raw) email/IP, and **in-memory** rate limiting (login: 10/min, signup: 5/min, keyed by hashed IP). The rate-limit store is a plain `Map` that resets on process restart and is per-instance — on a serverless/multi-instance deployment (Vercel) this will not enforce a global limit. Documented as a known risk in PROJECT_STATE.md, not fixed here.

## Migration timeline (12 migrations, 2026-01-22 → 2026-02-17)

| Migration | Apparent purpose |
|---|---|
| `20260122230405_next` | Initial schema: users, characters, character_attributes, character_powers, faction_reputations, inventory_items, story_events, cached_encounters, action_cooldowns |
| `20260124174732_add_character_goals` | Adds `CharacterGoal` |
| `20260126164701_add_character_type_and_levelup_flag` | Adds `character_type`, `pending_levelup_attribute_pick` |
| `20260126220907_add_consequence_threads` | Adds `ConsequenceThread` |
| `20260127000000_add_current_district` | Adds `current_district` |
| `20260128000000_add_energy_regen_timestamp` | Adds `last_energy_regen_at` |
| `20260128100000_add_rivals` | Adds `Rival` |
| `20260202000000_add_leverage_and_action_counter` | Adds leverage (originally JSONB) + `action_counter` |
| `20260202100000_leverage_integer_columns` | Redesigns leverage from one JSONB column to three discrete int columns (`leverageControl`/`Stability`/`Position`) — a schema redesign mid-stream, not just an addition |
| `20260203000000_add_encounter_runs` | Adds `EncounterRun` telemetry table |
| `20260209175109_add_district_state` | Large multi-feature migration: `follow_up_history`, `gambit_effects`, `CharacterNPC`, `DistrictState` |
| `20260217_add_alignment_influence` | Adds patron-deity/alignment fields on `Character` + the 4 influence meters on `DistrictState` |

## ⚠️ Schema drift — read before touching migrations or schema

**`PvpMatch`, `WorldState`, and the entire dungeon subsystem (`DungeonFloor`, `DungeonNode`, `DungeonEdge`, `DungeonSession`) exist in `prisma/schema.prisma` with no corresponding migration file anywhere in `prisma/migrations/`.** These tables were almost certainly created via `prisma db push` rather than `prisma migrate dev`, meaning the migration history in the repository does **not** fully describe how the live database schema was reached.

**Practical consequence: never assume `prisma/migrations/` matches the current database schema.** Before any future schema change:
1. Do not run `prisma migrate dev` against an assumed-clean baseline — it may generate an unexpected diff or fail against drift.
2. Reconcile/baseline first: compare the live schema (introspection) against `schema.prisma` and the migration history, and establish an accurate baseline migration before adding new ones.
3. Treat `prisma db push`, `prisma migrate dev`, `prisma migrate reset`, and any other schema-mutating command as **HIGH risk** requiring explicit human approval — see [DEFINITION_OF_DONE.md](./development/DEFINITION_OF_DONE.md) and [CLAUDE.md](../CLAUDE.md).

This gap was discovered during the Mission 1 archaeology pass and is not resolved by this documentation mission — resolving it (baselining migration history against the live schema) is recommended as a dedicated follow-up mission, not bundled here.
