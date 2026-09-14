# Decisions

Significant architectural transitions recoverable from Git history, reconstructed for context — not a contemporaneous decision log. Every entry here is a **reconstruction from commit messages and diffs, not a first-hand record of why a decision was made.** Where a "why" cannot be recovered from the repository, it is marked `NEEDS HUMAN CONTEXT` rather than invented. Do not treat this file as evidence of deliberate intent beyond what's explicitly cited.

Git history spans 2026-01-22 → 2026-03-04 (103 commits, single contributor), then a real, intentional pause — development did not resume until the Mission 1/2 session (2026-09-13). **The gap is confirmed human context, not a Git-history gap or evidence of lost work**: Story Forge was paused while attention moved to other projects, and its return in Mission 1/2 was a deliberate resumption/reassessment, not a recovery from an incident. **HUMAN CONTEXT, Mission 3 (2026-09-14)**: the fuller rationale — a change in the author's priorities after beginning a full-time role, and a reduction in creative energy for the idea, not a technical failure or disproven concept — is recorded in [LEARNINGS.md](./LEARNINGS.md#next-decision), which also records the project's current lifecycle classification as **PARKED**. See [PROJECT_STATE.md](./PROJECT_STATE.md) for what that means operationally.

## 1. MVP shipped as one large commit, same day (2026-01-22)

`9563280` "feat: initial playable loop with AI encounters and resolution" landed auth (login/signup, NextAuth route), character creation, the action execute/resolve API routes, AI encounter generation, and core game components together, on the project's first day (after `568507c`, the unmodified `create-next-app` scaffold). Auth was never a separate later milestone — it shipped bundled into the MVP from the start.

**FACT.** Followed same-day by a burst of reactive fixes (`8b16efa` "whack a mole", `d060361` "another mole", `a1dec4a` "whack", `93bcc53` "whack whack", `f79b7f2` "final one?") — **INFERENCE**: consistent with early post-deploy instability rather than a scope change; commit messages don't state a specific cause.

## 2. Combat rewrite: dice roll → the Resource Fracture conflict engine (2026-01-30)

