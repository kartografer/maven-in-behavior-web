# Plan: Angular Upgrade

- **Reviewed:** 2026-11-14
- **Status:** Steps 0–5 and Step 6.1 implemented on `chore/angular-21-upgrade`, PR opened. See **Progress** below.
- **Branch:** `chore/angular-21-upgrade` (from `main`)
- **Related:** Phases 2–4 of [`dependabot-cleanup.md`](dependabot-cleanup.md). This plan replaces them.

## Progress (2026-11-14)

**Decisions by reviewer:**

- Go straight to 21.
- Include Firebase 12 in the same PR.
- Include the esbuild builder migration.
- The grpc/protobufjs alert dismissal was not decided, so it was left as is.

| Step                                 | Commit                                                  | Result                               |
| ------------------------------------ | ------------------------------------------------------- | ------------------------------------ |
| Plan                                 | `docs: add Angular 21 upgrade plan`                     | ✅                                   |
| 1. Remove `angular-cli-ghpages`      | `chore: remove unused angular-cli-ghpages`              | ✅ 30 packages removed               |
| 2. Angular + CLI → 21.2.x            | `chore: upgrade Angular framework and CLI to 21`        | ✅ See notes below                   |
| 3. @angular/fire 21 + firebase 12.19 | `chore: upgrade @angular/fire to 21 and firebase to 12` | ✅ Needed `skipLibCheck` (see notes) |
| 4. angular-eslint 21.4               | `chore: upgrade angular-eslint to 21`                   | ✅                                   |
| 6.1. esbuild `application` builder   | `build: switch to the esbuild application builder`      | ✅ Output kept in `dist/web`         |
| Extra                                | `chore(deps): apply non-breaking npm audit fixes`       | ✅ body-parser, brace-expansion, qs  |

**Differences from the plan:**

- **The control-flow migration ran automatically** in `ng update` 21. All 26 `*ngIf`/`*ngFor` are now `@if`/`@for`, so Step 6.2 is done. The migration used `track item`; I changed it to `track item.id` so saves don't rebuild every card.
- **TestBed needed `provideZoneChangeDetection()`** to match the app's bootstrap. Without it, one test hit NG0100 under Angular 21's new zone scheduler defaults.
- **Firestore 12.19 type definitions reference the `Temporal` API**, which TypeScript 5.9 lacks, and only for methods the app doesn't use. Fixed by enabling `"skipLibCheck": true`, the Angular CLI default for new projects.
- **The builder migration moved output to `dist/web/browser`.** I set `outputPath.browser: ""` to keep `dist/web`, so `firebase.json` and the deploy workflow need no change. Karma `polyfills` had to be an array, and the old `@angular-devkit/build-angular` Karma framework entry was removed.
- **`@modelcontextprotocol/sdk`** is now 1.32.1 via CLI 21, so no override was needed.
- **Run migrations with a pinned version:** `ng update @angular/cli --name …` without a version fetches the latest CLI (22), which needs Node ≥ 24.15. Use `@angular/cli@21`.
- **Lockfile and npm version:** the first CI run failed at `npm ci`. CI uses Node 24.22.2 (npm 11.19.1), which requires the optional `@emnapi/*` peers of `@napi-rs/wasm-runtime` in the lockfile; local npm 11.6.2 (Node 24.13.0) left them out. The lockfile is now generated with **npm 11.19.1**. Local Node 24.13's npm in turn rejects that lockfile (it expects extra nested `readdirp` copies), so **local development needs Node ≥ 24.22**: `nvm install 24 && nvm alias default 24`. Until then, use `npx npm@11.19.1 ci` / `npx npm@11.19.1 install`.

**Results:**

| Measure                              | Before (`main`)          | After                                      |
| ------------------------------------ | ------------------------ | ------------------------------------------ |
| `npm ci` packages                    | 1,185                    | 825                                        |
| Dev build                            | ~9.6s                    | ~1.6s                                      |
| Prod build                           | ~9.9s                    | ~3.7s                                      |
| Prod initial bundle (raw / transfer) | 734 kB / 196 kB          | 940 kB / 248 kB (Angular 21 + Firebase 12) |
| `npm audit`                          | 59 (1 critical, 26 high) | 38 (0 critical, 15 high)                   |

**Validation:**

- Clean `npm ci`, both builds, tests (10/10, repeated), and lint all pass.
- Dev and production smoke tests: all sections, team cards and "Read more" work; the edit button shows only on `/cms`.
- No Angular errors in the console. The only 404 is `favicon.ico`, which has never existed in `src/` (an existing issue).

