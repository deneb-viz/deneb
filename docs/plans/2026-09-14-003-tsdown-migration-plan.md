# tsup → tsdown Migration Implementation Plan (#750)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `@deneb-viz/app-core` and `@deneb-viz/json-processing` — the only two tsup consumers — to tsdown, removing the unmaintained tsup from the repo entirely.

**Architecture:** Two-stage migration per upstream guidance: run `tsdown-migrate` scoped to the two packages, land on tsdown **0.22.14** (the last version accepting deprecated tsup-compatible options) and build with **zero deprecation warnings**; then bump to **0.23.0** (exact pin, pre-1.0 dependency). Two hand-ported pieces: the esbuild `raw` worker-text loader becomes a Rolldown `load`-hook plugin, and worker IIFE output filenames are pinned to the current `<name>.worker.js` shape. Everything else the migrator translates is verified against a fixed invariant checklist rather than pre-written config text (the migrator's output is authoritative; the invariants are the contract).

**Tech Stack:** tsdown 0.22.14 → 0.23.0 (Rolldown), npm workspaces, turbo, Vitest, `bin/verify-package-parity.ts`.

**Spec:** [docs/brainstorms/2026-09-14-tsup-migration-and-package-revert-requirements.md](../brainstorms/2026-09-14-tsup-migration-and-package-revert-requirements.md) (PR B section)

---

## Preconditions

- Branch `chore/750-tsdown` off `main` at 5838d2f2 (post-PR-A). Clean tree, `npm install` current.
- Commits: (1) stage-1 migration on 0.22.14 (configs, scripts, deps incl. root tsup removal); (2) stage-2 bump to 0.23.0. Verification evidence goes in the PR body.
- Current state, verified 2026-09-14: both packages have `build:package: "tsup"`, `build:worker: "tsup --config tsup.worker.config.ts"`, `dev:package: "tsup --watch --config tsup.config.ts"`, `dev:worker: "tsup --watch --config tsup.worker.config.ts"`, and `tsup: "^8.5.0"` in devDependencies. Root also carries `tsup ^8.5.0`.
- The consumer contract that must survive unchanged: each package's `exports` map entries resolve; `dist/worker/json-language.worker.js` and `dist/worker/data-viewer.worker.js` (app-core) and `dist/worker/spec-processing.worker.js` (json-processing) exist under those exact names (`packages/app-core/src/lib/monaco/monaco-integration.ts:123` imports one of them by literal path); externals stay out of the bundles.

### Task 1: Baseline capture (no commit)

- [ ] **Step 1: Certified baseline package** (PowerShell)

```powershell
Copy-Item .env .env.backup
Copy-Item .env.ci .env
npm run package
$rc = $LASTEXITCODE
Copy-Item .env.backup .env; Remove-Item .env.backup
if ($rc -ne 0) { throw "package failed" }
Copy-Item apps/deneb/dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.*.pbiviz dist/baseline-pre-tsdown.pbiviz
(Get-Item apps/deneb/.tmp/drop/visual.js).Length
```

Expected: build exit 0; baseline artifact copied; record the `visual.js` byte size (the size-comparison reference; it was 7,527,xxx-ish ≈ 7.18 MiB at last build).

- [ ] **Step 2: Record the two packages' current dist inventories**

```powershell
Get-ChildItem -Recurse packages/app-core/dist, packages/json-processing/dist | Where-Object {! $_.PSIsContainer} | ForEach-Object { $_.FullName.Replace((Get-Location).Path + '\', '') } | Sort-Object > "$env:TEMP\dist-inventory-before.txt"
Get-Content "$env:TEMP\dist-inventory-before.txt" | Measure-Object -Line
```

Expected: a saved listing (used in Task 4 to check nothing the `exports` maps or worker imports need has vanished — extra chunk files appearing is fine).

---

### Task 2: Stage-1 migration on tsdown 0.22.14 — commit 1

**Files:**
- Modify: `packages/app-core/package.json`, `packages/json-processing/package.json` (scripts + devDependencies)
- Modify/Rename: `packages/app-core/tsup.config.ts`, `packages/app-core/tsup.worker.config.ts`, `packages/json-processing/tsup.config.ts`, `packages/json-processing/tsup.worker.config.ts` (the migrator typically renames to `tsdown*.config.ts` — follow its output)
- Modify: `package.json` (root — remove `tsup` devDependency), `package-lock.json`

- [ ] **Step 1: Dry-run the migrator and review**

```bash
npx tsdown-migrate@latest packages/app-core packages/json-processing --dry-run
```

Read the preview. Expected: it proposes config/script rewrites for exactly the two packages. If it proposes touching anything outside them, STOP and report.

- [ ] **Step 2: Run it for real (no auto-install; deps are managed manually in a workspace)**

```bash
npx tsdown-migrate@latest packages/app-core packages/json-processing --yes --no-install
```

Then, in BOTH `packages/app-core/package.json` and `packages/json-processing/package.json`: ensure every former tsup script now invokes `tsdown` (build:package, build:worker, dev:package, dev:worker — with the same `--watch`/`--config` shapes, config filenames matching whatever the migrator produced), replace the `tsup` devDependency with `"tsdown": "0.22.14"` (exact pin, no caret — syncpack's `@deneb-viz` rules don't cover it, so both packages must match by hand). Remove `"tsup": "^8.5.0"` from the ROOT `package.json` devDependencies. Run `npm install` (exit 0; lockfile gains tsdown, drops tsup).

- [ ] **Step 3: Port the raw worker-text loader in both main configs**

The esbuild plugin (`esbuildPlugins` with the `raw` onLoad hook) does not translate automatically. In BOTH main configs (app-core and json-processing), replace it with this Rolldown-compatible plugin (in the tsdown `plugins` array):

```ts
const rawWorkerText = {
    name: 'raw-worker-text',
    // Import built worker JS as a raw string (the esbuild version used the
    // 'text' loader). Matches dist/worker/*.worker.js files only.
    load(id: string) {
        if (/[\\/]worker[\\/].*\.worker\.js$/.test(id)) {
            return `export default ${JSON.stringify(
                fs.readFileSync(id, 'utf8')
            )};`;
        }
        return null;
    }
};
```

(`import fs from 'fs';` is already present in both files.)

- [ ] **Step 4: Pin worker output filenames in both worker configs**

tsdown's IIFE output defaults to `[name].iife.js`; the current contract is `[name].worker.js` (tsup's `outExtension` did this). In BOTH worker configs, replace the `outExtension`/`outExtensions` mechanism with:

