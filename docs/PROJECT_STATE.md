# Project State

What's active, stable, stubbed, legacy, or in-progress right now. This is a **living document** — update it when a Claude session materially changes what's true here (a system moves from stub to implemented, a risk gets fixed, uncommitted work gets committed or discarded). It will go stale faster than the other docs; treat a date-stamped claim here with more suspicion the older it gets.

Last verified against the repository: 2026-09-14 (Mission 3 retrospective pass, following Mission 2 documentation and Mission 1 archaeology on 2026-09-13).

## Lifecycle status: PARKED

**Story Forge is currently PARKED.** This is a deliberate 3EF lifecycle classification, not a technical assessment — see [LEARNINGS.md](./LEARNINGS.md#next-decision) for the full human-context rationale: the author's priorities shifted after beginning a full-time role, and creative energy for continuing the idea diminished — not a technical failure, a disproven concept, or a specific blocker. Many directions remained open when work paused.

What PARKED means operationally, right now:

- **No active development phase is currently approved.** Nothing in this repository should be treated as a queued or committed-to next step for implementation work.
- **The pre-existing uncommitted dungeon work (below) does not make the project ACTIVE.** It is preserved, untouched, exactly as it was found across Missions 1–3 — its presence reflects where development happened to stop, not a resumed or in-progress effort.
- **The technical risks documented below remain documented, not remediation commitments.** Nothing here obligates fixing them; they are a record for whoever picks the project back up, whenever that happens.
- **Future resumption should pass the 3EF continuation gate before major investment** — i.e., a deliberate decision to resume, not an assumption that documentation existing or a session touching this repository implies resumption.

## Timeline context

Active development ran 2026-01-22 → 2026-03-04 (~6 weeks, 103 commits, single contributor), then paused. Missions 1–2 (2026-09-13) were a documentation/archaeology pass over the parked repository, not a resumption of feature work — a distinction Mission 3 clarifies further: the project's status was PARKED before, during, and after Missions 1–2, and remains PARKED after this mission. Treat the March–September gap as ordinary project pacing given a deliberate pause, not a data point requiring further explanation — see [LEARNINGS.md](./LEARNINGS.md) for the full retrospective.

## Most recently touched (historically — not a signal of current activity)

- **Dungeon subsystem** — the newest committed system (2026-03-02 to 2026-03-04) and the subject of uncommitted local work left in the working tree when the project paused (a treasure-node reward route + client wiring). See [DUNGEONS.md](./DUNGEONS.md). This reflects where development stopped, not a currently active effort.

## Stable (implemented, exercised by the live UI, no stub markers found)

Auth, the core action/encounter/conflict loop, districts/factions/escalation-and-victory, PvP. See [GAME_SYSTEMS.md](./GAME_SYSTEMS.md) for the full systems table.

## Self-labeled "MVP" in code (author's own label, not this document's judgment)

Alignment/patron-deity system, district ideological-influence meters, consumables, store. Current behavior is fully functional; whether further depth is planned is **NEEDS HUMAN CONTEXT** (see [DECISIONS.md](./DECISIONS.md#6-new-origins--alignment-system-2026-02-17)).

## Known stub inside an otherwise-shipped feature

Dungeon completion computes a faction-control delta (`FACTION_CONTROL_DELTA`) but only logs it — it never writes to `DistrictState`. See [DUNGEONS.md](./DUNGEONS.md#stub-dungeon-completion-does-not-currently-affect-districtfaction-control). Whether this is intended to be wired up is NEEDS HUMAN CONTEXT.

## Confirmed dead code (zero importers, verified by grep)

- `app/data/origins.ts` — superseded by `app/data/new-origins.ts`.
- `app/lib/ai/encounter-generator.ts` — the legacy monolithic AI-encounter generator, superseded by the seed+personalize pipeline (see [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md)).

Safe to remove in a future cleanup-scoped change; not touched by this documentation mission.

## Never scheduled

`cleanStaleCache()` (AI cache eviction, `app/lib/ai/encounter-cache.ts`) exists and is callable but nothing in the codebase invokes it — a manual or future-cron target.

## Pre-existing uncommitted local work (as of 2026-09-13, untouched by Missions 1, 2, or 3)

- `app/api/dungeon/treasure/route.ts` (untracked, new) — functionally complete depth-scaled gold reward endpoint.
- `app/dungeon/page.tsx` (modified) — client wiring for the treasure route.
- `app/components/footer.tsx` (modified) — unrelated: removes a Stripe donation link from the site footer.

These three files were explicitly preserved, not modified, staged, or committed, by Missions 1, 2, or 3. Their presence is a snapshot of where development stopped, not evidence of current activity — see **Lifecycle status** above. See [DUNGEONS.md](./DUNGEONS.md#current-uncommitted-local-work--do-not-modify).

## Known risks

Documented here for visibility, and preserved as a historical record while the project is **PARKED** — not a queue of remediation commitments. If Story Forge is ever resumed, each of these requires its own separately scoped mission with explicit approval before implementation, per [CLAUDE.md](../CLAUDE.md).

| Risk | Where | Severity (qualitative) |
|---|---|---|
| Client-trusted conflict/PvP outcome — server does a shape/range check, not a re-simulation | `app/api/action/resolve/route.ts`, `app/api/pvp/resolve/route.ts` | Medium — most consequential for PvP Elo integrity; see [ARCHITECTURE.md](./ARCHITECTURE.md#trust-boundaries) |
| Test coverage gap — only the conflict/PvP engine (already the lowest-risk deterministic code) is tested; alignment, leverage, districts, world, dungeons, and the AI pipeline have zero coverage | repo-wide | High — see [TESTING.md](./TESTING.md) |
| No CI | repo-wide | Medium — nothing gates `main`; the above gap is invisible until manually run |
| Three independent, non-shared seeded-RNG implementations, plus widespread unseeded `Math.random()` for gameplay-affecting rolls (retreat, consumable drops, all dungeon content resolution) | `app/lib/utils/rng.ts`, `app/lib/world/seededRng.ts`, `app/lib/dungeon/generator.ts` | Low — reproducibility is real but narrow and inconsistent; see [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md#seeded-rng--three-independent-implementations-not-part-of-the-ai-layer-but-adjacent) |
| Migration/schema drift — `PvpMatch`, `WorldState`, and the entire dungeon schema have no migration file | `prisma/schema.prisma` vs `prisma/migrations/` | High for any future schema work — see [DATA_MODEL.md](./DATA_MODEL.md#-schema-drift--read-before-touching-migrations-or-schema) |
| `/api/pvp/cleanup` auth fails open when `CRON_SECRET` is unset (it is currently unset) | `app/api/pvp/cleanup/route.ts` | Low — deletes only historical PvP match records, not user-owned state |
| In-memory, per-instance auth rate limiting — resets on restart, doesn't hold up under serverless/multi-instance deployment | `app/lib/auth-helpers.ts` | Low at current scale |
| Wide "god row" `Character` model — most simulation state as scalar/JSON columns on one table | `prisma/schema.prisma` | Low today (well-guarded with transactions); growing concern as more systems accrete |
| Known dependency advisories remain in `next` 16.1.6 (fix ≥16.3.3), `next-auth` beta.30 (fix beta.32), `prisma` CLI config deps, and `vitest` 4.0.18. The only materially applicable ones are Next.js Server Components DoS-class issues. Transitive tooling advisories were remediated 2026-09-25 (lockfile only). | `package.json` / `package-lock.json` | Medium if a production deployment is live, otherwise Low. See [SECURITY_ADVISORIES.md](./SECURITY_ADVISORIES.md) |
| Dead legacy files | `app/data/origins.ts`, `app/lib/ai/encounter-generator.ts` | Trivial |
| Unscheduled cache cleanup | `cleanStaleCache()` | Trivial |

See the final Mission 2 report (delivered in-session) for the full evidence trail behind each of these; this table is the durable summary.

## If Story Forge is ever resumed

No next mission is currently scheduled — the project is PARKED and Mission 3 (2026-09-14) was a retrospective/documentation pass, not a resumption. Should the 3EF continuation gate ever approve picking this project back up, the strongest candidates identified across Missions 1–2 remain: a **testing mission** scoped to the priority list in [TESTING.md](./TESTING.md#priority-if-a-testing-mission-is-scoped-later) (closes the highest-leverage silent-regression risk without touching product behavior), or a **schema-drift reconciliation mission** (baseline `prisma/migrations/` against the live database before any new schema work). Neither is proposed as an active next step while the project remains parked. See [LEARNINGS.md](./LEARNINGS.md) for the full retrospective and open design questions that would also inform a resumption decision.