**Still to do:**

- [ ] Manual CMS smoke test with the editor's Google account: sign in, edit, photo upload, save. This can't be automated here.
- [ ] Check the deployed preview after merge.
- [ ] Close the superseded Dependabot PRs #118, #114, #104, #103 and #94 after merge.
- [ ] Remaining `npm audit` findings:
  - `@grpc/grpc-js`: not reachable in the browser build; dismissal decision pending.
  - `basic-ftp`: needs 6.2.4 (via puppeteer → proxy-agent).
  - `extract-zip`, `zod`: need puppeteer 25 (major).
  - `glob`, `minimatch`: npm's suggested fixes are downgrades; wait for upstream.
- [ ] Later: Angular 22, once `@angular/fire` 22 is stable (TypeScript 6, Node ≥ 24.15).
- [ ] Optional: Karma → Vitest.
- [ ] Optional: add a `favicon.ico`, or remove it from `angular.json` assets.
- [ ] Update local Node to ≥ 24.22 (matches CI; Angular 22 will need ≥ 24.15). Consider adding an `.nvmrc` so local and CI stay aligned.
- [ ] npm 11.19 warns that 7 packages' install scripts are "not yet covered by allowScripts" (including `@firebase/util`, `@parcel/watcher` and `puppeteer`'s Chrome download). A future npm will block them by default; add an `allowScripts` list before that happens, or CI tests will lose Chrome.

## TL;DR

The app runs **Angular 20.3.18**. Angular 20's **long-term support ends 2026-11-28, two weeks from today**. After that it gets no more security patches.

**Recommendation:** upgrade to **Angular 21** now.

- Angular 21 is supported until **2027-06**.
- Every package the app needs has a stable release for 21.
- The upgrade fixes the high-severity Angular alerts (core, common, compiler, router) and the deferred Dependabot PRs.

**Angular 22 (latest) is blocked for now.** It needs TypeScript 6, but there is **no stable @angular/fire release for Angular 22** (only `22.0.0-rc.0`), and the current stable @angular/fire requires TypeScript < 6.

---

## 1. Current state

| Area        | Package                                                                             | Installed              | Latest in 20.x | Latest overall                |
| ----------- | ----------------------------------------------------------------------------------- | ---------------------- | -------------- | ----------------------------- |
| Framework   | `@angular/*` (core, common, compiler, forms, router, animations, platform-browser…) | **20.3.18**            | 20.3.35        | 22.2.6                        |
| CLI / build | `@angular/cli`, `@angular-devkit/build-angular`                                     | 20.3.22                | 20.3.43        | 22.2.7                        |
| Firebase    | `@angular/fire`                                                                     | 20.0.1                 | 20.1.1         | 21.0.0 (stable) / 22.0.0-rc.0 |
| Firebase    | `firebase`                                                                          | 11.10.0                | —              | 13.3.0                        |
| Lint        | `@angular-eslint/*`                                                                 | 20.7.0                 | 20.7.0         | 22.6.0                        |
| Language    | `typescript`                                                                        | 5.9.3                  | —              | 7.0.2                         |
| Runtime     | `zone.js` / `rxjs` / `tslib`                                                        | 0.15.1 / 7.8.2 / 2.8.1 | —              | 0.16.3 / — / —                |
| Tests       | `karma` / `jasmine-core`                                                            | 6.4.4 / 5.12.1         | —              | —                             |
| Node        | CI `24.x`; local `v24.13.0`                                                         |                        |                |                               |

### How the app is built

- **App structure:** `AppModule` is bootstrapped with `platformBrowserDynamic().bootstrapModule()`, uses **zone.js**, and has a non-standalone component (`standalone: false`).
- **Builders (`angular.json`):** the legacy **webpack** builders `@angular-devkit/build-angular:browser`, `:dev-server`, `:karma` and `:extract-i18n`. Deploy uses `@angular/fire:deploy`; lint uses `@angular-eslint/builder:lint`.
- **Templates:** 26 uses of `*ngIf` / `*ngFor`, which are deprecated in favor of `@if` / `@for`.
- **Firebase APIs used:** `@angular/fire/app`, `@angular/fire/performance`, `firebase/auth`, `firebase/firestore`, `firebase/storage`.
- **Unused dependency:** `angular-cli-ghpages`. Deploy uses `@angular/fire:deploy` and the Firebase GitHub Action, and this package blocks CLI ≥ 22.

