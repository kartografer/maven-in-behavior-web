# Plan: Consolidate Dependabot Security Fixes

- **Branch:** `bugfix/dependabot-cleanup` (from `main` at `ab3028b`)
- **Reviewed:** 2026-11-13
- **Status:** Phase 1 implemented and validated, PR opened. Phases 2–4 still to do.
- **Update 2026-11-14:** Phases 2–4 are now planned in more detail in [`angular-upgrade.md`](angular-upgrade.md). Angular 20 support ends 2026-11-28.

## Progress

| Phase | Scope                                                                    | Status                |
| ----- | ------------------------------------------------------------------------ | --------------------- |
| 1     | Consolidate 22 green Dependabot PRs (transitive lockfile updates)        | ✅ Done (this branch) |
| 2     | Angular framework + CLI upgrade to 20.3.35 (#118, #114, #104, #103, #94) | ⏳ Next, separate PR  |
| 3     | Remove `angular-cli-ghpages` + MCP SDK override; later Angular 22 (#116) | ⏳ To do              |
| 4     | Firebase upgrade for `@grpc/grpc-js` ≥ 1.13.6 (#66); re-run #73          | ⏳ To do              |

## Decisions made (by reviewer, 2026-11-13)

1. **Take the latest version allowed by existing ranges**, not the exact Dependabot PR versions. This also fixes advisories published after the PRs were opened.
2. **Exclude PR #94** (`@angular/cli` 20.3.22 → 20.3.34) from this PR. The CLI moves with the Angular upgrade in Phase 2.
3. **The Angular lockstep upgrade goes in a follow-up PR**, not this one.
4. Failed Dependabot PRs are not included. Each has a root cause and fix below.

---

## Phase 1: Done

### What changed

- Only `package-lock.json` changed. `package.json` is untouched.
- Command used:

```sh
npm update follow-redirects hono postcss-selector-parser fast-uri source-map-js \
  compression proxy-addr ip-address js-yaml baseline-browser-mapping @humanfs/node \
  browserslist nanoid @hono/node-server socket.io-parser ws engine.io socket.io-adapter \
  shell-quote launch-editor tar immutable websocket-driver sigstore @sigstore/verify
```

No `--force` and no `--legacy-peer-deps`.

### Resolved versions vs. Dependabot targets

| PR             | Package                            | Dependabot target      | Installed                        |
| -------------- | ---------------------------------- | ---------------------- | -------------------------------- |
| #117           | follow-redirects                   | 1.16.1                 | 1.16.3                           |
| #115           | hono                               | 4.13.13                | 4.13.18                          |
| #113           | postcss-selector-parser            | 7.1.6                  | 7.2.1                            |
| #112           | fast-uri                           | 3.1.8                  | 3.1.9                            |
| #111           | source-map-js                      | 1.2.2                  | 1.2.2                            |
| #109           | compression                        | 1.8.2                  | 1.8.2                            |
| #107           | proxy-addr                         | 2.0.8                  | 2.0.8                            |
| #106           | ip-address                         | 10.7.2                 | 10.7.6                           |
| #102           | js-yaml                            | 4.3.2                  | 4.3.2                            |
| #101           | baseline-browser-mapping           | 2.11.21                | 2.11.37                          |
| #99            | @humanfs/node                      | 0.16.8                 | 0.16.8                           |
| #98            | browserslist                       | 4.28.8                 | 4.29.5                           |
| #97            | nanoid                             | 3.3.18                 | 3.3.20                           |
| #90            | socket.io-parser                   | 4.2.7                  | 4.2.7                            |
| #85            | ws / engine.io / socket.io-adapter | 8.21.1 / 6.6.9 / 2.5.8 | 8.21.3 + 8.23.0 / 6.6.11 / 2.5.8 |
| #84            | shell-quote                        | 1.10.0                 | 1.12.0                           |
| #83            | launch-editor                      | 2.14.1                 | 2.14.2                           |
| #82            | tar                                | 7.5.22                 | 7.5.23                           |
| #80            | immutable                          | 5.1.9                  | 5.2.1                            |
| #76            | websocket-driver                   | 0.7.5                  | 0.7.5                            |
| #75            | sigstore                           | 4.1.1                  | 4.1.1                            |
| #74            | @sigstore/verify                   | 3.1.1                  | 3.1.1                            |
| (#94, partial) | @hono/node-server                  | 2.1.0                  | **1.19.19**                      |

Notes on `@hono/node-server`:

- 2.x only comes in with the `@angular/cli` bump from #94, which is deferred to Phase 2.
- 1.19.19 clears GHSA-frvp-7c67-39w9 and GHSA-jpvv-r467-5p4w.
- GHSA-rmxm-3fg6-px4f (needs 2.1.3) stays open until Phase 2.

### Validation (local, Node 24.13.0, npm 11.6.2)

| Check                                | Result                                           |
| ------------------------------------ | ------------------------------------------------ |
| `npm ci` (clean)                     | ✅ 1185 packages                                 |
| `npm run build`                      | ✅                                               |
| `npm run build:prod`                 | ✅                                               |
| `npm test` (Karma, ChromeHeadlessCI) | ✅ 8/8                                           |
| `npm run lint`                       | ✅ all files pass                                |
| `npm audit`, before (`main`)         | 83 (2 low, 35 moderate, 41 high, **5 critical**) |
| `npm audit`, after                   | 59 (2 low, 30 moderate, 26 high, **1 critical**) |

### Dependabot PRs this replaces

#117, #115, #113, #112, #111, #109, #107, #106, #102, #101, #99, #98, #97, #90, #85, #84, #83, #82, #80, #76, #75, #74.

After merge, Dependabot should close them automatically. Close any it leaves open by hand. **Leave #94 open** for Phase 2.

### Remaining `npm audit` findings after Phase 1

- **critical:** piscina
- **high:**
  - @angular/common, @angular/compiler, @angular/core, @angular/router _(Phase 2)_
  - @modelcontextprotocol/sdk, pacote, zod _(via @angular/cli; Phases 2–3)_
  - @grpc/grpc-js, protobufjs _(via firebase; Phase 4)_
  - basic-ftp, extract-zip _(via puppeteer / angular-cli-ghpages)_
  - body-parser, path-to-regexp, http-proxy-middleware, webpack-dev-middleware, vite, postcss, brace-expansion, node-forge
- **moderate:**
  - @hono/node-server, webpack-dev-server, glob, minimatch, qs, uuid
- **low:**
  - @babel/core, serialize-javascript

Most of the build-tooling findings (vite, webpack-dev-\*, piscina, postcss, node-forge, babel) come through `@angular-devkit/build-angular` / `@angular/build` and should clear in Phase 2.

---

## Phase 2: Angular 20.3.x lockstep upgrade (next PR)

**Covers:** #118, #114, #104, #103 (failed), and #94 (deferred).

### Why those PRs failed

`npm ci` → `ERESOLVE`. Angular framework packages require each other at the **exact same version**, and Dependabot bumped only one package per PR:

| PR   | Bump                          | Conflict                                                    |
| ---- | ----------------------------- | ----------------------------------------------------------- |
| #118 | `@angular/common` → 20.3.34   | requires `@angular/core@20.3.34`; project has 20.3.18       |
| #114 | `@angular/router` → 20.3.33   | requires `@angular/common@20.3.33`                          |
| #104 | `@angular/core` → 20.3.28     | `@angular/animations@20.3.18` requires `core@20.3.18`       |
| #103 | `@angular/compiler` → 20.3.28 | `@angular/compiler-cli@20.3.18` requires `compiler@20.3.18` |

### Fix

1. Branch from `main` once Phase 1 is merged, e.g. `bugfix/angular-20.3-security`.
2. Run:

   ```sh
   ng update @angular/core@20 @angular/cli@20
   ```

   Or bump all of these together to the latest 20.3.x (20.3.35 as of 2026-11-13):
   - `animations`, `common`, `compiler`, `compiler-cli`, `core`
   - `forms`, `language-service`
   - `platform-browser`, `platform-browser-dynamic`, `router`
   - `cli`
   - `@angular-devkit/build-angular`

3. Re-run `npm update` so `@hono/node-server` resolves to ≥ 2.1.3.
4. Validate: `npm ci`, `build`, `build:prod`, `test`, `lint`, `audit`.
5. Close #118, #114, #104, #103 and #94.

**Priority: high.** These are **high-severity alerts in code that ships to users** (router, core, compiler, common).

---

## Phase 3: #116 (`@angular/cli` → 22.2.3)

- **Failure:** `ERESOLVE`. `angular-cli-ghpages@3.0.2` only supports `@angular/cli` from 18 up to (not including) 22.
- **Root cause:** this jumps **two major versions**. CLI 22 also needs Angular 22 framework packages, a matching `@angular/fire`, and Node `^22.22.3 || ^24.15.0`.

### Fix

1. **Remove `angular-cli-ghpages`.** It is unused: deployment uses `@angular/fire:deploy` (`angular.json`) and the Firebase GitHub Action.
2. **Short term (stay on Angular 20):** CLI 20.3.35 pins `@modelcontextprotocol/sdk@1.30.0`, which is still vulnerable to:
   - GHSA-6qxp-vccf-f47h
   - GHSA-22jm-h49p-29qw
   - GHSA-6prh-2h8m-c8cw
   - GHSA-rvq5-wwqv-78pq

   Add to `package.json`:

   ```json
   "overrides": { "@modelcontextprotocol/sdk": "^1.32.0" }
   ```

   This keeps the same major version; the SDK is only used by the `ng mcp` command.

3. **Long term:** migrate Angular 20 → 21 → 22 with `ng update`, one major version at a time. Check that `@angular/fire` 22 is out as a stable release first, and bump CI Node to ≥ 24.15.
4. Close #116 once it's superseded.

---

## Phase 4: #66 and #73 (failed at the test step, logs expired)

Both passed `npm ci` and build in CI and failed only at `npm test`. The logs have expired (HTTP 410). On each PR's exact head commit, `npm ci`, build and tests (2/2 at the time) all pass locally on Node 24. The most likely cause is a one-off failure launching headless Chrome in Karma, not a real incompatibility.

### #73: @sigstore/core 3.2.0 → 3.2.1

- Already superseded: Phase 1 updated `sigstore` to 4.1.1 and `@sigstore/verify` to 3.1.1.
- **Action:** comment `@dependabot rebase`, or close it if Dependabot doesn't close it after Phase 1 merges.

### #66: @grpc/grpc-js 1.9.15 → 1.9.16

- This bump **doesn't fix the open alerts** (GHSA-m9gg-hp2v-232j, GHSA-f596-whhp-79r4), which need grpc-js **≥ 1.13.6**.
- grpc-js comes from `firebase@11.10.0` → `@firebase/firestore@4.8.0`, which locks it to 1.9.x.

**Action:**

1. Close #66.
2. In a separate PR, upgrade `firebase` (and `@angular/fire` if needed) to a version whose Firestore depends on grpc-js ≥ 1.13.6. This also clears the protobufjs alerts.
3. Regression-test Firestore and Storage features, since this is runtime code.

---

## Pick-up checklist (next session)

- [ ] Phase 1 PR reviewed and merged; superseded Dependabot PRs closed
- [ ] Phase 2: Angular 20.3.x + CLI + build-angular upgrade PR
- [ ] Phase 3: remove `angular-cli-ghpages`, add MCP SDK override; plan the Angular 22 migration
- [ ] Phase 4: close #66 / #73; Firebase upgrade PR
- [ ] Re-run `npm audit` and refresh the remaining-findings list above
