# Root npm Script Rationalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the three root delegating shims nothing calls (`webpack:build`, `webpack:package`, `build:package`), update the docs to match, and add an invariant canary guarding the certification-required root surface — with strict content-level package parity as the proof of zero packaging change.

**Architecture:** Root `package.json` keeps every certification/CI/human entry point byte-identical and loses only the three caller-less shims; docs point niche commands at the `-w @deneb-viz/deneb` form. A new ~20-line Vitest canary beside the existing invariants asserts the MS certification file requirements on the root manifest. Since no build input changes, the pre/post `.pbiviz` comparison must pass the parity tool **strictly** (no `--expect-module-id-renumbering` flag).

**Tech Stack:** npm workspaces, Vitest (existing invariants pattern), `bin/verify-package-parity.ts`.

**Spec:** [docs/brainstorms/2026-09-14-root-script-rationalization-requirements.md](../brainstorms/2026-09-14-root-script-rationalization-requirements.md)

---

## Preconditions

- Branch `chore/757-scripts` off current `main`, spec committed (20364a80). Working tree clean, `npm install` current.
- Commits: (1) script removals + docs; (2) invariant canary. Parity report goes in the PR body.
- The app's own `webpack:build` / `webpack:package` / `build:package` scripts in `apps/deneb/package.json`, and the `webpack:build` / `webpack:package` task definitions in `turbo.json`, are **not** touched — only the ROOT shims go.

### Task 1: Capture the strict-parity baseline (no commit)

