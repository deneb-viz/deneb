# Migrate off tsup (#750) + byte-faithful packaging revert — requirements

- **Date:** 2026-09-14
- **Issues:** #750 (tsup is no longer maintained); a new issue to be opened
  for the packaging-revert defect (see PR A)
- **Status:** Approved design; awaiting implementation plans
- **Merge target:** `main`, as two sequential PRs

## Goal

Retire the unmaintained `tsup` from the two packages that use it
(`@deneb-viz/app-core`, `@deneb-viz/json-processing`) by migrating to
`tsdown`, its officially recommended successor — and, first, fix the
long-standing cosmetic defect where the custom packaging script's cleanup
re-formats the JSON files it restores.

## Scope

**In scope:**

- **PR A** (`fix/package-custom-revert-bytes`): byte-faithful revert in
  `apps/deneb/bin/package-custom.ts`.
- **PR B** (`chore/750-tsdown`): tsdown migration of `app-core` and
  `json-processing` (four config files, the packages' scripts, dependency
  swap incl. removing `tsup` from the root).

**Out of scope:** the seven plain-`tsc` packages (including
`powerbi-compat`, whose tsc/const-enum setup is load-bearing and untouched);
any change to the webpack toolchain in `apps/deneb`; any change to package
public APIs or `exports` maps.

## PR A — byte-faithful packaging revert

**Defect:** `package-custom.ts` patches `pbiviz.json`,
`config/features.json` and `capabilities.json` for alpha/beta/standalone
builds, then "reverts" them by writing `JSON.stringify(parsedOriginal,
null, 4)`. That expands inline-formatted objects and drops the trailing
newline, leaving the three files cosmetically modified in `git status`
after every custom package build.

**Fix:** capture each file's raw string content (`readFileSync(..., 'utf8')`)
at startup alongside the parsed copies (which the patching logic keeps
using unchanged), and have `cleanup()` write those exact strings back
verbatim. The transient patched writes keep using `JSON.stringify` — only
the revert path changes.

**Acceptance:** run `npm run package-alpha`; afterwards `git status` shows
no modifications to the three files (this is the exact symptom, now the
check). Existing test suite green. A brief public issue is opened first and
referenced by the PR.

## PR B — tsdown migration (#750)

### Approach

`tsdown` (Rolldown-based, maintained by the rolldown/Vite ecosystem) is the
official tsup migration target and covers every feature the two packages
use. Alternatives considered and rejected: source-shaped `tsc` output
(pushes worker-inlining and PNG handling into every consumer, including the
Vite-based web-client-sample, and reshapes the editor-entry story ahead of
work that depends on it); hand-rolled rollup/unbuild (same engine family as
tsdown with far more config to own).

### Migration mechanics

1. Two-stage, per upstream guidance: run `npx tsdown-migrate` against
   `packages/app-core` and `packages/json-processing`; build cleanly with
   **zero deprecation warnings on tsdown v0.22.14** (the last version
   accepting deprecated tsup-compatible options); then upgrade to the
   latest tsdown. Pin the version exactly (pre-1.0 dependency; syncpack
   keeps both packages aligned).
2. Config translation, per file:
   - Entries, `format: ['esm']`, `dts`, `define`, `sourcemap`, `target`,
     `minify` carry over.
   - `external` arrays → `deps.neverBundle` (regex forms where tsup used
     wildcards). The externals sets are behaviour-critical (they protect
     the `powerbi-compat` singleton and keep Monaco/Fluent out of shared
     chunks) and must be equivalent.
   - Worker configs stay IIFE; output filenames pinned to the current
     `<name>.worker.js` shape (tsdown default emits `.iife.js`) via
     `outputOptions.entryFileNames`, so
     `app-core/src/lib/monaco/monaco-integration.ts`'s
     `dist/worker/json-language.worker.js` import keeps resolving.
   - The esbuild `raw` text-loader plugin (imports built worker JS as a
     string) is ported to a small Rolldown plugin, duplicated in both
     configs exactly as the esbuild version is today.
   - app-core's `loader: { '.png': 'dataurl' }` uses tsdown's built-in
     asset handling if it produces data URLs; otherwise the same
     inline-plugin pattern.
   - Dev watchers: `tsup --watch` → `tsdown --watch` in the two packages'
     `dev:*` scripts.
3. Dependency swap: `tsup` removed from both packages **and the root**
   `devDependencies`; `tsdown` added to the two packages.

### Accepted behavioural delta

`json-processing` currently sets `splitting: false`; tsdown cannot disable
splitting, so its dist may gain shared chunks. Consumers are unaffected
(the `exports` map and externals are unchanged; chunks are internal
relative imports).

### Proof (acceptance criteria)

`content.js` **differs by design** in this PR (different bundler codegen) —
the module-ID equivalence flag does not apply. The bar is:

1. Parity tool: `capabilities`, all locales, `content.css`,
   `content.iconBase64` and `metadata` strict-PASS against a pre-change
   baseline (only `content.js` may DIFF).
2. Full test suite green — including `package-singleton-contract`, which
   guards the peer/external declarations protecting the runtime singletons.
3. `npm run build` (all workspaces — covers the Vite web-client-sample
   consuming the new dist shapes).
4. `npm run dev` smoke: dev server boots; editor loads; workers function
   (JSON language worker + spec-processing worker).
5. `webpack:analyze` before/after: no material `visual.js` size growth.
6. `npm run ci:local` all green.
7. Optional belt-and-braces: maintainer Desktop check of an alpha build
   (worker behaviour in the packaged visual).

### Sequencing

PR A first (independent, tiny). PR B on `chore/750-tsdown` after PR A
merges. The parity baseline for PR B is captured on the post-PR-A `main`.

## Risks addressed by design

- Worker filename drift breaking the dist import → pinned output filenames
  plus the dev smoke test.
- Externals drift collapsing a runtime singleton → equivalent
  `deps.neverBundle` sets plus the singleton-contract invariant.
- Silent option loss in the tsup→tsdown translation → the two-stage
  migration (zero deprecation warnings on v0.22.14 before upgrading).
- Bundle regression in the packaged visual → parity tool non-JS parts +
  size comparison.