## 2. Support timeline (angular.dev/reference/releases)

| Version            | Status | Released   | Active ends | LTS ends       |
| ------------------ | ------ | ---------- | ----------- | -------------- |
| 22.x               | Active | 2026-06-03 | 2027-06     | 2028-06        |
| 21.x               | LTS    | 2025-11-19 | 2026-06-03  | **2027-06**    |
| **20.x (current)** | LTS    | 2025-05-28 | 2025-11-19  | **2026-11-28** |

## 3. Choosing the target version

| Target               | Requires                                                                                                                                                                                                    | Status for this app                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 20.3.35 (patch only) | Nothing new                                                                                                                                                                                                 | ✅ Possible, but support ends in 2 weeks. Stopgap only. |
| **21.2.x**           | TS ≥ 5.9 < 6.1 ✅ (have 5.9.3); Node ^20.19 / ^22.12 / ≥ 24 ✅; zone.js ~0.15 ✅; **@angular/fire 21.0.0** (Angular ^21.2, TS < 6.0) ✅; **firebase ^12.18** (major bump from 11); angular-eslint 21.4.0 ✅ | ✅ **Recommended**                                      |
| 22.2.x               | **TS ≥ 6.0**; Node ^22.22.3 / ^24.15 (local 24.13 is too old); **@angular/fire 22 not stable**; current fire requires TS < 6 ❌                                                                             | ⛔ **Blocked** until @angular/fire 22 is stable         |

## 4. Impact of breaking changes (Angular 21 / Firebase 12)

Sources: the angular/angular and angular/angular-cli `CHANGELOG.md` (21.0.0) and the firebase-js-sdk `firebase@12.0.0` release.

| Change                                                                                                                                                | Affects this app?                        | Handling                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| Angular no longer provides a ZoneJS change-detection scheduler by default; `provideZoneChangeDetection` must be added to the bootstrap or `AppModule` | **Yes** (NgModule + zone.js)             | **Automatic** migration in `ng update`                                     |
| TypeScript < 5.9 dropped                                                                                                                              | No (5.9.3)                               | —                                                                          |
| Router navigations take extra microtasks (timing-sensitive tests)                                                                                     | **Possibly**: specs call `navigateByUrl` | Run the tests. If any fail, await `fixture.whenStable()` before asserting. |
| `TestBed` fake `PlatformLocation` (Navigation API)                                                                                                    | Possibly (tests only)                    | Run the tests. Fallback: provide `MockPlatformLocation`.                   |
| Host-binding type checks are stricter                                                                                                                 | Unlikely (no host bindings found)        | Build will tell; fallback `typeCheckHostBindings: false`                   |
| Removed: `moduleId`, `interpolation`, `NgModuleFactory`, `ApplicationConfig` from platform-browser, `UpgradeAdapter`, `ignoreChangesOutsideZone`      | **No** (none found in `src/`)            | —                                                                          |
| CLI: Less `javascriptEnabled` removed; no auto-detect of `cnpm`                                                                                       | No                                       | —                                                                          |
| Firebase 12: Vertex AI / AI API removals; Node ≥ 20                                                                                                   | No (AI not used; Node 24)                | —                                                                          |

**Risk overall: low to moderate.** It's a single major version step, with automatic migrations and no removed APIs in use. The main things to watch are test timing and the Firebase 11 → 12 major bump.

## 5. Execution steps

### Step 0: Branch and baseline

```sh
git checkout main && git pull --ff-only
git checkout -b chore/angular-21-upgrade
rm -rf node_modules && npm ci
npm run build && npm test && npm run lint     # record the baseline
npm audit                                     # record the baseline count
```

### Step 1: Remove the unused `angular-cli-ghpages`

```sh
npm uninstall angular-cli-ghpages
```

This removes a peer-dependency blocker and its vulnerable dependencies (`basic-ftp`, etc.).

### Step 2: Framework + CLI → 21 (runs the official migrations)

```sh
npx ng update @angular/core@21 @angular/cli@21
```

- Review each migration it applies. In particular, expect `provideZoneChangeDetection` to be added to `AppModule`.
- Commit the migrations as their own commit, so they're easy to review.
- If `ng update` offers the **application builder** (esbuild) migration, **decline it for now**. It's Step 6.

### Step 3: Firebase stack → @angular/fire 21 + firebase 12

