# Move the root visual into `apps/deneb` — requirements

- **Date:** 2026-08-26
- **Issue:** #757 (initial, purely structural move; script rationalization is a
  separate follow-up)
- **Status:** Approved design; awaiting implementation plan
- **Merge target:** `main`, after the pending release cut and the currently open
  PRs have landed

## Goal

Relocate the Power BI visual from the repository root into a dedicated
workspace app at `apps/deneb`, completing the monorepo shape already in use
(`apps/` for deployable targets, `packages/` for shared libraries), with **no
behavioural change** — proven by content-identical packaged output. Certification
requirements for the repository, files and commands (see the links in #757)
must continue to be met at the repository root.

## Scope

**In scope (PR 1):** a lift-and-shift of the visual tree plus the path/config
fixes that keep every existing entry point working, tooling coverage for the new
location, CI path updates, documentation path updates, and a reusable
package-parity verification tool.

**Out of scope:** rationalizing the root npm scripts (PR 2 — the same script
names keep working through delegation for now); extracting shared code into
packages (tracked separately); any behavioural change.

## Design

### 1. What moves, what stays

Moved with `git mv` (history preserved) into `apps/deneb/`: `src/`,
`pbiviz.json`, `capabilities.json`, `style/`, `assets/`, `stringResources/`,
`config/` (its only consumer is `src/lib/dataset/drilldown.ts`, so the relative
import is unchanged), `webpack.common|dev|prod.config.js`, `tsconfig.json`,
`tsconfig.webpack.json`, `tsconfig.build-scripts.json`, and the visual-specific
`bin/` scripts (`package-custom.ts`, `dev-with-prime.js`, `ensure-env.ts`,
`validate-config-for-commit.ts`, `config-validation.ts` + its `__test__`).
`vitest.root.config.ts` becomes `apps/deneb/vitest.config.ts`. `.tmp/` and
`dist/` relocate under the app; the `.gitignore` patterns are unanchored and
keep working.

Stays at root: `package.json` (workspace orchestration + delegating shims +
certification-required tooling), `turbo.json`, `eslint.config.mjs`, `.env*`,
`.github/`, `bin/workspace-eslint.js`, `bin/sync-package-metadata.ts`,
`bin/ci-local.js`, `.syncpackrc`, `docs/`, `.claude/`.

Deleted explicitly, in its own commit: the dead `webpack.config.js` (it requires
a file that does not exist; only ESLint touches it).

### 2. Package identity and scripts

`apps/deneb/package.json`: `name: "@deneb-viz/deneb"`, `private: true`, the
visual's scripts moved verbatim (`package`, `dev`, `dev-with-prime`,
`build:package`, `package-*`, `package:*`, `webpack:*`, `ensure-env`,
`validate-config-for-commit`, `test` (formerly `test:root`), `prettier-*`), and
the devDependencies only the visual needs (moved, not duplicated).

Root `package.json` is renamed to a workspace name (`@deneb-viz/monorepo`,
private) and keeps the workspace scripts (`build`, `test`, `eslint`, `bench*`,
`sync-*`, `ci:local`) plus **delegating shims** for every entry point an
external caller uses today — `package`, `dev`, `package-alpha|beta|standalone`,
`validate-config-for-commit`, `webpack:build|package|analyze` → `npm run <script>
-w @deneb-viz/deneb`. The certification requirements at the repository root
(TypeScript, ESLint and `eslint-plugin-powerbi-visuals` present, the prescribed
lint script, `npm run package` as the sanctioned custom build command) remain
satisfied; the exact wording of the prescribed lint script is verified against
the Microsoft requirement pages during planning.

### 3. Working directory and environment

Every visual script runs with `cwd = apps/deneb` (npm workspace invocation does
this naturally). This is load-bearing: the packaging plugin resolves
`stringResources/` and `assets/icon.png` from `process.cwd()`, so a root-cwd
invocation would *succeed* while shipping an English-only, icon-less package.
The three root-cwd callers are handled: `dev-with-prime.js` moves with the app
(clears `apps/deneb/.tmp`, runs `turbo run dev webpack:start
--filter=@deneb-viz/deneb`); `bin/ci-local.js` calls root shims, which
delegate; the pre-PR hook calls `ci:local` and is unchanged.

