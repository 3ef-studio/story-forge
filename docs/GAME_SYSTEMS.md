# Game Systems

Functional view of Story Forge: the player loop and the deterministic systems that drive it.
For how these systems are wired into the app (routes, request flow, trust boundaries), see [ARCHITECTURE.md](./ARCHITECTURE.md).
For where the LLM fits in, see [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md).
For the dungeon subsystem specifically, see [DUNGEONS.md](./DUNGEONS.md).

All facts below are sourced from `app/lib/game-logic/*`, `app/lib/world/*`, `app/data/*`, and the API routes that call them, read directly for this document. Labeled **FACT** where a claim is a direct code read, **INFERENCE** where it's a reasonable reading not explicitly stated, and **NEEDS HUMAN CONTEXT** where intent can't be recovered from the repository.

## Core loop

1. **Signup / Login** — NextAuth credentials, JWT session (see [DATA_MODEL.md](./DATA_MODEL.md#auth)).
2. **Character creation** (`app/character-creation`) — origin → optional patron deity/alignment → power → archetype → name. Writes one `Character` row (1:1 with `User`).
3. **`/game` hub** — a client-side state machine: `idle → executing → encounter → conflict → resolving → outcome → idle`.
   - **idle**: player picks a district-filtered Action (`app/data/actions.ts`) or a generated follow-up, or opens Store / Goals / Fight Club / Map / Dungeon.
   - **executing**: `POST /api/action/execute` deducts Energy, decides deterministically whether an encounter fires, and resolves the encounter content (cache → AI seed → static template — see AI_ARCHITECTURE.md).
   - **encounter**: 4 choices are shown, one per approach (`direct` / `subtle` / `diplomatic` / `tactical`); the client shows an estimated success chance (display only, not authoritative).
   - **conflict**: selecting a choice launches the turn-based **Resource Fracture** minigame (below), computed client-side.
   - **resolving / outcome**: `POST /api/action/resolve` is the authoritative write — applies XP/HP/energy/money/faction/attribute deltas, power progression, district-control shifts, goal progress, wounded/death handling, and checks the citywide victory condition (**FACT**, `app/api/action/resolve/route.ts`).
4. Loop repeats. Separately: travel districts, shop (Store), fight other players (PvP — isolated Elo ladder, does not touch district/faction state), or enter a district's dungeon (separate exploration mode, see DUNGEONS.md).

**Resources gating play** (**FACT**, `Character` model + associated lib files):
- **Energy** — action cost, regenerates over time (lazy, computed on read — `app/lib/game-logic/energy-regen.ts`).
- **HP** — wounds persist as a `isWounded` flag with a countdown (`app/lib/character/applyWoundedState.ts`).
- **Leverage** (Control / Stability / Position, 3 separate int fields) — earned via Prep/Focus selections, spent inside the conflict minigame, decays over time (`app/lib/game-logic/leverage.ts`).
- **Heat** — rises with aggressive/follow-up play, decays on rest; feeds directly into the conflict minigame as opponent starting-resource and leverage bonuses (see below).

## The conflict engine ("Resource Fracture")

**FACT**, read directly from `app/lib/game-logic/conflict/engine.ts`.

Both player and opponent track three resources — **Control, Stability, Position** — each clamped to 0–5 normally (0–7 with an active leverage "overcap" boost). The player starts at `{3,3,3}` plus build-derived starting bonuses; the opponent starts scaled by encounter difficulty (`{2,2,2}` up to `{4,4,4}`), further adjusted by the opponent's identity/archetype and by the player's current **Heat**:

- Heat adds a starting-resource bump to the opponent (`floor(heat/3)`, capped at +2) and grants the opponent a pool of **enemy leverage points** (`floor(heat/2)` capped at 3, plus a difficulty-based base, capped at 5 total) that it can spend mid-fight to boost itself or drain the player, distributed by archetype priority (brute/controller/infiltrator/schemer/enforcer/wildcard each prioritize different resources).

Each turn, the player picks a move; the opponent's move is chosen by `selectOpponentMove()` in `conflict/ai.ts` — **this is not a language model call**. It is a deterministic, weighted-table/hash-based heuristic keyed by the opponent's archetype and the current resource state (see AI_ARCHITECTURE.md for why the filename is misleading). Moves apply self/opponent resource deltas, counter-bonuses (triggered when a move matches a specific counter), and any player-build or opponent-identity move bonuses. Fight ends when either side's Control, Stability, or Position hits 0, or after 4 turns (`maxTurns`); ties are broken by comparing resource totals (`evaluateOutcome`).

**Client/server trust note**: this entire minigame is computed and played **in the browser**. The client reports the final outcome to `/api/action/resolve`, which performs a soft sanity check (`isLegitimateConflictOutcome` — non-negative integer resources, some depletion or turns played) but does **not** independently re-simulate the fight. See [ARCHITECTURE.md](./ARCHITECTURE.md#trust-boundaries) for the full detail and the code's own comment explaining why.

## Major systems

| System | Purpose | State | Key files |
|---|---|---|---|
| Action/Encounter loop | Core turn structure | IMPLEMENTED | `app/api/action/{execute,resolve}/route.ts`, `app/data/actions.ts` |
| Conflict engine (Resource Fracture) | Turn-based Control/Stability/Position minigame | IMPLEMENTED, unit-tested | `app/lib/game-logic/conflict/{engine,moves,ai,opponent-identity,build-bonuses}.ts` |
| Dice-roll resolution fallback | Used when no conflict minigame result is submitted | IMPLEMENTED | `app/lib/game-logic/combat/resolve-encounter.ts` |
| Leverage | Cross-encounter Control/Stability/Position resource, earned via Prep/Focus | IMPLEMENTED | `app/lib/game-logic/leverage.ts` |
| Heat | Aggression/escalation meter; feeds opponent starting bonus + leverage pool in conflict | IMPLEMENTED | inlined in `leverage.ts` / `resolve/route.ts` |
| Alignment / patron deities | Moral-drift score (0–100) for divine-origin characters, gates advanced powers | IMPLEMENTED, labeled `(MVP)` in code | `app/lib/game-logic/alignment.ts`, `app/data/new-origins.ts` |
| Intent | −100..100 villain↔hero score used for narrative framing/tone | IMPLEMENTED | `app/lib/game-logic/intent.ts` |
| Power progression / gating | Per-power XP and leveling; advanced powers gated by alignment | IMPLEMENTED | `power-progression.ts`, `power-gating.ts` |
| Energy | Action-cost resource, lazy time-based regen | IMPLEMENTED | `energy-regen.ts` |
| Goals | Structured objectives with progress tracking and XP reward | IMPLEMENTED | `goal-manager.ts`, `app/data/goals.ts` |
| Consequence threads | Short-lived continuity hooks (`retaliation` / `recognition` / `escalation` / `callback`), expire after N actions | IMPLEMENTED | `thread-manager.ts` |
| NPCs / Rivals | Recurring NPC familiarity/disposition tracking; one seeded-generated nemesis per character (unlocks level 5) | IMPLEMENTED | `npc-manager.ts`, `rival-generator.ts`, `patron-reaction.ts` |
| Follow-up actions | Post-encounter chained actions, deduped/cooldown-gated | IMPLEMENTED | `follow-up-actions.ts` |
| Districts / control shares | 5 districts, per-character faction control-share percentages (sum to 100) | IMPLEMENTED | `district-state.ts`, `app/lib/world/districtControlShares.ts`, `cityControl.ts` |
| Ideological influence | 4 meters per district (Radiance/Stability/Entropy/Doubt, 0–100) | IMPLEMENTED, labeled `(MVP)` in code | `district-influence.ts` |
| World reactions | Ripple/counter-move faction responses to player actions, seeded by turn | IMPLEMENTED | `app/lib/world/applyWorldReactions.ts` |
| Death consequences | District-control fallout when a character dies (wounded → death path) | IMPLEMENTED | `app/lib/world/applyDeathWorldConsequences.ts` |
| Escalation & Victory | Faction tiers (Minor/Rising/Major/Dominant by city-share) + citywide win condition | IMPLEMENTED | `app/lib/world/escalationAndVictory.ts` |
| Consumables / Store | 2-item inventory cap, rotating 3-offer shop (refreshes every 3 encounters) | IMPLEMENTED, labeled `(MVP)` in code | `consumables.ts`, `store.ts` |
| PvP "Fight Club" | Elo-rated asynchronous PvP using the same conflict engine against a stored build snapshot | IMPLEMENTED, unit-tested | `app/lib/game-logic/pvp/*`, `app/api/pvp/*` |
| Dungeons | Procedural per-district floor crawl | IMPLEMENTED, actively evolving | `app/lib/dungeon/*` — see [DUNGEONS.md](./DUNGEONS.md) |
| Encounter caching | Cost/consistency layer for AI-generated encounter seeds | IMPLEMENTED | `app/lib/ai/encounter-cache.ts` — see [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) |

"IMPLEMENTED" above means: reachable from the live UI, reads/writes real persisted state, has no `TODO`/stub markers. It does not mean "balanced," "finished," or "free of bugs."

## Districts and factions

**FACT**, `app/data/districts.ts` / `app/data/factions.ts` (counted directly — earlier draft counts of "7 districts / 16 factions" from initial repository scans were wrong; verified by direct enumeration).

- **5 districts**: Downtown, Industrial District, Waterfront, The Slums, Midtown.
- **14 factions**, including controllable ones (e.g. Metro City Police Department, The Syndicate, The Guardian Initiative, Street Gangs, Black Market Network, City Government) and non-controllable/contextual ones (e.g. Civilian Population, Media Corporations).

Each `DistrictState` row (per character × district) holds a `shares` JSON map of faction-id → percentage (summing to 100) plus the 4 influence meters. `district-state.ts` and `world/districtControlShares.ts` derive the current "leader" and update shares after each encounter resolution.

## Escalation and the win condition

**FACT**, `app/lib/world/escalationAndVictory.ts`, read in full for this document.

- **Faction tiers** (informational, affect opponent difficulty/ripple bias): a faction's **city share** is the average of its per-district share across all districts. Tier 1 at ≥35%, Tier 2 at ≥50%, Tier 3 at ≥65%.
- **Win condition**: a faction must be the sole leader (no ties) with **>70% share in every district**, for **2 consecutive world turns** (`WIN_SHARE_THRESHOLD = 70`, `WIN_STREAK_REQUIRED = 2`). `world_turn` increments on every call to `runEscalationCheck`, which runs after each encounter resolution. On win, `WorldState.winnerFactionId`/`wonAtTurn` are set permanently (subsequent checks short-circuit and return the existing winner) and the client routes to `/victory`.
- This is a real, reachable win condition — not aspirational copy. It has not been observed to be reachable in normal play timeframes in this review (no telemetry or playtest evidence either way) — **NEEDS HUMAN CONTEXT** on whether it has ever actually been triggered/tested end-to-end.

## Legacy / unused game-adjacent code

Confirmed via `grep` for importers (not inference):

- `app/data/origins.ts` — **zero importers anywhere in the app.** Fully superseded by `app/data/new-origins.ts` (imported by 13 files, including character creation, alignment, and the resolve route).
- `app/lib/ai/encounter-generator.ts` — the legacy monolithic "generate a full personalized encounter in one AI call" path — **zero importers outside itself/tests.** Superseded by the seed+personalize split (see AI_ARCHITECTURE.md).

Both are safe to delete in a future cleanup-scoped mission; not touched here.

## What's explicitly self-labeled "MVP" in code

The following carry `(MVP)` comments in the source itself — this is evidence the *author* considered them early/minimal versions, not evidence of the current review's opinion: Alignment/patron deity system, District ideological influence meters, Consumables, Store. Whether these are considered finished, intended for expansion, or simply where development paused is **NEEDS HUMAN CONTEXT** — do not treat the "(MVP)" label as a roadmap commitment either way.
