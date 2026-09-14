# Dungeons

The dungeon subsystem: a procedurally generated, per-district exploration mode layered on top of the main district/faction loop. This is the most recently active and least mature part of the codebase — treat changes here with extra care about what's committed vs. still in progress locally.

All claims **FACT**, sourced from a full read of `app/lib/dungeon/{generator,session,trap,search}.ts`, the `prisma/schema.prisma` dungeon models, `app/api/dungeon/*`, and the current `git diff`/`git status` for this document.

## Generation

`generateDungeonFloor(districtId, depth)` (`app/lib/dungeon/generator.ts`) builds a graph, not a tile grid:

1. Places one `STAIRS` node (entrance), one `BOSS` node (pre-tagged `COMBAT` content), 6–10 `CHAMBER` nodes, 3–6 `CORRIDOR` nodes, and (if enabled) one `SECRET` node (pre-tagged `TREASURE` content) via non-overlapping rectangle placement on an 800×600 unit canvas.
2. Connects all nodes with a **Kruskal's-algorithm minimum spanning tree** over Euclidean distance between node centers (guarantees full connectivity), then adds a small number of extra shortest-remaining edges (`extraEdges: 2`) to create loops, plus one dedicated `SECRET`-typed edge from the secret room to a random non-stairs, non-boss chamber.
3. Assigns content to the remaining chambers/corridors: 1–2 `TREASURE` rooms, 1 `ELITE` room, remaining chambers roll 70% `COMBAT` / 30% `EVENT`, and 1–2 corridors are marked `TRAP`.

Floors are generated **once per `(districtId, depth)`** and reused by every character who reaches that depth in that district (`DungeonFloor` has a `@@unique([districtId, depth])` constraint) — the layout is shared, only session progress (`DungeonSession`) is per-character.

### Reproducibility caveat

`DungeonFloor.seed` is documented in-schema as "generation seed for reproducibility," and the generator's `SeededRandom` class (a classic linear congruential generator, `seed*1103515245+12345 & 0x7fffffff` — the ANSI-C `rand()` constants) does make the *layout* fully reproducible **given a seed**. But the seed itself is chosen with `Math.floor(Math.random() * 2147483647)` at generation time — i.e., **the seed's origin is not reproducible**, only what happens after it's picked. This is worth knowing if anything ever needs to regenerate or verify a specific floor.

## Movement and search

Not fully re-traced in this pass beyond what was read directly: `dungeonMove` resolves edge-validated movement, auto-traversing corridor chains with a single open exit and stopping the player at a corridor that contains an unresolved encounter (e.g. a trap). `dungeonSearch` (`app/lib/dungeon/search.ts`) is a d20 check — roll 1–20 plus a stat modifier derived from the better of `agility` or `intelligence` (bonus/penalty tiers at the 60/40 attribute thresholds) — against a fixed DC of 12, revealing one adjacent undiscovered `SECRET` edge per success. `hasAdjacentSecrets` lets the UI show a "search here" affordance only when relevant.

## Traps

`app/lib/dungeon/trap.ts`. Difficulty scales with floor depth: depth 1 → `EASY` (DC 25), depth 2–3 → `NORMAL` (DC 50), depth 4+ → `HARD` (DC 75). Two checks, both `attribute + roll(1..25) >= DC`:
- **Perception check** (detect before triggering): `perception + roll`.
- **Disarm check**: `floor((intelligence + agility) / 2) + roll`.

Failure triggers the trap: flat damage per difficulty (`EASY` 10 / `NORMAL` 25 / `HARD` 50 HP), which can reduce HP to exactly 0 (`characterDied: true` — the caller is responsible for ending the session on this signal). A `retreat` action is available with no damage and no node-clear, meaning a trap can be re-attempted later.

**Note**: trap and search rolls use plain `Math.random()`, not any of the codebase's seeded-RNG utilities — only the floor *layout* is reproducible; individual skill-check outcomes are not. This is a third, independent RNG implementation alongside the two used elsewhere in the game (see [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md#seeded-rng--three-independent-implementations-not-part-of-the-ai-layer-but-adjacent)).