```ts
    outputOptions: {
        entryFileNames: '[name].worker.js'
    }
```

- [ ] **Step 5: PNG loader decision (app-core main config only)**

The config has `loader: { '.png': 'dataurl' }`. Build once (Step 6): if tsdown 0.22.14 accepts it without a deprecation warning AND Task 4's dist check shows PNG imports still resolve to `data:image/png;base64,...` strings, keep it. Otherwise replace with this plugin beside `rawWorkerText`:

```ts
const pngDataUrl = {
    name: 'png-dataurl',
    load(id: string) {
        if (id.endsWith('.png')) {
            const base64 = fs.readFileSync(id).toString('base64');
            return `export default "data:image/png;base64,${base64}";`;
        }
        return null;
    }
};
```

Verify which path was taken and record it for the PR body. Quick check that data URLs made it into the output: `grep -c "data:image/png;base64" packages/app-core/dist/*.js` (bash) — expected ≥ 1 (the catalog thumbnails).

- [ ] **Step 6: Build to zero deprecation warnings**

```bash
npm run build -w @deneb-viz/app-core 2>&1 | grep -i -E "deprecat|warn" ; npm run build -w @deneb-viz/json-processing 2>&1 | grep -i -E "deprecat|warn"
```

Iterate on the configs until BOTH builds complete with **zero tsdown deprecation warnings** (this is the upstream stage-1 exit criterion). Config-translation invariants to hold while iterating:
- Entries unchanged (app-core: `src/index.ts` + `src/editor.ts`; json-processing: the 4 entries; workers: same named entries).
- `format` esm (main) / iife (workers); `dts` on for main configs; `define: { global: 'globalThis' }` kept (app-core); sourcemaps on.
- Every `external` entry survives as an equivalent `deps.neverBundle` (or still-accepted `external`) member — the sets protect the powerbi-compat/vega-runtime singletons and keep Monaco/Fluent out of app-core's chunks. Wildcard strings like `'@deneb-viz/powerbi-compat/*'` become regexes (e.g. `/^@deneb-viz\/powerbi-compat(\/|$)/`) if the migrator didn't convert them.
- json-processing's `splitting: false` is dropped (tsdown: always on) — expected, do not try to preserve it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: migrate app-core and json-processing to tsdown 0.22.14 (#750)

Stage 1 of the two-stage migration: tsdown-migrate output plus hand
ports of the raw worker-text loader (Rolldown load-hook plugin) and
the worker output filename contract ([name].worker.js). Builds are
clean of deprecation warnings, which is the upstream exit criterion
for this stage. tsup is removed from the two packages and the root.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Stage-2 bump to 0.23.0 — commit 2

- [ ] **Step 1: Bump both packages**

In both packages' `package.json`: `"tsdown": "0.22.14"` → `"tsdown": "0.23.0"`. Run `npm install`, then rebuild both packages (same commands as Task 2 Step 6). Expected: clean builds, no warnings, no errors — if 0.23.0 rejects an option that 0.22.14 accepted silently, fix the config (that's the point of the staging) and note it.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: bump tsdown to 0.23.0 (#750)

Stage 2: with the configs clean of deprecated options on 0.22.14, the
upgrade to the current release is a version bump.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Verification battery, PR

- [ ] **Step 1: Dist contract check**

```powershell
Get-ChildItem -Recurse packages/app-core/dist, packages/json-processing/dist | Where-Object {! $_.PSIsContainer} | ForEach-Object { $_.FullName.Replace((Get-Location).Path + '\', '') } | Sort-Object > "$env:TEMP\dist-inventory-after.txt"
```

Compare with the Task 1 inventory (bash: `diff "$TEMP/dist-inventory-before.txt" "$TEMP/dist-inventory-after.txt"`). Required: every file named by the two packages' `exports` maps and the three `dist/worker/*.worker.js` files still exist under the same paths. New chunk files (including in json-processing, which lost `splitting: false`) are expected and fine; renamed/missing contract files are failures.

Also confirm no `.iife.js` files exist: `ls packages/*/dist/worker/` shows only `*.worker.js` (+ sourcemaps).

- [ ] **Step 2: Externals stayed external**

```bash
grep -l "from *['\"]@deneb-viz/powerbi-compat" packages/app-core/dist/*.js packages/json-processing/dist/*.js | head -5
grep -c "createStore\|zustand" packages/json-processing/dist/index.js || true
```

Expected: the import statements for `@deneb-viz/powerbi-compat` (and for app-core: `@deneb-viz/vega-runtime`, `monaco-editor`, `@fluentui/`) appear as bare external imports in the dist files rather than being inlined. Any externalized package's source appearing inlined in a dist file is a failure. (The `package-singleton-contract` invariant test in Step 3 is the systematic guard; this is a direct spot check.)

- [ ] **Step 3: Full build + full suite**

Run: `npm run build` (ALL workspaces — includes web-client-sample consuming the new dists via Vite). Expected: exit 0.
Run: `npm run test`. Expected: all green, including `package-singleton-contract`.

- [ ] **Step 4: Dev smoke**

Run `npm run dev` in the background; wait for webpack to report a successful compile and the dev server listening on 8080; then stop it. Expected: packages build under tsdown watch orchestration, prime succeeds, server compiles. (Interactive editor/worker verification in Power BI is the maintainer's optional Desktop check per the spec.)

- [ ] **Step 5: Package parity (non-JS parts) + size**

Same env-swap build as Task 1 Step 1, then:

```powershell
npm run verify-package-parity -- dist/baseline-pre-tsdown.pbiviz (Get-Item apps/deneb/dist/deneb7E15AEF80B9E4D4F8E12924291ECE89A.*.pbiviz).FullName
(Get-Item apps/deneb/.tmp/drop/visual.js).Length
```

Expected: exit 1 with `content.js` DIFF **only** — `capabilities`, `content.css`, `content.iconBase64`, every locale, and `metadata` must PASS (a DIFF in any of those is a real regression). `visual.js` size within a few percent of the Task 1 baseline (record both numbers; investigate anything beyond ~5% growth before proceeding).

- [ ] **Step 6: Full local CI**

Run: `npm run ci:local`. Expected: ALL CHECKS PASSED.

- [ ] **Step 7: Push and raise the PR**

```bash
git push -u origin chore/750-tsdown
gh pr create --base main --title "chore: migrate off tsup to tsdown (#750)" --body-file <body>
```

PR body: closes #750; the two-stage story; the two hand-ported pieces (raw plugin, worker filenames) and the PNG decision; the accepted json-processing splitting delta; the parity report (content.js DIFF by design, everything else PASS) + size numbers; test/build/CI results; note the optional Desktop check. End with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Deliberate simplifications

- Config content beyond the two hand-ported pieces is verified by invariants, not pre-written — the migrator's output is authoritative and second-guessing it line-by-line in the plan invites drift.
- The raw/PNG plugins are duplicated per config (matching today's esbuild-plugin duplication); no shared build-config package for ~15 lines.
- No attempt to preserve `splitting: false` in json-processing (tsdown cannot; consumers are chunk-agnostic).

## Risks → where caught

| Risk | Caught by |
|---|---|
| Worker filename drift breaking the monaco dist import | Task 2 Step 4 pin + Task 4 Step 1 contract check + build failure of app-core itself |
| Externals drift collapsing a singleton | Task 4 Step 2 spot check + `package-singleton-contract` in the suite |
| Silent option loss in translation | Two-stage process (zero warnings on 0.22.14 before the bump) |
| PNG imports silently becoming file refs | Task 2 Step 5 data-URL grep |
| Vite consumer breakage | `npm run build` all-workspaces (Task 4 Step 3) |
| Packaged-visual regression | Parity non-JS parts + size comparison (Task 4 Step 5) + ci:local |