- [ ] **Step 1: Certified baseline build** (PowerShell; the swap mirrors `ci:local` so dev `.env` values can't block the cert gate)

```powershell
Copy-Item .env .env.backup
Copy-Item .env.ci .env
npm run package
$rc = $LASTEXITCODE
Copy-Item .env.backup .env; Remove-Item .env.backup
if ($rc -ne 0) { throw "package failed" }
New-Item -ItemType Directory -Force dist | Out-Null
Copy-Item apps/deneb/dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.*.pbiviz dist/baseline-pre-scripts.pbiviz
```

Expected: build exit 0; `dist/baseline-pre-scripts.pbiviz` exists (root `dist/` is untracked scratch — fine).

- [ ] **Step 2: Baseline self-check**

Run: `npm run verify-package-parity -- dist/baseline-pre-scripts.pbiviz dist/baseline-pre-scripts.pbiviz`
Expected: every part PASS, `RESULT: PARITY OK`, exit 0.

---

### Task 2: Remove the three root shims + update docs — commit 1

**Files:**
- Modify: `package.json` (root — three script lines removed, nothing else)
- Modify: `CLAUDE.md:19`, `CLAUDE.md:276`
- Modify: `CONTRIBUTING.md:79`
- Modify: `docs/DEVELOPMENT.md` (§3 Scripts Reference rewrite; troubleshooting row ~line 476)

- [ ] **Step 1: Verify-no-caller sweep (blocking)**

Run each (bash), treating any hit OUTSIDE the files this task edits as a BLOCKER (stop and report — do not remove that script):

```bash
grep -rn "npm run webpack:build\b" --include="*.yml" --include="*.js" --include="*.ts" --include="*.json" --include="*.md" .github/ bin/ apps/ packages/ docs/ .claude/ CLAUDE.md CONTRIBUTING.md package.json
grep -rn "npm run webpack:package\b" --include="*.yml" --include="*.js" --include="*.ts" --include="*.json" --include="*.md" .github/ bin/ apps/ packages/ docs/ .claude/ CLAUDE.md CONTRIBUTING.md package.json
grep -rn "npm run build:package\b" --include="*.yml" --include="*.js" --include="*.ts" --include="*.json" --include="*.md" .github/ bin/ apps/ packages/ docs/ .claude/ CLAUDE.md CONTRIBUTING.md package.json
```

Expected hits, all legitimate (verified at planning time, 2026-09-14):
- `webpack:build`: root `package.json` (the shim being removed), `CLAUDE.md:19`, `CONTRIBUTING.md:79` (both updated below).
- `webpack:package`: root `package.json` (shim being removed), `CLAUDE.md:276` (updated below), `apps/deneb/bin/package-custom.ts:143` (runs with `cwd=apps/deneb` → resolves the APP's script — stays), `docs/DEVELOPMENT.md:350` (describes that same app-context call — stays).
- `build:package`: root `package.json` (shim being removed), `apps/deneb/bin/dev-with-prime.js:67` (app cwd → app's script — stays), `docs/DEVELOPMENT.md:55` (describes that call — stays).

- [ ] **Step 2: Remove the three lines from root `package.json`**

Delete exactly these three entries from `scripts` (leave everything else, including `webpack:analyze`, untouched):

```json
        "build:package": "turbo build --filter=!@deneb-viz/web-client-sample",
        "webpack:build": "npm run webpack:build -w @deneb-viz/deneb",
        "webpack:package": "npm run webpack:package -w @deneb-viz/deneb",
```

Run: `npm run` (bare) — expected: the listing no longer shows `webpack:build`, `webpack:package`, or `build:package`, and still shows `webpack:analyze`, `package`, `dev`, `eslint`.

- [ ] **Step 3: CLAUDE.md edits**

Line 19 — old:

```
npm run webpack:build                # One-off dev build without server
```

new:

```
npm run webpack:build -w @deneb-viz/deneb   # One-off dev build without server
```

Line 276 — old:

```
- **Type errors unnoticed** → Run `npm run webpack:package` or `npx tsc --noEmit`
```

new:

```
- **Type errors unnoticed** → Run `npm run package` or `npx tsc --noEmit`
```

- [ ] **Step 4: CONTRIBUTING.md edit**

Line 79 (inside the "confirm a clean dev build" fence) — old:

```
npm run webpack:build
```

new:

```
npm run webpack:build -w @deneb-viz/deneb
```

- [ ] **Step 5: DEVELOPMENT.md §3 Scripts Reference rewrite**

Replace lines 81–92 (the heading and table, up to but not including `### .env Setup (recommended)`) with:

```markdown
## 3. Scripts Reference

**Script architecture:** the root `package.json` (`@deneb-viz/monorepo`)
carries workspace orchestration (`build`, `test`, `eslint`, `bench*`,
`sync*`, `ci:local`) plus delegating shims for the certification, CI and
day-to-day entry points (`package`, `package-alpha|beta|standalone`,
`validate-config-for-commit`, `dev`, `webpack:analyze`). The visual's own
pipeline lives in `apps/deneb/package.json`; any app script is reachable
from the root via `npm run <script> -w @deneb-viz/deneb`.

Root entry points:

| Script                       | Purpose                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| `dev`                        | Auto-prime assets + parallel package watchers + dev server |
| `package`                    | Certified production package build (validates config)      |
| `webpack:analyze`            | Generates `webpack.statistics.html` (gzip size report)     |
| `validate-config-for-commit` | Feature flag + config guardrail before packaging           |

App scripts (run via `npm run <script> -w @deneb-viz/deneb`):

| Script            | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `webpack:start`   | Dev server only (used by Turbo)                  |
| `webpack:build`   | One-off dev build (no server)                    |
| `webpack:prime`   | One-time build to generate required dev assets   |
| `webpack:package` | Production optimized build + `.pbiviz` packaging |
| `build:package`   | Builds workspace packages (turbo filter)         |
```

- [ ] **Step 6: DEVELOPMENT.md troubleshooting row (~line 476)**

Old:

```
| Type errors unnoticed      | `skipLibCheck` in dev mode               | Run `webpack:package` or `npx tsc --noEmit`                             |
```

new:

```
| Type errors unnoticed      | `skipLibCheck` in dev mode               | Run `npm run package` or `npx tsc --noEmit`                             |
```

(Table column padding may shift — let prettier-style alignment be; the file is not in the prettier glob, so match the surrounding table style by eye.)

- [ ] **Step 7: Residual-reference sweep**

Run (bash): `grep -n "webpack:build\|webpack:package\|build:package" CLAUDE.md CONTRIBUTING.md docs/DEVELOPMENT.md docs/WEBPACK-OPTIMIZATIONS.md`
Expected: only (a) the `-w` forms introduced above, (b) the §3 app-scripts table entries, (c) DEVELOPMENT.md:55 and :350 app-context descriptions, and (d) any `docs/WEBPACK-OPTIMIZATIONS.md` mentions that describe the app's webpack pipeline (they reference the app's scripts/configs, which still exist — leave them). Anything implying a ROOT `npm run webpack:build|webpack:package|build:package` still works is a miss — fix it the same way as above.

- [ ] **Step 8: Format check and commit**

Run: `npx prettier --check package.json CLAUDE.md CONTRIBUTING.md`
Expected: clean (fix with `--write` on those files only if not).

```bash
git add package.json CLAUDE.md CONTRIBUTING.md docs/DEVELOPMENT.md
git commit -m "chore: remove caller-less root script shims (#757)

webpack:build, webpack:package and build:package had no CI, hook or
script callers at the root after the apps/deneb move - the app's own
scripts remain and are reachable via -w @deneb-viz/deneb (docs updated,
including a script-architecture note in the development guide). All
certification, CI and day-to-day entry points are unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Certification root-surface canary — commit 2

**Files:**
- Create: `apps/deneb/src/__test__/invariants/certification-root-surface.test.ts`

- [ ] **Step 1: Write the canary**

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './_packages';

/**
 * Canary: the Microsoft certification file requirements that must hold at
 * the REPOSITORY ROOT (the repo the certification team reviews): an eslint
 * script, the sanctioned `npm run package` build command, and the
 * typescript / eslint / eslint-plugin-powerbi-visuals packages installed.
 * These live in the root manifest, which no other test guards - a
 * well-meaning cleanup could drop one and only fail at submission time.
 */
const rootManifest = JSON.parse(
    readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')
) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
};

describe('certification root surface', () => {
    it('root package.json has an eslint script', () => {
        expect(rootManifest.scripts?.eslint).toBeDefined();
    });

    it('root package.json has the sanctioned package script', () => {
        expect(rootManifest.scripts?.package).toBeDefined();
    });

    it.each(['typescript', 'eslint', 'eslint-plugin-powerbi-visuals'])(
        'root devDependencies contain %s',
        (dependency) => {
            expect(rootManifest.devDependencies?.[dependency]).toBeDefined();
        }
    );
});
```

- [ ] **Step 2: Green run**

Run (from `apps/deneb`): `npx --no vitest run src/__test__/invariants/certification-root-surface.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 3: Red demonstration (canary must actually bite)**

Temporarily rename the root `eslint` script: in root `package.json`, change `"eslint":` to `"eslint-x":`. Re-run the same vitest command.
Expected: `root package.json has an eslint script` FAILS.
Restore: `git checkout -- package.json` (from repo root), re-run, expected: 5 PASS again.

- [ ] **Step 4: Full suite + prettier, commit**

Run: `npm run test` (from root) — expected: all workspaces green, `@deneb-viz/deneb#test` now includes the new file (5 extra tests).
Run: `npx prettier --check apps/deneb/src/__test__/invariants/certification-root-surface.test.ts` — expected clean.

```bash
git add apps/deneb/src/__test__/invariants/certification-root-surface.test.ts
git commit -m "test: canary for the certification-required root surface (#757)

Asserts the root manifest keeps the eslint script, the sanctioned
package script, and the typescript / eslint /
eslint-plugin-powerbi-visuals devDependencies the Microsoft
certification file requirements call for.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Strict parity proof, full CI, PR

- [ ] **Step 1: Post-change certified build** (same env swap as Task 1)

```powershell
Copy-Item .env .env.backup
Copy-Item .env.ci .env
npm run package
$rc = $LASTEXITCODE
Copy-Item .env.backup .env; Remove-Item .env.backup
if ($rc -ne 0) { throw "package failed" }
```

- [ ] **Step 2: STRICT parity — the acceptance criterion**

```powershell
npm run verify-package-parity -- dist/baseline-pre-scripts.pbiviz (Get-Item apps/deneb/dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.*.pbiviz).FullName
```

Expected: **every part PASS including `content.js` (byte-identical — no flag), `RESULT: PARITY OK`, exit 0.** This change touches no build input, so ANY diff — even a content.js module-ID shuffle — is a real regression; do not reach for `--expect-module-id-renumbering`. Save the output for the PR body.

- [ ] **Step 3: Full local CI**

Run: `npm run ci:local`
Expected: ALL CHECKS PASSED (also proves every retained entry point end-to-end — `ci:local`'s steps and the `package` chain call them all).

- [ ] **Step 4: Push and raise the PR**

```bash
git push -u origin chore/757-scripts
gh pr create --base main --title "chore: rationalize root npm scripts (#757)" --body-file <body>
```

PR body: second of two PRs for #757; list the three removals with the no-caller rationale; note what is deliberately kept (`webpack:analyze`, every CI/cert entry point, no renames); the new canary and why; paste the strict parity report verbatim; end with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Deliberate simplifications

- No renames (spec: out of scope — external-caller and muscle-memory risk for zero functional gain).
- The canary reads the manifest once at module scope, matching the existing invariant style (`certification-and-build-invariants.test.ts` does the same).
- `turbo.json`'s `webpack:build`/`webpack:package` task definitions stay: they describe APP tasks (used by `turbo run dev webpack:start`; the others are harmless and may serve future turbo invocations).

## Risks → where caught

| Risk | Caught by |
|---|---|
| Hidden caller of a removed script | Task 2 Step 1 blocking sweep + `ci:local` end-to-end (Task 4 Step 3) |
| Docs still advertising removed root commands | Task 2 Step 7 residual sweep |
| Certification root surface regressing later | Task 3 canary (red demonstration proves it bites) |
| Any packaging change at all | Task 4 Step 2 strict parity (byte-identical bar) |