## Session lifecycle

`app/lib/dungeon/session.ts`:

- **`enterDungeon(characterId, districtId)`** — resumes an `ACTIVE` session if one exists; otherwise finds the character's last `COMPLETED` session in that district, generates depth+1 (or depth 1 if none), and creates a new session at the `STAIRS` node with its immediate non-secret neighbors pre-discovered.
- **`completeDungeon(sessionId, characterId)`** — triggered when the boss node is in `clearedNodeIds`. Grants flat rewards: `xpReward = 50 + 25*depth`, `goldReward = 25 + 15*depth`, applied in a transaction alongside marking the session `COMPLETED`.
- **`failDungeon(sessionId)`** — sets `state: 'FAILED'` (e.g., on character death).
- **`abandonDungeon(sessionId)`** — currently a bare alias for `failDungeon`; the code comment reads *"For now, treat abandon as failed. Could be different in the future (partial rewards, etc.)"* — there is no partial-reward path today.

### Stub: dungeon completion does not currently affect district/faction control

`completeDungeon` computes a `FACTION_CONTROL_DELTA = 2` constant and checks whether the district has a `controllingFactionId`, but the actual effect is only logged, never applied:

```ts
if (districtState?.controllingFactionId) {
  // This would integrate with the existing district control system
  // For MVP, just log it
  console.log(`[Dungeon] Completed ${session.districtId} depth ${depth}: +${FACTION_CONTROL_DELTA} control for ...`);
}
```

The `DungeonCompletionResult.factionImpact` field is typed but always returned as `undefined`. **Whether dungeons are intended to eventually feed back into the district/faction control loop, or are meant to remain a self-contained side activity, cannot be determined from the code — NEEDS HUMAN CONTEXT.** Document the current behavior (no-op) as fact; don't assume either direction of intent.

## Encounter integration

Dungeon content types (`COMBAT`/`ELITE`/`TRAP`/`EVENT`/`TREASURE`) are resolved through dedicated dungeon-specific routes, not through the AI encounter-seed pipeline described in AI_ARCHITECTURE.md — dungeon encounters are deterministic node-content resolutions, not AI-generated narrative. Whether `COMBAT`/`ELITE`/`BOSS` nodes route into the same client-side conflict engine (`ConflictPane`) used by the main loop was not re-verified line-by-line for this document; treat as **INFERENCE** based on the shared `ConflictPane` component existing and dungeon combat needing some resolution mechanism — confirm before relying on this in code changes.

## Current uncommitted local work — do not modify

As of this writing, the working tree has three uncommitted changes related to (two of them) or incidental to (one of them) the dungeon subsystem. **These are pre-existing local changes, not something this documentation mission touched, and they remain untouched.**

1. **`app/api/dungeon/treasure/route.ts`** (untracked, new file) — a complete, auth-checked route: validates the request, computes `goldReward = round((10 + 8*depth) * uniform(0.8, 1.2))` (unseeded `Math.random()`), credits the character's `money`, marks the node cleared, and checks for dungeon completion. This closes a real gap — `TREASURE` nodes previously fell through to a generic "toast and auto-clear" path with no actual reward.
2. **`app/dungeon/page.tsx`** (modified) — adds the client-side call to the new treasure route: on encountering a `treasure`-type node, `POST /api/dungeon/treasure`, show a success/failure toast with the gold amount, refresh the character display. Functionally complete and consistent with the new route — not a stub.
3. **`app/components/footer.tsx`** (modified) — unrelated to the dungeon work: removes a Stripe donation link from the site footer. Bundled into the same working tree by coincidence, not by feature relationship.

Git history for the committed dungeon architecture (all within the last two weeks of committed work, 2026-03-02 to 2026-03-04): `c8d0525` "dungeon crawl" (initial subsystem) → `07b349e` "updates to dungeon" → `a1e8808` "Update the Dungeons for traps" → `9ab5922` "dungeion fixes". This makes dungeons the newest and most actively-iterated system in the codebase as of the last commit — see [PROJECT_STATE.md](./PROJECT_STATE.md) and [DECISIONS.md](./DECISIONS.md).
