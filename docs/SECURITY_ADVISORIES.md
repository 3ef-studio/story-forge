# Dependency Security Advisories

Review of known dependency and framework advisories against Story Forge's actual code paths and deployment. This is a **point-in-time snapshot**. Advisory databases change daily, so re-run `npm audit` before relying on it.

Last reviewed: 2026-09-25 (`npm audit` against the GitHub Advisory Database, npm 10.9.7, Node 22).

Labels follow [CLAUDE.md](../CLAUDE.md#documentation-standards): **FACT** = verified in code/lockfile, **INFERENCE** = reasonable reading, **NEEDS HUMAN CONTEXT** = cannot be recovered from the repo.

## Summary

| | Before | After this pass |
|---|---|---|
| `npm audit` total | 26 (4 critical, 16 high, 4 moderate, 2 low) | 11 (4 critical, 6 high, 1 moderate) |

**What changed (FACT):** `package-lock.json` only. `package.json` is unchanged, and no direct dependency changed version. The only updates were transitive build/lint/test-tooling packages, each within the semver range its parent already declared (see [Remediated](#remediated-in-this-pass)).

**What remains:** the 11 remaining advisories can only be fixed by upgrading `next`, `next-auth`, `prisma`, or `vitest`. The first three are HIGH-risk dependency upgrades under [CLAUDE.md](../CLAUDE.md#risk-tiers). The `vitest` fix is a minor-version bump, not a patch. None of them were applied. Each is assessed below.

## Deployment facts the assessment relies on

- **FACT**: no `middleware.ts`/`proxy.ts`, no `rewrites`/`redirects`/`images`/`i18n`/`cacheComponents` in `next.config.ts` (the config is empty), no `"use server"` Server Actions, no `next/image` or `next/script` usage, no Edge-runtime routes, no custom server.
- **FACT**: auth is NextAuth v5 with the **Credentials provider only** (no OAuth, no Email/magic-link provider) and JWT sessions (`app/lib/auth.ts`). Email normalization is the app's own `normalizeEmail()` in `app/lib/auth-helpers.ts`.
- **FACT**: every authenticated API route gates on `session?.user?.id` (27 files call `auth()`; none gate only on the session object existing).
- **FACT**: `public/` contains only SVG and PNG files. There are no AVIF assets.
- **INFERENCE** (see [ARCHITECTURE.md](./ARCHITECTURE.md)): deployed to Vercel, which is Linux-hosted and serves `/_next/image` through Vercel's own image optimization rather than the app's `sharp`.
- **NEEDS HUMAN CONTEXT**: whether a production deployment is still live while the project is [PARKED](./PROJECT_STATE.md#lifecycle-status-parked). If it is, the `next` finding below is the one worth acting on.

## Remediated in this pass

All of these are dev, build, lint, or test tooling. None ship in the deployed runtime. The fixes were in-range lockfile updates (`npm update <pkg>`).

| Package | From → To | Advisories closed | Reached via |
|---|---|---|---|
| brace-expansion | 1.1.12 → 1.1.21, 2.0.2 → 2.1.7 | GHSA-f886-m6hf-6m8v, GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895 (DoS) | eslint, typescript-eslint |
| minimatch | 3.1.2 → 3.1.5, 9.0.5 → 9.0.9 | GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74 (ReDoS) | eslint, typescript-eslint |
| picomatch | 2.3.1 → 2.3.2, 4.0.3 → 4.0.7 | GHSA-c2c7-rcm5-vvqj, GHSA-3v7f-55p6-f55p | tooling globbing |
| flatted | 3.3.3 → 3.4.4 | GHSA-25h7-pfq9-p65f, GHSA-rf6f-7fwh-wjgh | eslint cache |
| js-yaml | 4.1.1 → 4.3.2 | GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj, GHSA-2883-xcg3-v3hh | eslint |
| ajv | 6.12.6 → 6.15.0 | GHSA-2g4f-4pwh-qvx6 | eslint |
| @humanfs/node | 0.16.7 → 0.16.8 | GHSA-p498-v437-472g | eslint |
| @babel/core (+ helpers) | 7.29.0 → 7.29.7 | GHSA-4x5r-pxfx-6jf8 | eslint-config-next |
| browserslist | 4.28.1 → 4.29.1 | GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g | build tooling |
| baseline-browser-mapping | 2.9.19 → 2.11.26 | GHSA-w5vr-8v7q-w6rv | build tooling |
| nanoid | 3.3.11 → 3.3.19 | GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8, GHSA-xwg4-73v4-xw9w | postcss |
| postcss (top-level) | 8.5.6 → 8.5.28 | GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849 | `@tailwindcss/postcss`, vite |
| defu | 6.1.4 → 6.1.7 | GHSA-737v-mqg7-c878 | prisma CLI (`c12`) |
| vite | 7.3.1 → 7.3.6 | GHSA-4w7w-66w2-5vf9, GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583, GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff | vitest |
| esbuild | 0.27.3 → 0.28.2 | GHSA-g7r4-m6w7-qqqr (Windows dev server) | vite (declares `^0.27.0 \|\| ^0.28.0`) |
| rollup | 4.57.1 → **4.62.3** | GHSA-mw96-cpmx-2vgc | vite |

Rollup was deliberately pinned to 4.62.3 in the lockfile rather than the newest release (4.63.5). From 4.62.4 on, rollup lists `@napi-rs/lzma-linux-x64-gnu` as an unconditional optional dependency, which its own `package.json` comments describe as a build-toolchain concern. **INFERENCE**: that is an upstream packaging slip. A new native binary is not needed to close the advisory, so this pass avoided it.

## Remaining findings

### `next` 16.1.6: critical/high in the advisory DB, partly applicable here

Fix: `next` ≥ 16.3.3 (latest 16.3.6). That release also pins `postcss` 8.5.23 and `sharp` ^0.35.4, which clears the nested `postcss`/`sharp` findings. No 16.1.x backport exists (16.1.7 fixes only the oldest subset). **HIGH risk** per CLAUDE.md: it's a two-minor-version framework bump, so it needs its own approval and the full HIGH checklist in [DEFINITION_OF_DONE.md](./development/DEFINITION_OF_DONE.md).

| Advisory group | Applicable? |
|---|---|
| GHSA-p293-qw3h-jr36: unauthenticated RCE on **Windows-hosted** servers (critical) | **No.** Vercel/Linux hosting (INFERENCE). |
| GHSA-2xp9-vwfh-vxw4: RCE in Image Optimization API **with AVIF** (critical) | **Unlikely.** No `next/image`, no AVIF assets, no remote image patterns configured, and on Vercel `/_next/image` doesn't run the app's `sharp`. The default `/_next/image` endpoint still exists in self-hosted builds, so this would matter if the app were ever self-hosted. |
| GHSA-q4gf-8mx6-v5v3, GHSA-8h8q-6873-q5fj: Server Components DoS (high) | **Plausibly yes.** Affects App Router apps generally, and every page here is an App Router route. Impact is availability only. |
| GHSA-68g3-v927-f742, GHSA-4633-3j49-mh5q: cache confusion for requests with bodies (moderate) | **Possibly.** The app's API is POST-heavy. Route handlers export `force-dynamic` broadly, which reduces exposure. Not verified per-route. |
| Middleware/proxy bypasses (GHSA-26hh, -492v, -267c, -36qx, -6gpp), proxy redirect cache poisoning | **No.** There is no middleware. Every route calls `auth()` itself. |
| Server Actions CSRF / DoS / SSRF / endpoint disclosure / Edge payload (GHSA-mq59, -m99w, -89xv, -955p, -4c39) | **No.** There are no Server Actions. |
| Rewrites smuggling/SSRF (GHSA-ggv3, -p9j2), WebSocket SSRF (GHSA-c4j6), CSP-nonce XSS (GHSA-ffhc), `beforeInteractive` XSS (GHSA-gx5p), Cache Components (GHSA-mg66), i18n | **No.** None of these features are used. |
| Image Optimization DoS / disk growth (GHSA-h64f, -q8wf, -3x4c) | **Low.** Only local PNG/SVG sources, and Vercel handles image optimization. |
| RSC cache poisoning (GHSA-wfc6, -vfv6), postponed resume buffering (GHSA-h27x) | **Low.** PPR and caching aren't configured. Not independently verified. |
| Dev HMR websocket CSRF (GHSA-jcc7) | **Dev only.** |
| Nested `postcss` 8.4.31 (pinned exactly by `next`) | **No.** Only affects attacker-controlled CSS/source maps at build time. The CSS here is first-party. |
| Nested `sharp` 0.34.5 (libvips/libheif CVEs, GHSA-f88m, -rgj7) | **Low.** Same reasoning as the AVIF row. |

**Recommendation:** if a deployment is live, upgrading `next` is the single highest-value remaining fix. Scope it as its own HIGH-risk change: bump to ≥16.3.3, keep `eslint-config-next` in step, then run the full MEDIUM checklist plus a manual login/session and action-resolve smoke test.

### `next-auth` 5.0.0-beta.30 / `@auth/core` 0.41.0: critical in the advisory DB, not materially applicable

Fix: `next-auth` 5.0.0-beta.32, which pins `@auth/core` 0.41.3. `@auth/core` is pinned exactly by `next-auth`, so it can't be patched alone. **HIGH risk** per CLAUDE.md, because it changes NextAuth itself.

| Advisory | Applicable? |
|---|---|
| GHSA-8fpg-xm3f-6cx3: config errors make **existence-based** auth checks fail open (critical) | **No, not as written.** Every route checks `session?.user?.id`, not just whether the session exists. The `session` callback sets `user.id` only when `session.user` exists. An error-populated auth object has no `user.id`, so these routes fail closed (INFERENCE from `app/lib/auth.ts` and route grep). Still worth fixing, because any future `if (session)` check would be exposed. |
| GHSA-7rqj-j65f-68wh: email normalizer homoglyph `@` bypass (critical) | **No.** Affects Auth.js's Email-provider normalizer. This app uses Credentials only, with its own normalization. |
| GHSA-xmf8-cvqr-rfgj: `getToken()` throws on malformed Bearer header (high) | **Low.** The app never calls `getToken()` and reads sessions from cookies. |
| GHSA-x445-f3h2-j279: OAuth state/nonce/PKCE cookie binding (moderate) | **No.** There are no OAuth providers. |

**Recommendation:** upgrade opportunistically together with, or immediately after, the `next` upgrade, as a separate reviewed step. It isn't urgent on its own.

### `prisma` 6.19.2 (`@prisma/config` → `effect`, `deepmerge-ts`): high in the advisory DB, not applicable

- **FACT**: these packages belong only to the Prisma **CLI's** config loader (`@prisma/config`), which is used by `prisma generate`/`migrate` at build time. The runtime `@prisma/client` path doesn't load them. There is no `prisma.config.ts` in the repo.
- GHSA-38f7-945m-qr2g (`effect` AsyncLocalStorage leak) only applies to Effect RPC under concurrent load. GHSA-ggr8-5vv4-36mx (`deepmerge-ts` recursive-graph stack exhaustion) needs attacker-controlled input to the CLI config merge. Neither is reachable from a request.
- `npm audit`'s suggested "fix" is a **downgrade** to `prisma` 6.12.0 (flagged as semver-major). Don't apply it. `prisma` 6.19.3 updates `effect` to 3.21.0 but still ships `deepmerge-ts` 7.1.5.
- **Recommendation:** no action. If Prisma is upgraded for other reasons, take 6.19.3+. Any Prisma change is HIGH risk and subject to the [schema-drift guardrails](./DATA_MODEL.md#-schema-drift--read-before-touching-migrations-or-schema). A version bump alone doesn't touch the schema, but `postinstall` runs `prisma generate`.

### `vitest` 4.0.18 (`@vitest/mocker`): critical in the advisory DB, not applicable

- GHSA-5xrq-8626-4rwp (critical) only applies **while the Vitest UI server is listening**. `@vitest/ui` isn't installed and `npm test` runs `vitest run`.
- GHSA-82fw-gwwq-j7x9 (mocker redirect path traversal) requires malicious test code in the repo.
- Dev-only. It never ships to production.
- **Recommendation:** bump to `vitest` 4.1.11+ in a small, separately approved dev-dependency change. That's a minor bump, not a patch, so it's outside this pass.

## Validation performed for this pass

- `npm ci` from the updated lockfile succeeds.
- `npx tsc --noEmit` passes.
- `npx eslint .` gives 68 problems (12 errors, 56 warnings), identical to the documented baseline in [TESTING.md](./TESTING.md).
- `npx vitest run` passes: 5 files, 102 tests.
- `next build` succeeds, using placeholder env values only so page-data collection can instantiate the OpenAI client. No real secrets were used and none were written anywhere.
- Not performed: manual `npm run dev` smoke test. No runtime dependency changed, so the MEDIUM/HIGH smoke-test items don't apply.