```sh
npx ng update @angular/fire@21     # or: npm install @angular/fire@^21 firebase@^12.18
```

Then check the Firebase imports in `app.module.ts` and `website-content.service.ts` still compile.

### Step 4: Lint tooling → angular-eslint 21

```sh
npx ng update @angular-eslint/schematics@21
```

`@typescript-eslint` 8.x and eslint 9.x are already compatible.

### Step 5: Validate

| Check                           | Command / action                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Clean install                   | `rm -rf node_modules && npm ci` (no `--force` / `--legacy-peer-deps`)                                           |
| Builds                          | `npm run build`, `npm run build:prod`                                                                           |
| Unit tests                      | `npm test` (Karma, ChromeHeadlessCI), with all tests passing                                                    |
| Lint                            | `npm run lint`                                                                                                  |
| Security                        | `npm audit`: compare against the baseline; Angular alerts should be gone                                        |
| Manual smoke test (`npm start`) | Home page, team cards (photos, "Read more"), services, insurance, contact, footer                               |
| CMS smoke test (`/cms`)         | Google sign-in with the editor account, edit a staff member, photo upload (Storage), save (Firestore), sign out |
| Deploy preview                  | Check the Firebase preview channel / CI before merging                                                          |

### Step 6: Optional, separate PRs after 21 lands

1. **Switch to the esbuild `application` builder** (`npx ng update @angular/cli --name use-application-builder`). Faster builds, and it **drops webpack-dev-server, webpack-dev-middleware, http-proxy-middleware, babel, etc.** Most of the remaining `npm audit` findings come from these. Karma tests need `@angular/build:karma`.
2. **Control-flow migration**: `ng generate @angular/core:control-flow` converts the 26 `*ngIf` / `*ngFor` to `@if` / `@for`, ahead of their removal.
3. **Angular 22**, once `@angular/fire` 22 is **stable**. Also bump TypeScript to 6.0.x and Node to ≥ 24.15 locally (CI's `24.x` already resolves to a new enough version).
4. _(Optional)_ Karma → Vitest, the default for new Angular projects.

### Rollback

Every step is its own commit on the branch. If Step 3 (Firebase 12) causes runtime problems in the CMS, revert that commit and ship Angular 21 with `@angular/fire` 20.1.1. Its peer range is `^20.0.0` only, though, so check that combination with a clean `npm ci` first; otherwise Firebase has to move together with Angular.

**Fallback if 21 can't land before 2026-11-28:** ship a lockstep **20.3.35** patch (`ng update @angular/core@20 @angular/cli@20`) right away. That clears the current Angular alerts with almost no risk. Then do 21.

---

## 6. Dependabot PRs and alerts affected

| Item                                                        | Outcome                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #118, #114, #104, #103 (Angular framework, failed lockstep) | Superseded by the upgrade. Close after merge.                                                                                                                                                                                                                                                                                                  |
| #94 (`@angular/cli` 20.3.34 + `@hono/node-server`)          | Superseded. Close after merge.                                                                                                                                                                                                                                                                                                                 |
| #116 (`@angular/cli` 22)                                    | Stays blocked (see Section 3). Close and wait for Angular 22.                                                                                                                                                                                                                                                                                  |
| `@modelcontextprotocol/sdk` alerts (via `@angular/cli`)     | Re-check after the upgrade. If CLI 21 still pins a vulnerable version, add an `overrides` entry `^1.32.0`.                                                                                                                                                                                                                                     |
| **`@grpc/grpc-js` (#66) / `protobufjs`**                    | **Not fixed by any Firebase release.** firebase 12.19 _and_ 13.3 both pin `~1.9`. Firestore loads grpc-js only in its **Node.js** build (`main: index.node.cjs.js`); the browser build this site ships (`browser: index.esm.js`) doesn't. **Recommendation:** dismiss these alerts as _"vulnerable code is not actually used"_, and close #66. |

## 7. Open questions for the reviewer

1. Go straight to **21** (recommended), or ship the **20.3.35** patch first as a quick security fix?
2. Do Steps 1–5 as **one PR** with one commit per step (recommended), or split the Firebase 12 bump into its own PR?
3. Should the esbuild builder migration (Step 6.1) be included in this PR? It clears most of the remaining audit findings but changes the build pipeline.
4. Dismiss the `@grpc/grpc-js` / `protobufjs` alerts as not reachable in the browser build?