`90a884c` "inserted mini game..." and `5ace89a` "new combat engine" replace/supplement the original dice-roll combat resolution (added 2026-01-25, `9728ea5` "updated combat resolution") with the turn-based Control/Stability/Position minigame described in [GAME_SYSTEMS.md](./GAME_SYSTEMS.md#the-conflict-engine-resource-fracture). The dice-roll path was not deleted — it remains today as the fallback used when no minigame outcome is submitted (`resolveEncounter()` in `combat/resolve-encounter.ts`).

**FACT** that this rewrite happened and what replaced what.

**RESOLVED — HUMAN CONTEXT (Mission 3, 2026-09-14)**: the switch was motivated by a desire to make repeated encounters more engaging, tactical, and decision-driven, while deliberately avoiding a deeply complex tactical-combat system — the stated goal was "enough strategy and resource management to make encounters interesting, without overwhelming the player with complexity." This is author recollection, not something Git history independently proves — no commit message or code comment states this motivation; do not treat this paragraph as if it were extracted from the repository. See [LEARNINGS.md](./LEARNINGS.md#experiments) for the fuller retrospective framing of this decision as part of the project's "encounter engagement" design bet.

## 3. Leverage system introduced as an explicit "MVP" (2026-02-02)

`8631451` "leverage MVP" + `d96a336` "leverage improvements" add the Control/Stability/Position resource that persists across encounters and can be spent inside the conflict minigame. The underlying schema was redesigned within days: `20260202000000_add_leverage_and_action_counter` (single JSONB column) → `20260202100000_leverage_integer_columns` (three discrete int columns) — a genuine in-flight schema correction, not just an addition. **FACT.**

## 4. Heat mechanic added, then heavily iterated (2026-02-04 to 2026-02-13)

Introduced alongside follow-up actions (`4a31fbf`, `1fe84e4`, early Feb), then multiple dedicated fix commits: `61c70cb` "fix the heat", `5429566` "resolve Heat issues", `f44545c` "fix heat". **FACT** that heat required repeated correction shortly after introduction. **What was specifically broken is NEEDS HUMAN CONTEXT** — commit messages don't describe the bug, only that fixes were needed.

## 5. Faction/district systems land in a cluster (2026-02-09 to 2026-02-15)

`ec76c89` "let players join a faction", `1dfd527` "update district based on encounters", `c1f295d` "reactions" (world reactions/ripple system), `49533b6` "CHaracter death" (death consequences), `a44f488` "intent", `5b9fb20` "fix district control issues", culminating in `387aa56` "faction tier / win end game" — **the win condition described in GAME_SYSTEMS.md was introduced here.** **FACT**, all directly evidenced by commit messages and the `escalationAndVictory.ts` module they correspond to.

## 6. New origins / alignment system (2026-02-17)

`a760ec2` "new origins" coincides with the `20260217_add_alignment_influence` migration, introducing the patron-deity/alignment system and the 4 district ideological-influence meters — both explicitly labeled `(MVP)` in the source. **FACT** of the addition and its "MVP" self-label.

**PARTIALLY RESOLVED — HUMAN CONTEXT (Mission 3, 2026-09-14)**: the motivation for building this system at all is now known — it was meant to give Story Forge original mythology and character-development paths distinct from familiar superhero-genre stereotypes, not to function as a generic morality meter. **What remains unresolved**: whether the author intended to deepen this system further or considered it feature-complete as shipped — the supplied human context did not answer this, and it is not invented here. Do not read the "(MVP)" comment as either a promise of future work or a statement of satisfaction. See [LEARNINGS.md](./LEARNINGS.md#experiments) for the fuller framing as a "character identity" design bet.

## 7. Economy layer: consumables then store (2026-02-22, 2026-02-25)

`bd44e5e` "added consumables", `875b471` "added store" — both also explicitly labeled `(MVP)` in the schema/source. Same caveat as above applies: **NEEDS HUMAN CONTEXT** on intended depth.

## 8. PvP "Fight Club" (2026-02-27)

`31a94c2` "PvP" — landed as one commit with substantial surface area (Elo rating, matchmaking, a combat simulator reusing the conflict engine, a full API surface). **INFERENCE**: the size and coherence of the single commit suggests it was developed somewhat separately before being merged in, rather than built incrementally in public commits — but this is a reading of the diff shape, not a stated fact.

## 9. Dungeon subsystem (2026-03-02 to 2026-03-04) — newest system, still in progress

`c8d0525` "dungeon crawl" → `07b349e` "updates to dungeon" → `a1e8808` "Update the Dungeons for traps" → `9ab5922` "dungeion fixes" (the typo in the commit message itself is consistent with fast, low-ceremony iteration). This is the last committed work before the development pause, and — per the current session — the subject of active local uncommitted work (the treasure-node route; see [DUNGEONS.md](./DUNGEONS.md#current-uncommitted-local-work--do-not-modify)) picked back up now.

**RESOLVED — HUMAN CONTEXT (Mission 3, 2026-09-14)**: dungeons were introduced for two reasons — a genuine concern that the core encounter loop could become stale or repetitive, and simple curiosity/fun in exploring what could be built and how far the project could be pushed. They were not part of an original roadmap; a late exploration of another engagement lever. **Still unresolved**: whether dungeon completion is intended to eventually feed back into district/faction control (see the stub described in [DUNGEONS.md](./DUNGEONS.md#stub-dungeon-completion-does-not-currently-affect-districtfaction-control)) — the supplied human context explicitly did not answer this, and it is left open rather than guessed at.

## 10. The client-trusted conflict outcome — a documented mechanism, not a documented decision

The code comment in `app/api/action/resolve/route.ts` (quoted in full in [ARCHITECTURE.md](./ARCHITECTURE.md#trust-boundaries)) explains *why* the server doesn't re-simulate the conflict minigame: its win conditions were judged too complex to replicate server-side. This is a **FACT** about the reasoning left in the code. Whether this was consciously accepted as a permanent tradeoff, a temporary MVP shortcut intended to be revisited, or simply never reconsidered after being written — **NEEDS HUMAN CONTEXT.** This document deliberately does not characterize it as "an intentional MVP tradeoff," per explicit instruction for this documentation pass — see [PROJECT_STATE.md](./PROJECT_STATE.md#known-risks) for the risk itself.

## Not reconstructed here

No commit message contains the literal words "auth," "schema," or "migration" — schema evolution is traceable only through `prisma/migrations/` filenames/dates, not commit narrative (see [DATA_MODEL.md](./DATA_MODEL.md#migration-timeline-12-migrations-2026-01-22--2026-02-17)). This document does not attempt to infer product rationale for decisions where the only evidence is a migration filename.