`.env`, `.env.ci`, `.env.example`, `.env.standalone` stay at the root (one
development environment for all apps; `apps/web-client-sample` already reaches
up for it). `webpack.common.config.js`, `ensure-env.ts` and
`validate-config-for-commit.ts` resolve them through a `REPO_ROOT =
path.resolve(__dirname, '../..')` constant. CI's `cp .env.ci .env` is unchanged.

The `ajv` alias becomes `REPO_ROOT/packages/app-core/node_modules/ajv` **and**
gains an existence check that fails the build loudly — it points at an npm
hoisting artifact, and adding a workspace is exactly the kind of change that
can reshuffle hoisting and silently swap ajv 8 for the root's ajv 6.

### 4. Tooling coverage

- **ESLint:** `apps/deneb/eslint.config.js` with `eslint-plugin-powerbi-visuals`
  `recommended` (mirroring the current root config for the moved files) and an
  `eslint` script, so turbo's `eslint` task covers the app. Root
  `eslint.config.mjs` keeps the plugin for remaining root files. The
  `package-lint-coverage` invariant test is extended to `apps/*`. Acceptance:
  the lint file count over the visual's sources is unchanged (155 today).
- **Vitest:** `apps/deneb/vitest.config.ts` with the moved globs; `turbo.json`
  replaces `//#test:root` and the `//#webpack:*` root tasks with app tasks and
  rewires `test.dependsOn` (otherwise root `test` silently no-ops).
- **Invariant tests:** `_packages.ts` gains `APP_ROOT` beside `REPO_ROOT`;
  `certification-and-build-invariants` reads the app's `package.json`,
  `src/index.ts` and `bin/dev-with-prime.js` from their new homes;
  `settings-resource-keys` is re-anchored (it spans app and packages).
- **Prettier and syncpack:** prettier globs and `.syncpackrc.source` gain
  `apps/*`; `sync-package-metadata.ts` iterates `apps/*` too.

### 5. CI

`npm run package` / `npm run package-${channel}` keep working through the root
shims. The two hardcoded `dist/` paths in `ci.yml` (`mv dist/…*.pbiviz` on
release and the release asset path) become `apps/deneb/dist/…`; because they
only execute on tag pushes, the `mv` glob is dry-run locally before merge.

### 6. Parity proof (acceptance criterion)

A permanent tool, `bin/verify-package-parity.ts` (root): given two `.pbiviz`
files, unzip both and compare per-part hashes — `content.js`, `content.css`,
`content.iconBase64`, `capabilities`, sorted locale keys plus per-locale value
hashes, and the `visual.*` / `author` / `apiVersion` / `style` / `dependencies`
metadata — reporting exactly which part differs. Byte-level comparison is not
possible (the zip stamps wall-clock entry times), so content-level is the bar.

Procedure: capture a baseline with the certified `npm run package` on the
pre-move commit (the certified path does not patch the version; alpha/beta do,
and change the filename), build after the move, run the tool, include its
report in the PR. The tool inherently catches the `ajv` hoisting swap and the
locale/icon cwd traps, since each changes a part hash.

### 7. Docs and sequencing

Docs updated in the same PR: `CLAUDE.md`, `docs/DEVELOPMENT.md`,
`docs/WEBPACK-OPTIMIZATIONS.md` (relative links), `CONTRIBUTING.md`.

Commit sequence, each independently reviewable: (1) parity tool + baseline
capture; (2) pure `git mv`; (3) path fixes in webpack/tsconfig/bin; (4) tooling
coverage; (5) CI + docs; (6) delete dead `webpack.config.js`; (7) parity report.

Branch: `chore/757-apps-deneb` off `main`.

## Risks addressed by design

Silent regressions the move could introduce, and where each is caught: locale/
icon loss from a root cwd (§3, §6); `.env` split from the build (§3);
`src/` falling out of the certification lint gate (§4); `ajv` hoisting swap
(§3, §6); release-only CI path breakage (§5); invariant tests asserting on
moved paths (§4); turbo root tasks becoming vacuous (§4); prettier/syncpack
coverage shrinking (§4).
