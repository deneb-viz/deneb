---
title: feat: Add Vitest benchmarks for dataset processing hot paths
type: feat
status: active
date: 2026-04-16
origin: docs/brainstorms/2026-04-16-performance-benchmarks-requirements.md
---

# feat: Add Vitest benchmarks for dataset processing hot paths

## Overview

Add Vitest `bench`-mode benchmarks targeting `buildDataRow` and `buildProcessingPlan` in `@deneb-viz/data-core`, wire them into Turbo and CI, commit the first baseline, and capture a one-time informational reference from tag `1.9.1.0`. Comparison runs via a custom Node script that reads Vitest's `--outputJson` output and fails when operations-per-second (`hz`) regresses beyond a configurable threshold from the committed baseline. CI rollout is advisory (`continue-on-error: true`) until baseline stability is observed.

## Problem Frame

Deneb processes potentially large datasets (up to 100K+ rows) through a hot path that includes plan building and per-row support field generation. There are no benchmarks to detect performance regressions, and the recent 2.0 refactor introduced the `buildProcessingPlan`/`buildDataRow` split without throughput data confirming the refactor did not regress (see origin: [docs/brainstorms/2026-04-16-performance-benchmarks-requirements.md](../brainstorms/2026-04-16-performance-benchmarks-requirements.md)).

## Requirements Trace

- **R1** — `npm run bench` runs both benchmark suites and reports ops/sec, mean, p75 for all tiers.
- **R2** — CI pipeline includes benchmark step that compares against committed baselines.
- **R3** — Benchmark step fails on regression beyond the configured threshold (default 20% on `hz`).
- **R4** — 1.9 reference numbers captured and stored as `benchmarks/1.9-reference.md` in the 2.0 branch.
- **R5** — 2.0 `buildDataRow` throughput at 10K rows is directionally comparable to 1.9 end-to-end throughput at 10K rows (human-reviewed, not CI-gated).

## Scope Boundaries

- No `getMappedDataset` end-to-end benchmark (deferred — mocking Power BI runtime state is high cost for unclear signal).
- No ongoing benchmark maintenance in the 1.9 branch.
- No real-time performance monitoring or profiling instrumentation.
- No changes to `buildDataRow` or `buildProcessingPlan` implementations in this plan — benchmarks only.

## Context & Research

### Relevant Code and Patterns

- **Benchmark targets** — [packages/data-core/src/lib/support-fields/build-data-row.ts](../../packages/data-core/src/lib/support-fields/build-data-row.ts) and [packages/data-core/src/lib/support-fields/build-processing-plan.ts](../../packages/data-core/src/lib/support-fields/build-processing-plan.ts). Both are documented as pure functions.
- **Types** — `SupportFieldValueProvider`, `ProcessingInstruction` (discriminated union on `kind: 'field' | 'parameter'`), `ProcessingPlan`, `SupportFieldMasterSettings` defined in [packages/data-core/src/lib/support-fields/types.ts](../../packages/data-core/src/lib/support-fields/types.ts).
- **Reusable fixture patterns** — `makeProvider`, `makeInstruction`, `makePlan` in [packages/data-core/src/lib/support-fields/\_\_tests\_\_/build-data-row.test.ts](../../packages/data-core/src/lib/support-fields/__tests__/build-data-row.test.ts); `mockProvider` (pure closures, no `vi.fn`) and `makeParameterInstruction` in [packages/data-core/src/lib/support-fields/\_\_tests\_\_/build-data-row-parameters.test.ts](../../packages/data-core/src/lib/support-fields/__tests__/build-data-row-parameters.test.ts). **Prefer the pure-closure style** for benchmark fixtures — `vi.fn` adds mock-tracking overhead that distorts `hz`.
- **Vitest config convention** — Per-package `vitest.config.ts` with `defineConfig({ test: { ... } })`. See [packages/vega-runtime/vitest.config.ts](../../packages/vega-runtime/vitest.config.ts) and [packages/vega-react/vitest.config.ts](../../packages/vega-react/vitest.config.ts). `data-core` currently has none — it relies on implicit defaults.
- **Test layout convention** — `__tests__` siblings to source directories; `__bench__` siblings fit the same pattern.
- **Turbo task convention** — Existing `test` task in [turbo.json](../../turbo.json) has no `dependsOn`. Plan matches that convention for `bench` (no `dependsOn`) — `data-core` has no workspace deps today, so `^build` would be a no-op that future-maintainers might interpret as implying cache-invalidation guarantees it doesn't provide. Add `dependsOn: ["^build"]` when `data-core` actually gains workspace deps.
- **Root script pattern** — Workspace-wide scripts go through Turbo directly: `"test": "turbo run test"`. Follow the same shape for `bench`.
- **CI workflow** — Single `ci` job on `ubuntu-latest`, Node 22, in [.github/workflows/ci.yml](../../.github/workflows/ci.yml). Step order: checkout → env → setup-node → turbo cache → `npm ci` → `npm run build` → validation → eslint → prettier → `npm run test` → `npm run package`. Natural insertion point: immediately after `Tests` and before `Confirm pbiviz package`.

### Institutional Learnings

- No entries in `docs/solutions/` directly address Vitest config, Turbo orchestration, or benchmarking in this repo — this work enters a corpus gap. Any non-trivial issues encountered during implementation should be documented as new solution entries.
- User memory captures prior CI pain (`MEMORY.md`): lockfileVersion 2→3 drops transitive deps silently, Node 22 required. The 1.9 tag checkout in Unit 7 may hit these — plan for it.

### External References

Vitest 3.2.4 `bench` mode specifics (used across multiple units):

- **Config shape** — `test.benchmark` accepts `include`, `exclude`, `reporters`, `outputJson`, `compare`, `includeSamples`. Per-bench options (`time`, `iterations`, `warmupTime`, `warmupIterations`) are passed as the third argument to individual `bench()` calls, NOT in the config.
- **JSON output structure** — `{ files: [{ filepath, groups: [{ fullName, benchmarks: [{ id, name, rank, rme, hz, mean, min, max, p75, p99, sampleCount, ... }] }] }] }`. The baseline key should be `fullName + ' > ' + name` (separator is ` > `).
- **One-shot CI invocation** — `vitest bench --run` (without `--run`, bench runs in watch mode in TTYs).
- **Known gotchas** — `--reporter=json` crashes for bench mode ([vitest#5953](https://github.com/vitest-dev/vitest/issues/5953)) — must use `outputJson` instead. `includeSamples: true` causes memory issues ([vitest#5349](https://github.com/vitest-dev/vitest/issues/5349)) — keep `false`. Bench mode is still flagged experimental at 3.2.4.
- **Vitest docs:** https://vitest.dev/config/benchmark, https://vitest.dev/guide/features.html#benchmarking

## Key Technical Decisions

- **Comparison metric is `hz` (ops/sec), not absolute time** — hardware-normalized, more stable across CI runner variance (see origin doc).
- **Custom Node comparison script, not Vitest's `--compare`** — Vitest's built-in `--compare` only reports inline deltas; it does not fail on threshold. We need a hard exit-code gate driven by a configurable threshold.
- **Relative baselines only — no separate absolute ceiling mechanism** — decided during origin doc review. Baselines are the single source of truth.
- **Committed baseline JSON, not generated per-PR** — simpler CI (single bench run per PR). Accepts GitHub Actions runner consistency as a reasonable assumption.
- **Pin CI runner image per-JOB, not per-step** — GitHub Actions does not support step-level `runs-on`. The bench step must live in a dedicated job with `runs-on: ubuntu-22.04`. Record the runner fingerprint as `${ImageOS}-${ImageVersion}` (e.g., `ubuntu22-20240818.1.0`) in `_meta.runnerImage` on every capture. Pinning just the OS label still allows image-build rotation within that label (weekly), so the fuller fingerprint is needed to diagnose drift. `ubuntu-22.04` itself has a hard expiry around April 2027 (Ubuntu 22.04 LTS end-of-standard-support) — document the migration procedure in `benchmarks/README.md`.
- **Advisory CI rollout initially** — `continue-on-error: true`. Promote to hard gate after 2-4 weeks of observation. Avoids flaky-CI rejection of legitimate PRs during threshold tuning.
- **Compare script exit codes distinguish regression from error** — exit 1 = true regression, exit 2 = script error (malformed input, missing file, corrupted hz). CI fails hard on exit 2 even under `continue-on-error`; only exit 1 is swallowed during advisory. Prevents silent-crash blind spots during the advisory window.
- **Baseline JSON is a wrapper, not raw Vitest output** — shape: `{ _meta: { capturedAt, runnerImage, commitSha, nodeVersion, vitestVersion }, benchmarks: { "<key>": { hz, mean_ms, p75_ms }, ... } }`. A wrapper lets `--update` preserve/refresh `_meta` on every refresh and gives the compare script a flat key-lookup surface instead of walking the deeply-nested Vitest shape. Partially decouples from Vitest's JSON schema — field renames in the leaf `benchmark` object only affect the ingest path. **Caveat:** the baseline keys themselves embed Vitest's `fullName` convention (`group.fullName + ' > ' + benchmark.name`). If Vitest changes `fullName` construction (separator, inclusion of file path), the keys break and every bench appears as MISSING+NEW. Mitigation in Unit 4's ingest: if MISSING+NEW > 50% of the baseline, exit 2 with "baseline appears wholly mismatched — likely Vitest schema change, refresh required". `_meta.vitestVersion` recorded on every capture so version bumps are visible at comparison time.
- **Shared fixtures extracted** — a `_fixtures.ts` in `__bench__/` holds `makeFieldPlan`, `makeParameterPlan`, `makeProviders`, synthetic data generators. Avoids duplication across the two bench files and separates fixture size from bench logic.
- **Pure-closure providers, not `vi.fn()`** — `vi.fn` mock-tracking adds measurable overhead that distorts `hz`.
- **Baseline key format** — `fullName + ' > ' + name` from Vitest JSON output, matching Vitest's own convention. Unit 4 includes a duplicate-key validation step during ingest to catch name collisions before they corrupt the baseline.
- **1.9 reference via git tag `1.9.1.0`, not a branch** — no `release/1.9.x` branch exists; the tag is the stable reference point for the v1.9 codebase.
- **1.9 capture PRIMARY path is a standalone harness in the 2.0 branch, not a 1.9 worktree** — the 1.9 codebase predates lockfileVersion 3 remediations documented in `MEMORY.md`. Pre-research the import graph of the 1.9 processing function, extract it with its non-Power-BI dependencies into a `benchmarks-temp/` area on the 2.0 branch, and bench it there. The worktree path is last-resort only.
- **Turbo `bench` task uses `cache: false`, no `dependsOn`** — matches the existing `test` task's shape (which has no `dependsOn` despite the monorepo structure). `cache: false` prevents Turbo from serving stale bench results — bench measurements are stateful and hardware-dependent, caching them is actively harmful. Add `dependsOn: ["^build"]` later when `data-core` actually gains workspace deps; adding it now ahead of need creates a false sense of cache safety for transitive changes that may not invalidate as expected.

## Open Questions

### Resolved During Planning

- **How does Vitest `bench` emit JSON?** — Via `test.benchmark.outputJson` config OR `--outputJson=<path>` CLI flag. Structure documented in Context & Research.
- **Where does CI insert the bench step?** — Immediately after the existing `Tests` step in `.github/workflows/ci.yml`, before `Confirm pbiviz package`.
- **Does `data-core` need a new `vitest.config.ts`?** — Yes. It currently has none (relies on defaults). A new file is required to configure `test.benchmark.include` matching `**/__bench__/**/*.bench.ts`.
- **How to capture 1.9 reference if `release/1.9.x` doesn't exist?** — Use tag `1.9.1.0` (confirmed via `git tag`), worktree from the tag, add temporary bench, record and discard.

### Deferred to Implementation

- **Exact per-bench `time` / `iterations` values** — defaults (500ms per bench) may run too few iterations for the 100K tier (≈12 iters). Tune during Unit 2 after first runs. Document chosen values as inline comments.
- **Whether `includeSamples` should be true for the 1.9 reference run only** — might help detail the comparison with tail percentiles, but increases memory. Decide during Unit 7.
- **Shape of `benchmarks/compare.mjs` output on failure** — human-readable diff table is the goal, but format details (Markdown vs plain text, color) tuned during Unit 5.
- **Whether to add a `bench:ci` variant script** — unclear until CI integration. If `continue-on-error: true` is sufficient, no separate script needed.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Data flow

```
┌─────────────────────────────┐
│ packages/data-core          │
│ __bench__/                  │
│   _fixtures.ts (shared)     │
│   build-data-row.bench.ts   │──┐
│   build-processing-plan     │  │   vitest bench --run
│   .bench.ts                 │──┼──►  --outputJson=results.json
└─────────────────────────────┘  │
                                 ▼
                         benchmarks/results/
                           data-core.json  (transient, gitignored)
                                 │
                                 ▼
                         benchmarks/compare.mjs
                           reads baselines/data-core.json
                           computes hz delta per bench
                           exits 0 (pass) or 1 (regression)
                                 │
                                 ▼
                         CI: continue-on-error: true (initial)
```

### Bench naming → baseline key mapping

```
describe('buildDataRow', () => {
  describe('field-only plan, passthrough provider', () => {
    bench('1,000 rows', fn)
  })
})
                    │
                    ▼ Vitest emits
  fullName: "buildDataRow > field-only plan, passthrough provider"
  name:     "1,000 rows"
                    │
                    ▼ Baseline key
  "buildDataRow > field-only plan, passthrough provider > 1,000 rows"
```

### Bench matrix (summary)

| Target | Axis 1 | Axis 2 | Axis 3 | Total |
|---|---|---|---|---|
| `buildDataRow` | 3 row tiers | 2 provider variants | 2 instruction variants | 12 benches |
| `buildProcessingPlan` | 3 field tiers | 2 composition variants | — | 6 benches |

## Implementation Units

- [ ] **Unit 1: Scaffold Vitest bench config and scripts for `data-core`**

**Goal:** Create the net-new `vitest.config.ts` for `@deneb-viz/data-core` with test + benchmark config, add the `bench` package script, add the Turbo `bench` task, and add the root `npm run bench` entry point. Confirm `npx turbo run bench --filter=@deneb-viz/data-core` runs cleanly (with no bench files yet, it should report zero benches and exit 0).

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `packages/data-core/vitest.config.ts`
- Modify: `packages/data-core/tsconfig.json` (add bench files to `exclude`)
- Modify: `packages/data-core/package.json` (add `bench` script)
- Modify: `turbo.json` (add `bench` task)
- Modify: `package.json` (add root `bench` script)
- Modify: `.gitignore` (add `**/benchmarks/results/`)

**Approach:**
- **Verify Vitest version first** — run `npx vitest --version`. Plan assumes 3.2.x. If the repo is on a different version, stop and re-read Vitest docs for the actual installed version before writing the config.
- **Exclude bench files from TypeScript build output** — `packages/data-core/tsconfig.json` currently excludes `**/*.test.*` and `**/*.spec.*`. Add `"**/*.bench.*"` and `"**/__bench__/**"` to the same `exclude` array. Without this, the `__bench__` directory and `_fixtures.ts` (no `.test.` / `.bench.` suffix) will compile into `dist/` and ship as part of the published package output — also pulling `vitest` (a devDependency) into the runtime graph.
- `vitest.config.ts` uses `defineConfig` with both `test` (matching current implicit defaults — `environment: 'node'` if needed) and `test.benchmark` blocks.
- `test.benchmark.include` pattern: `['src/**/__bench__/**/*.bench.ts']` (relative to the config file's directory, which is `packages/data-core/`).
- `test.benchmark.reporters`: `['default']` — do NOT set top-level `reporters` alongside (crashes, see vitest#5953).
- `test.benchmark.outputJson`: **relative path** `'benchmarks/results/data-core.json'`. Vitest resolves this against `config.root` (the directory containing `vitest.config.ts`), producing the final path `packages/data-core/benchmarks/results/data-core.json`. Do NOT write the full `packages/data-core/benchmarks/...` string in the config — it would double-prefix.
- `test.benchmark.includeSamples`: `false` (memory safety).
- Package `bench` script: `vitest bench --run`.
- Turbo `bench` task: `{ "cache": false }`. Do NOT declare `dependsOn` (matches `test` task shape, and `data-core` has no workspace deps today) or `outputs` (bench results are stateful measurements, not build artifacts).
- Root `bench` script: `"bench": "turbo run bench"`.
- `.gitignore` addition: `**/benchmarks/results/` — matches per-package results directories (e.g., `packages/data-core/benchmarks/results/`). Verify with `git check-ignore packages/data-core/benchmarks/results/foo.json`.

**Patterns to follow:**
- `packages/vega-runtime/vitest.config.ts` for config file shape.
- `package.json` `test` / root `test` scripts for Turbo invocation style.

**Test scenarios:**
- *Test expectation: none — this unit is pure infrastructure scaffolding with no behavioral logic.*

**Verification:**
- `npm run bench` at repo root exits 0 with "No bench files found" output (expected before Unit 2 lands benches).
- `npx turbo run bench --filter=@deneb-viz/data-core` succeeds with Turbo's caching output.
- `packages/data-core/vitest.config.ts` type-checks under the workspace's TypeScript config.
- **Smoke-test the bench pipeline before Unit 2:** write a trivial `src/lib/support-fields/__bench__/_smoke.bench.ts` with one `bench('noop', () => 1 + 1)` call, run it, inspect the emitted `packages/data-core/benchmarks/results/data-core.json` to confirm the schema matches what Unit 4 expects (`files[].groups[].benchmarks[]` with `hz` field). Delete the smoke bench after confirming. This catches Vitest-version mismatches and path-resolution bugs early.
- `git check-ignore packages/data-core/benchmarks/results/foo.json` reports the file as ignored.
- `npm run build -w @deneb-viz/data-core` produces no output under `dist/lib/support-fields/__bench__/` and no `_fixtures.js`.

---

- [ ] **Unit 2: Add `buildDataRow` benchmarks with shared fixtures**

**Goal:** Introduce the `__bench__` directory for `@deneb-viz/data-core`'s `support-fields` module. Add shared fixture helpers and the `buildDataRow` benchmark file covering the full matrix: 3 row tiers × 2 provider variants × 2 instruction variants = 12 benches.

**Requirements:** R1

**Dependencies:** Unit 1

**Files:**
- Create: `packages/data-core/src/lib/support-fields/__bench__/_fixtures.ts`
- Create: `packages/data-core/src/lib/support-fields/__bench__/build-data-row.bench.ts`

**Approach:**
- `_fixtures.ts` exports:
  - `makePassthroughProvider()` — returns a `SupportFieldValueProvider` where `getFormatString` returns `''`, `getFormattedValue` returns the input value, `getHighlightValue` returns the base value. Pure closures, no `vi.fn`.
  - `makeRealisticProvider()` — simulates simple non-trivial work: `getFormattedValue` does `String(value)` concat with format string, `getHighlightValue` does a numeric comparison and returns either value or null. Still pure closures — the goal is a realistic allocation/arithmetic profile, not a Power BI host emulation.
  - `makeFieldOnlyPlan(fieldCount)` — builds a `ProcessingPlan` with N field instructions, mixing grouping and aggregation roles. All `emit*` flags representative: highlight on for aggregation, format on.
  - `makeParameterHeavyPlan(fieldCount)` — builds a plan with ~half field instructions and ~half parameter group instructions. Parameter groups bundle 3-5 component fields each.
  - `generateBaseValues(rowCount, fieldCount)` — pre-allocated 2D array matching the shape `buildDataRow` expects.
- `build-data-row.bench.ts`:
  - Top-level `beforeAll` (or module-level constants) generates base values for each tier ONCE. **Do not regenerate inside the bench function** — measurement noise comes from allocations.
  - Structure: outer `describe('buildDataRow')`, nested `describe` per variant combo (`field-only + passthrough`, `field-only + realistic`, `parameters + passthrough`, `parameters + realistic`). Each nested `describe` has 3 `bench()` calls — one per row tier.
  - Each `bench()` body: tight `for (let i = 0; i < rowCount; i++) buildDataRow({...params, rowIndex: i})`.
  - For the 100K tier, consider increasing per-bench `time` to 2000ms via the third arg to `bench()` if default iterations yield fewer than 5 samples. Document in-line.

**Execution note:** This unit authors benchmarks, not tests. Run benches locally (`npm run bench -w @deneb-viz/data-core`) to confirm all 12 benches execute and produce sensible `hz` values before moving on.

**Technical design:**

```
buildDataRow.bench.ts (directional)
─────────────────────────────────────
describe('buildDataRow', () => {
  for each (provider in [passthrough, realistic])
    for each (plan in [field-only, parameters])
      describe(`${plan} plan, ${provider} provider`, () => {
        bench('1,000 rows', () => loop N calls)
        bench('10,000 rows', () => loop N calls, { time: ... })
        bench('100,000 rows', () => loop N calls, { time: 2000 })
      })
})
```

**Patterns to follow:**
- `mockProvider` style from `__tests__/build-data-row-parameters.test.ts` — pure closures, no `vi.fn`.
- `makePlan` / `makeInstruction` / `makeParameterInstruction` helper shapes from existing tests.

**Test scenarios:**
- *Test expectation: none — benchmarks are the performance tests. Verification is by running them and checking output.*

**Verification:**
- `npm run bench -w @deneb-viz/data-core` produces output for all 12 benches across the four variant combos and three row tiers.
- JSON output at `packages/data-core/benchmarks/results/data-core.json` (or wherever `outputJson` is configured) contains entries with non-zero `hz` for every bench.
- No benchmark takes longer than ~30 seconds to complete (if it does, tune `time` downward).
- Running the file locally with CPU-bound `top`/`Activity Monitor` confirms the realistic provider produces measurably higher per-row time than passthrough (sanity check — the two variants should diverge).

---

- [ ] **Unit 3: Add `buildProcessingPlan` benchmarks**

**Goal:** Add the second benchmark file covering `buildProcessingPlan`: 3 field tiers × 2 composition variants = 6 benches. Reuse the shared fixtures from Unit 2.

**Requirements:** R1

**Dependencies:** Unit 2 (shares `_fixtures.ts`)

**Files:**
- Create: `packages/data-core/src/lib/support-fields/__bench__/build-processing-plan.bench.ts`
- Modify: `packages/data-core/src/lib/support-fields/__bench__/_fixtures.ts` (add `makeFieldMetadata(fieldCount, withParameterGroups?)` helper)

**Approach:**
- `_fixtures.ts` gains `makeFieldMetadata(fieldCount, opts)` — returns the `fields` array `buildProcessingPlan` accepts. When `opts.withParameterGroups` is true, cluster ~half the fields into parameter groups of 3-5 components.
- `build-processing-plan.bench.ts`:
  - Outer `describe('buildProcessingPlan')`, nested per composition variant (`fields only`, `with parameter groups`).
  - 3 `bench()` calls per variant — one per field tier (2, 10, 50).
  - Each `bench()` body: single call to `buildProcessingPlan({ fields, configuration, masterSettings, hasHighlights, isLegacy })`. The inputs should be generated OUTSIDE the bench function body.
  - `buildProcessingPlan` is cheap — default `time: 500` should yield thousands of iterations, no tuning needed.

**Patterns to follow:**
- Same pure-closure fixture style as Unit 2.
- `__tests__/build-processing-plan-parameters.test.ts` for the shape of `fields` arrays that exercise parameter groups.

**Test scenarios:**
- *Test expectation: none — benchmarks are the performance tests.*

**Verification:**
- `npm run bench -w @deneb-viz/data-core` now runs 18 total benches (12 from Unit 2 + 6 from this unit).
- JSON output contains `buildProcessingPlan` entries with non-zero `hz` for every tier × variant.
- The `50 fields > with parameter groups` bench shows visibly lower `hz` than `2 fields > fields only` (sanity check — complexity scales with field count).

---

- [ ] **Unit 4: Implement `benchmarks/compare.mjs` comparison script**

**Goal:** Write the Node script that reads Vitest's `outputJson` file and the committed baseline, computes `hz` regression per benchmark, and exits non-zero when any benchmark regresses beyond the configured threshold. Include a readable diff summary and support for generating initial baselines.

**Requirements:** R2, R3

**Dependencies:** Units 2 and 3 (need real bench output to develop against)

**Files:**
- Create: `benchmarks/compare.mjs`
- Create: `benchmarks/baselines/.gitkeep` (ensure directory is committed even before first baseline lands)
- Modify: `package.json` (add `bench:compare` and `bench:update-baseline` root scripts)

**Approach:**

- **CLI shape:**
  - `node benchmarks/compare.mjs --results <path> --baseline <path> [--threshold 20] [--update] [--allow-removed-benches] [--force-non-ci]`
  - Use `node:util.parseArgs` (stable since Node 18.3, no new devDep) for robust parsing — rejects unknown flags, handles `--threshold 20` and `--threshold=20` consistently, fails on missing values.
  - Reject non-numeric, negative, or NaN threshold values at parse time with a usage message.

- **Baseline file shape** (explicit wrapper, NOT raw Vitest output):
  ```json
  {
    "_meta": {
      "capturedAt": "2026-04-16T12:34:56Z",
      "runnerImage": "ubuntu22-20240818.1.0",
      "nodeVersion": "22.x",
      "vitestVersion": "3.2.4",
      "commitSha": "abc123..."
    },
    "benchmarks": {
      "buildDataRow > field-only plan, passthrough provider > 1,000 rows": {
        "hz": 2380.95,
        "mean_ms": 0.42,
        "p75_ms": 0.48,
        "threshold": 20
      }
    }
  }
  ```
  The per-benchmark `threshold` is optional; if absent, the CLI `--threshold` value applies. `_meta.vitestVersion` lets compare.mjs emit a warning when the current Vitest differs from the baseline's capture version (fullName construction has changed across minor versions).

- **Ingest pipeline:**
  1. Load the current Vitest `outputJson`. Walk `files[].groups[].benchmarks[]` — for each, compute key as `group.fullName + ' > ' + benchmark.name`.
  2. **Validate `hz`:** must be a finite, positive, non-zero `number` type. Reject (exit 2) on NaN, Infinity, -Infinity, 0, negative, null, undefined, or non-number type. Accept any positive finite value including very small ones like 1e-10. Rationale: catches bench bodies that threw but still emitted a JSON record; prevents `NaN > threshold === false` silent-pass behavior.
  3. **Validate `sampleCount`:** if `sampleCount < 5`, warn prominently (do not exit 2 — may be legitimate at 100K tier if `time` is tuned low). A sample count collapse from ~50 to ~1 is a strong signal the bench body got catastrophically slower — Vitest still reports `hz` from whatever samples ran, but with no variance to detect regression statistically.
  4. **Detect duplicate keys:** if two benchmarks resolve to the same key (e.g., via copy-paste in the bench file), exit 2 with a clear error — don't silently overwrite.
  5. **Detect separator-in-name smell:** if any `group.fullName` or `benchmark.name` contains ` > ` as a substring, warn — this suggests an author confused display label with the key, and risks key collisions across files.
  6. Convert the walked shape into the flat `{ key: { hz, mean_ms, p75_ms, sampleCount } }` map.

- **Comparison:**
  - Load the baseline (wrapper shape). Use `baseline.benchmarks[key]` for lookup.
  - For each key present in both: `regressionPct = (baseline.hz - current.hz) / baseline.hz * 100`. Positive = slower.
  - If `regressionPct > effectiveThreshold` (strict `>`, not `>=`), flag REGRESSION. `effectiveThreshold = baseline.benchmarks[key].threshold ?? cliThreshold`.
  - If key is in current only (not in baseline): flag NEW, do not fail.
  - If key is in baseline only (not in current): flag MISSING, do not fail — but log prominently so a removed or renamed bench is visible.
  - **Mass-mismatch sanity check:** if `(MISSING + NEW) / totalBaselineKeys > 0.5`, exit 2 with "baseline appears wholly mismatched — likely Vitest schema change or major rename, refresh required". Prevents a silent-dark failure mode where a Vitest upgrade changes `fullName` construction, invalidating all baseline keys — compare script would otherwise report 0 regressions forever.
  - **Vitest version check:** if `_meta.vitestVersion` in the baseline differs from the current `vitest --version`, warn prominently — may explain unexpected MISSING/NEW patterns.
  - **Runner fingerprint mismatch:** if `_meta.runnerImage` in the baseline differs from the current environment fingerprint (captured via `$ImageOS-$ImageVersion` in GitHub Actions, or `local-<platform>` outside CI), emit a prominent warning header in the output. Do NOT fail on mismatch.

- **Output:**
  - Markdown-style diff table to stdout: `| Benchmark | Baseline hz | Current hz | Δ% | Status |`.
  - Status tokens: `PASS`, `REGRESSION`, `NEW`, `MISSING`.
  - After the table, a summary line: `N pass, M regressions, X new, Y missing`.

- **Exit codes (critical for CI):**
  - `0` — all benchmarks pass (including NEW and MISSING).
  - `1` — at least one REGRESSION. CI with `continue-on-error: true` swallows this during advisory rollout.
  - `2` — script error (malformed JSON, invalid hz values, duplicate keys, file missing, CLI parse error). CI fails hard on this even during advisory, via a post-step exit-code check.

- **`--update` mode:**
  - Writes the ingested-and-validated current results to the baseline path in wrapper format.
  - **Populates `_meta`** with: capture timestamp, runner fingerprint (`$ImageOS-$ImageVersion` if in GitHub Actions, else `local-<platform>`), Node version (`process.version`), Vitest version (from `package.json`), commit SHA (`git rev-parse HEAD`).
  - **Superset check:** if the current results are missing one or more keys that exist in the existing baseline (e.g., one bench failed to run, producing a truncated results file), refuse the update (exit 2) and name the missing keys — do not overwrite with a truncated set. Use `--allow-removed-benches` to bypass when a bench was intentionally removed. Skipped when the baseline file does not exist yet (first-ever capture).
  - **CI-source enforcement:** if the runner fingerprint would be `local-<platform>` (i.e., `$ImageOS`/`$ImageVersion` absent), refuse the update unless `--force-non-ci` is passed. Discourages local-laptop baselines from thrashing against CI-captured numbers; primary documented refresh path is the `bench-update-baseline.yml` workflow.

- **Validation invariant:** the current results are always validated (hz finite positive, no duplicates) before either comparison OR update. A corrupted run cannot be stamped as the new baseline.

- **Root scripts:**
  - `"bench:compare": "node benchmarks/compare.mjs --results packages/data-core/benchmarks/results/data-core.json --baseline benchmarks/baselines/data-core.json"`
  - `"bench:update-baseline": "node benchmarks/compare.mjs --results packages/data-core/benchmarks/results/data-core.json --baseline benchmarks/baselines/data-core.json --update"`

**Patterns to follow:**
- Prefer `.mjs` (ESM) for consistency with the project's `"type": "module"` stance.
- Plain Node built-ins only — `fs/promises`, `path`, `process.argv` parsing manually or via a tiny single-dep approach. Avoid pulling in new devDeps for this.
- Keep the script self-contained; no extraction to `benchmarks/lib/` until a second comparison use case exists.

**Test scenarios:**

Comparison logic:
- **Happy path:** Given a baseline wrapper and a results JSON with identical `hz` values across all benches, the script reports all-PASS and exits 0.
- **Regression detection:** A results entry whose `hz` is 25% below the corresponding baseline entry (default threshold 20%) is flagged REGRESSION, script exits 1.
- **Edge case (boundary):** Use hardcoded input values (not computed arithmetic) to verify strict `>` semantics. `delta = threshold - 1e-9` passes; `delta = threshold + 1e-9` fails. Do not attempt to construct "exactly at threshold" via arithmetic — IEEE-754 makes this non-deterministic.
- **Edge case (improvement):** A bench whose `hz` is HIGHER than baseline reports PASS, never REGRESSION.
- **Per-benchmark threshold override:** A baseline entry with `threshold: 5` and a current `hz` 10% below baseline is flagged REGRESSION even when CLI `--threshold 20` is passed. Per-bench override wins.

Ingest validation (must exit 2 unless noted):
- **Zero `hz`:** A results entry with `hz: 0` causes exit 2 with "bench produced unusable hz" message (not silent pass).
- **NaN `hz`:** Same as above for `hz: NaN` (must reject; `NaN > threshold` is always false, so silent pass is the failure mode this guards).
- **Negative `hz`:** Same for negative values.
- **Infinity `hz`:** Same for `Infinity` / `-Infinity`.
- **Missing `hz`:** Benchmark object present in JSON but missing the `hz` key — exit 2.
- **Non-number `hz`:** `hz: "2380.95"` (string) — exit 2.
- **Duplicate keys:** Two benchmarks resolving to the same `fullName + ' > ' + name` — exit 2 with "duplicate key" message, do NOT silently overwrite.
- **Low sampleCount (warn, not fail):** a bench with `sampleCount: 2` produces a prominent warning in the output but does not exit non-zero.
- **Separator-in-name smell (warn):** a bench named `"foo > bar"` produces a warning suggesting the author may have confused display label with key path.

Sanity checks:
- **Mass-mismatch:** baseline has 18 keys, current has 0 overlapping keys — exit 2 with "baseline appears wholly mismatched" message. Not silently reported as 18 MISSING + 18 NEW.
- **Vitest version change (warn, not fail):** baseline captured with `vitestVersion: 3.2.4`, current run with `3.3.0` — prominent warning in output.

Error paths:
- **Missing baseline key (NEW):** Reported as NEW, exit 0.
- **Missing current key (MISSING):** Reported as MISSING, exit 0. Logged prominently.
- **Malformed JSON:** Either file is not valid JSON → exit 2 with a clear error message (not a stack trace).
- **Missing results file:** `ENOENT` on results path → exit 2 with "results file not found at <path>" (not a raw Node stack trace).
- **Wrong Vitest schema shape:** Results JSON is valid JSON but missing `files[].groups[].benchmarks[]` structure → exit 2 with "unexpected JSON shape, check Vitest version compatibility".
- **CLI parse errors:** Unknown flag, missing flag value, `--threshold abc`, `--threshold -5` → exit 2 with usage message.
- **CLI edge cases:** Both `--threshold 20` and `--threshold=20` behave identically. `--threshold` with no value fails loudly.

Update mode:
- **First-ever update:** No existing baseline file → writes the new baseline with populated `_meta`, exits 0. Skips the superset check.
- **Full-superset update:** Existing baseline has N keys, current results has the same N keys plus 2 new ones → writes the new baseline, exits 0.
- **Partial-results rejection:** Existing baseline has 18 keys, current results has 17 (one bench failed to run) → exits 2, does NOT overwrite, message names the missing keys.
- **`--allow-removed-benches`:** Same partial-results case with this flag → writes the new baseline (17 keys), exits 0.
- **CI-source enforcement:** No `RUNNER_IMAGE` env var set (local machine) → `--update` exits 2 with "refusing to update baseline from non-CI source".
- **`--force-non-ci`:** Local update with this flag → writes baseline, `_meta.runnerImage` set to `local-<platform>`.
- **`_meta` refresh:** `--update` on an existing baseline with old `_meta` → new `_meta` reflects current capture, old values replaced (not merged).
- **Current-results validation applies in update mode:** A results file with `hz: 0` for one bench → `--update` exits 2 (no corrupted baseline stamped), same as comparison mode.

Runner fingerprint:
- **Matching runner:** Baseline `_meta.runnerImage` matches current `RUNNER_IMAGE` env var → normal diff table, no warning.
- **Mismatched runner:** Baseline captured on `ubuntu-22.04`, current `RUNNER_IMAGE` is `ubuntu-24.04` → warning banner above the diff table, does NOT fail the comparison.

Test file: `benchmarks/__tests__/compare.test.mjs`. Use Vitest (matches repo convention). May live under a root-level test config or be configured via its own minimal `vitest.config.ts` — finalize during implementation.

**Prototype check before finalizing the ingest path:** Run Unit 2's actual nested describes and capture a real Vitest `outputJson` fixture. Commit it as a test fixture (`benchmarks/__tests__/fixtures/sample-vitest-output.json`) and use it in tests — this verifies the walker against real Vitest 3.2.4 output rather than an assumed shape.

**Verification:**
- All test scenarios pass.
- Manual smoke: run `node benchmarks/compare.mjs --results <real-results> --baseline <copy-of-same>` and observe all-PASS output.
- Manual smoke: hand-edit the copied baseline to inflate one `hz` value, re-run, observe REGRESSION and exit 1.

---

- [ ] **Unit 5: Wire the bench step into CI with a no-op-on-missing-baseline fallback**

**Goal:** Add a GitHub Actions step that runs `npm run bench` and then `npm run bench:compare` after the existing `Tests` step, pinned to a specific runner image (`ubuntu-22.04`), with a no-baseline-yet graceful-exit path so this unit can land BEFORE the first baseline commit (Unit 6). Also add a `workflow_dispatch`-triggered `bench-update-baseline.yml` workflow that Unit 6 uses to capture the first baseline from CI hardware.

**Why this unit comes before Unit 6:** The first baseline should come from the actual CI environment, not a local dev machine (local numbers thrash against CI numbers and mislead everyone). The workflow_dispatch path established here is what Unit 6 uses to produce the first baseline.

**Requirements:** R2, R3

**Dependencies:** Units 1, 4

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/bench-update-baseline.yml`

**Approach:**

CI integration (`.github/workflows/ci.yml`):
- **Split the bench into a dedicated job**, NOT a step in the existing `ci` job. GitHub Actions does not support step-level `runs-on`, so the runner image pin requires a separate job.
- New job: `bench:` with `runs-on: ubuntu-22.04`, `needs: ci` (so bench only runs after tests/build pass).
- Job-level env: `RUNNER_IMAGE: "${{ runner.os }}-${{ runner.arch }}-${{ env.ImageOS || 'pinned' }}-${{ env.ImageVersion || 'unknown' }}"` or similar — capture the fullest runner fingerprint available. The GitHub-provided `$ImageOS` and `$ImageVersion` env vars identify the specific runner image build within a pinned label.
- **Job timeout:** `timeout-minutes: 10`. Prevents a pathological bench (e.g., a scaling regression that makes one bench take hours) from burning Actions minutes or exceeding the 6-hour hard limit.
- Job steps: checkout → setup-node (Node 22) → `npm ci` → `npm run build` (to populate `dist/` for any future workspace-dep bench) → bench + compare (pattern below) → upload-artifact.
- **Exit-code capture pattern** (correct GitHub Actions idiom):
  ```yaml
  - name: Run benchmarks and compare
    id: bench
    shell: bash
    continue-on-error: true
    run: |
      set +e
      npm run bench
      BENCH_EXIT=$?
      npm run bench:compare
      COMPARE_EXIT=$?
      echo "bench_exit=$BENCH_EXIT" >> "$GITHUB_OUTPUT"
      echo "compare_exit=$COMPARE_EXIT" >> "$GITHUB_OUTPUT"
      # Step A exits 0 regardless, so continue-on-error's swallow is not needed — but keep it as belt-and-braces
      exit 0
  - name: Fail on script error
    if: steps.bench.outputs.compare_exit == '2' || steps.bench.outputs.bench_exit != '0'
    run: |
      echo "Benchmark pipeline failed with script error (bench_exit=${{ steps.bench.outputs.bench_exit }}, compare_exit=${{ steps.bench.outputs.compare_exit }})"
      exit 1
  - name: Flag regression (advisory)
    if: steps.bench.outputs.compare_exit == '1'
    continue-on-error: true
    run: |
      echo "::warning::Benchmark regression detected — see comparison output above"
      exit 1
  ```
  This gives: regressions → yellow warning + job continues (advisory); script errors OR bench crashes → job fails hard (even during advisory); clean runs → green.
- **No-baseline-yet handling:** `compare.mjs` must treat "baseline file does not exist" as exit code 0 with a "no baseline to compare against — treating as first run" log message. This lets Unit 5 land before any baseline exists, breaking the bootstrap cycle.
- **Upload results as artifact:** `actions/upload-artifact@v4` with path `packages/data-core/benchmarks/results/data-core.json` and `retention-days: 14`. Makes post-mortem of flaky regressions possible during advisory rollout — without this, the JSON is lost when the runner is recycled.

Manual baseline refresh workflow (`.github/workflows/bench-update-baseline.yml`):
- Trigger: `workflow_dispatch` only.
- `runs-on: ubuntu-22.04` (same pin as bench job).
- **Permissions block required** — default `GITHUB_TOKEN` is often read-only:
  ```yaml
  permissions:
    contents: write
    pull-requests: write
  ```
- Job-level env matches the bench job's `RUNNER_IMAGE` pattern so the `_meta` fingerprint is identical.
- **Initial simpler approach — artifact, not auto-PR:** Steps: checkout → setup-node → `npm ci` → `npm run build` → `npm run bench` → `npm run bench:update-baseline` → `actions/upload-artifact@v4` with the baseline JSON. A maintainer downloads the artifact and opens a PR manually. This avoids the permissions/auth complexity of bot-authored PRs (GitHub's anti-loop policy means bot-authored PRs don't auto-trigger the `pull_request` CI, which breaks the review loop).
- **Pre-flight verification before Unit 6 dispatches this:** confirm (a) repo → Settings → Actions → General → Workflow permissions allows PR creation if you later upgrade to auto-PR, (b) branch protection on `main` is compatible. Document these settings in `benchmarks/README.md`.
- **Future upgrade path:** if refresh frequency warrants, replace the artifact step with a branch-push + `gh pr create` step. Requires the permissions block above AND repo-level Actions-PR permission enabled.

**Patterns to follow:**
- Existing step shape in [.github/workflows/ci.yml](../../.github/workflows/ci.yml).

**Test scenarios:**
- **Happy path (no baseline yet):** Open a PR with this unit. CI runs the Benchmarks step, compare.mjs reports "no baseline — first run", exits 0, job succeeds.
- **Script error propagation:** Manually break the `compare.mjs` to throw (e.g., point at a non-existent results path) in a draft PR. Exit code 2 bubbles up via Step B and FAILS the job — even though Step A had `continue-on-error: true`. This validates the crash-isolation behavior.
- **Regression advisory:** After Unit 6 lands a baseline, push a draft PR that degrades `buildDataRow` (e.g., inject a `for (let i=0; i<1000; i++) {}` no-op loop). Observe REGRESSION in the log but the job still succeeds via `continue-on-error: true` on Step A.
- **Workflow dispatch smoke:** Trigger `bench-update-baseline.yml` manually from the Actions UI. Verify it produces a PR with a valid baseline JSON containing 18 entries, `_meta.runnerImage` set to `github-actions/ubuntu-22.04`, and `_meta.nodeVersion` / `_meta.commitSha` populated.
- **Integration:** The bench step must NOT affect subsequent CI steps. Confirm `test` and `package` behave identically with and without the bench step.

Test file: none — validate via actual CI runs.

**Verification:**
- The `Benchmarks` step appears in CI on the PR that merges this unit and exits 0 (no baseline yet, graceful skip).
- The `bench-update-baseline.yml` workflow is dispatchable from the Actions UI.
- Subsequent CI runs on unrelated PRs also succeed without a baseline.

---

- [ ] **Unit 6: Capture and commit the first baseline from CI**

**Goal:** Trigger the `bench-update-baseline.yml` workflow added in Unit 5, review the resulting PR, merge it. The committed baseline contains all 18 benchmarks with `_meta` populated from the CI runner. From this point on, Unit 5's Benchmarks step in CI becomes a true gate (advisory).

**Requirements:** R2

**Dependencies:** Units 2, 3, 4, 5

**Files:**
- Create: `benchmarks/baselines/data-core.json` (via the dispatch workflow's PR)

**Approach:**
- From the Actions UI, click `Run workflow` on `bench-update-baseline.yml` against the branch containing Units 2-5.
- The workflow runs bench → compare.mjs --update → uploads the baseline JSON as a workflow artifact.
- Download the artifact from the Actions UI.
- Open a PR with the downloaded baseline committed to `benchmarks/baselines/data-core.json`.
- Review the PR: baseline should have 18 entries. Spot-check plausibility — 100K rows entries should have visibly lower `hz` than 1K rows entries (~1000x if scaling is linear).
- `_meta` populated: `capturedAt`, `runnerImage` (e.g., `ubuntu22-20240818.1.0`), `nodeVersion`, `commitSha`, `vitestVersion`.
- Merge the PR.

**Patterns to follow:**
- Treat the baseline as a committed fixture, not a build artifact. Review it like any other data file.

**Test scenarios:**
- *Test expectation: none — this is a one-time data capture.*

**Verification:**
- `benchmarks/baselines/data-core.json` lands on `main` with 18 entries.
- The next CI run on any PR sees the baseline and runs the full comparison (no longer the "no baseline" graceful skip).
- A deliberately-regressing draft PR pushed immediately after Unit 6 merges shows REGRESSION in the log but does not block merge (advisory rollout).

---

- [ ] **Unit 6b: Re-capture baseline after advisory observation window** *(deferred follow-up — not part of this plan's scope)*

After 2-4 weeks of advisory observation, review the aggregated variance in CI logs. If stable, open a PR that: (1) triggers `bench-update-baseline.yml` to capture fresh numbers, (2) promotes the CI Benchmarks step from `continue-on-error: true` to a hard gate. If variance is too high, tune the threshold or add per-benchmark overrides via the baseline's optional `threshold` field before promoting.

This is a separate PR after real-world observation, not a unit to schedule now.

---

- [ ] **Unit 7: Capture 1.9 cross-version reference via standalone harness**

**Goal:** Bench the 1.9 end-to-end processing function at `src/lib/dataset/processing.ts` (tag `1.9.1.0`) and record the numbers in `benchmarks/1.9-reference.md` on the 2.0 branch. Informational only — the file is human-read, not machine-compared.

**Requirements:** R4, R5

**Dependencies:** Unit 2 (fixture patterns). Not on the CI critical path — can run in parallel with Units 5/6.

**Files:**
- Create: `benchmarks/1.9-reference.md`
- **Throwaway (not committed):** a `benchmarks-temp/` harness directory with vendored 1.9 source. Delete after capture.

**Approach:**

**Step 1: Pre-research (1-2h) — done BEFORE any bench work.**
- Use `git show 1.9.1.0:src/lib/dataset/processing.ts` to read the 1.9 processing entry point without checking out.
- Trace its import graph. For each import, decide: Power-BI-API (mock it), internal-sibling (vendor it), npm-dependency (install it). Record the full list in a scratch file.
- Check `git show 1.9.1.0:package.json` for Node version hints (`engines` field) and confirm Vitest version at that tag.
- Produce a vendoring inventory: which files need copying to `benchmarks-temp/vendored/`, which npm deps need installing, which symbols need mocking.

**Step 2: Primary path — standalone harness in 2.0 branch (3-4h).**
- **FIRST, add `/benchmarks-temp/` to `.gitignore` and commit that change in isolation.** Only after the gitignore entry is in place should vendored source be copied in — this prevents a reflexive `git add .` from staging the vendored files.
- Verify the gitignore with `git check-ignore -v benchmarks-temp/anyfile.ts` before proceeding.
- Create `benchmarks-temp/` on the current 2.0 branch.
- Copy vendored 1.9 source files into `benchmarks-temp/vendored/`. Use `git show 1.9.1.0:<path> > benchmarks-temp/vendored/<path>` to pull each file at the tag version.
- Write minimal mocks for Power-BI-API types (`DataViewCategorical`, `PrimitiveValue`, etc.) — types only, no runtime behavior needed since the benchmark supplies concrete data.
- Write `benchmarks-temp/processing-1.9.bench.ts` using the project's current Vitest 3.2.4:
  - Imports vendored 1.9 processing function.
  - Constructs synthetic `DataViewCategorical` inputs. Input shape matches the 2.0 benchmark's field composition (1 column field, 1 measure field, same flag settings) for data parity.
  - **Structures the bench to measure only the inner per-row loop**, not the categorical-extraction preamble, to reduce apples-to-oranges comparison with 2.0's `buildDataRow` (which also skips extraction). If the 1.9 code doesn't factor cleanly, measure both "full pipeline" and "inner loop only" and record both numbers — it clarifies the comparison.
  - Runs at the same 3 row tiers (1K, 10K, 100K).
  - Realistic mock provider: string concat for format, numeric compare for highlight — match the 2.0 `makeRealisticProvider`.
- Run via `npx vitest bench --run --config=benchmarks-temp/vitest.config.ts` (or equivalent — the harness has its own minimal config pointing at `benchmarks-temp/`).

**Step 3: Record results.**
Write `benchmarks/1.9-reference.md` with:
- Capture date and hardware (note whether CI or local; attempt CI via a temporary `workflow_dispatch` workflow for apples-to-apples comparison with 2.0 baselines, but local is acceptable given informational status).
- Tag `1.9.1.0`, commit SHA.
- Per-tier `hz` and `mean_ms` numbers.
- If measured: the overhead contribution of the extraction preamble (1.9 full-pipeline vs inner-loop delta).
- Side-by-side with 2.0 `buildDataRow + realistic provider, field-only plan` at matching tiers.
- Explicit caveats:
  - Function boundaries differ — 1.9 full pipeline does work that 2.0's `buildDataRow` doesn't (categorical extraction, metadata walking).
  - A FASTER 2.0 number is expected from this comparison alone (less work) — not necessarily a sign of real improvement.
  - A SLOWER 2.0 number at matching tiers is genuinely alarming and should prompt investigation.
  - Hardware parity: note if 1.9 and 2.0 numbers came from different machines.

**Step 4: Cleanup.**
- Delete `benchmarks-temp/`. Verify via `git status` that nothing remains tracked.

**Escape path (if primary path fails at any step):**
- Write `benchmarks/1.9-reference.md` with a "not measured — see notes" entry that explains:
  - Which pre-research finding (unvendorable import graph, version incompatibility, etc.) made measurement impractical.
  - What a future attempt could try differently.
- Mark R5 as "waived with rationale". R5 is explicitly informational — preserving honest reporting beats producing fake numbers.

**Time-box:** 8 hours total. If the pre-research step surfaces a clearly unvendorable import graph, go directly to the escape path — don't burn the remaining budget on a low-value informational capture.

**No secondary fallback paths (plain-Node harness, git worktree).** These were considered and rejected during planning — each adds failure modes (lockfile incompatibility, statistical fragility) without meaningfully changing the outcome for an informational-only document. If the primary path fails, the escape path is the right move.

**Patterns to follow:**
- Fixture patterns from Unit 2's `_fixtures.ts` — adapt to the 1.9 API surface.
- The 1.9 reference file is read by humans; favor clarity over structure.

**Test scenarios:**
- *Test expectation: none — this is a one-time manual reference capture.*

**Verification:**
- `benchmarks/1.9-reference.md` exists on the 2.0 branch with numbers for all 3 row tiers (OR an honest "not measured — see notes" entry with the rationale).
- `benchmarks-temp/` is NOT tracked in git after the unit completes.
- R5 sign-off: a reviewer can read the document and tell at a glance whether 2.0 is faster, slower, or comparable at 10K rows, WITH the apples-to-oranges caveat clearly stated.

---

## System-Wide Impact

- **Interaction graph:** CI workflow gains a new step after Tests. No runtime code changes, so visual rendering, dataset processing, and selection paths are unaffected. Turbo task graph gains a `bench` node.
- **Error propagation:** Initial CI rollout is advisory (`continue-on-error: true`), so bench failures do NOT propagate to job failure. When hardened to a hard gate later, bench failures become merge blockers — plan that transition as a separate follow-up PR with its own review.
- **State lifecycle risks:** Baseline JSON is a committed fixture. Stale baselines are a real concern: if no one re-captures after an intentional perf improvement, subsequent regressions may be masked (the new "normal" is faster than baseline, so a partial revert won't trip the threshold). Mitigation documented in the baseline update workflow (`bench:update-baseline` script).
- **API surface parity:** No public APIs change. The new `benchmarks/compare.mjs` script is internal tooling.
- **Integration coverage:** The CI bench step integrates the full `npm run bench` → `npm run bench:compare` flow. Unit tests on `compare.mjs` cover the script logic; real CI runs cover the integration.
- **Unchanged invariants:** `buildDataRow`, `buildProcessingPlan`, and `getMappedDataset` implementations are unchanged. `@deneb-viz/data-core` public API is unchanged. Root visual behavior is unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| CI runner variance causes flaky baseline comparisons despite `hz` normalization | Advisory rollout (`continue-on-error: true`) for 2-4 weeks gives time to observe real variance before gating. If variance exceeds 20%, raise the threshold or add per-benchmark overrides before promoting. |
| GitHub rotates `ubuntu-latest` mid-quarter, causing silent baseline drift | Pin the runner image to `ubuntu-22.04` in both `ci.yml` and `bench-update-baseline.yml`. Record the runner identifier in `_meta.runnerImage`. compare.mjs warns on mismatch. |
| 100K-row benches take too long in CI | Per-bench `time` tuning during Unit 2. If 100K stays problematic, reduce to 50K or drop the tier — document the change in the baseline `_meta`. |
| compare.mjs crashes silently during advisory rollout (swallowed by `continue-on-error: true`) | Exit-code split: regressions exit 1 (swallowed), script errors exit 2 (fail hard). CI uses a two-step pattern where the check-exit-code step has no `continue-on-error`. |
| Partial bench run with `--update` overwrites the baseline with a truncated set, losing keys | Superset check in compare.mjs `--update` mode. Requires `--allow-removed-benches` for intentional removals. |
| Local-laptop `--update` thrashes baseline against CI-captured numbers | `--update` refuses to run without `RUNNER_IMAGE` env var unless `--force-non-ci` is passed. Documented primary path is `bench-update-baseline.yml` via workflow_dispatch. |
| 1.9 vendoring fails due to arbitrarily-deep import graph | Pre-research step (1-2h) maps the import graph BEFORE committing to the primary path. Escape valve (Fallback C) allows marking R5 as "waived with rationale" rather than producing fake numbers. |
| `vi.fn` overhead mistakenly sneaks into benchmarks via fixture copy-paste from `__tests__` | `_fixtures.ts` is purpose-built for benches with pure closures only. Add a comment at the top of `_fixtures.ts` warning against `vi.fn`. |
| Baseline JSON becomes stale after intentional perf improvements, masking later regressions | `bench-update-baseline.yml` workflow_dispatch makes refresh a one-click operation. Document in `benchmarks/README.md` (optional addition). Include "refresh baseline after intentional perf changes" in PR review checklist. |
| Vitest 3.2.4 bench mode is flagged experimental — upstream API may shift | Baseline wrapper format partially decouples storage from Vitest's schema. `_meta.vitestVersion` recorded and warns on change. Mass-mismatch sanity check (MISSING+NEW > 50%) catches key-format changes. |
| Duplicate bench names from copy-paste silently overwrite one another in the baseline | compare.mjs ingest detects duplicate keys and exits 2 with a clear error. |
| `hz` value of 0 / NaN / negative silently passes comparison (`NaN > threshold` is false) | compare.mjs ingest rejects non-finite / non-positive `hz` as exit code 2. Applies in both comparison and `--update` modes. |
| Pathological bench regression (100K rows: 2s → 300s per iteration) collapses sampleCount to 1, passes comparison cleanly | compare.mjs warns prominently when `sampleCount < 5`. CI job has `timeout-minutes: 10` so runaway benches can't burn Actions minutes. |
| CI runner image rotation within pinned label (`ubuntu-22.04`) causes drift | `_meta.runnerImage` captures `$ImageOS-$ImageVersion` together, not just the pinned label. Warning banner on mismatch. Advisory observation window partly exists to characterize this drift. |
| `ubuntu-22.04` label deprecated at Ubuntu 22.04 LTS EOSS (April 2027) | Documented in Operational Notes: at deprecation, flip to the next pinned image AND re-capture baseline in the same PR. Known one-time regression event expected ~every 2 years. |
| Cumulative sub-threshold drift (multiple 19% regressions add up to 40% without any single PR blocking) | Future refresh PRs should include a `--diff-previous` summary so reviewers see trajectory against the PRIOR baseline, not just raw numbers. Flag as follow-up once the refresh cadence starts. |
| bench-update-baseline workflow permission denied by default GITHUB_TOKEN scope | Explicit `permissions: { contents: write, pull-requests: write }` block on the workflow. Initial implementation uses artifact upload (no push required) to sidestep this entirely until the refresh cadence justifies auto-PR. |

## Documentation / Operational Notes

- **After Unit 6 lands:** README or CONTRIBUTING should note that `npm run bench` runs the suite locally and that baselines live in `benchmarks/baselines/`. Consider a short `benchmarks/README.md` explaining the workflow (run locally → inspect → if intentional perf change, trigger `bench-update-baseline.yml` workflow_dispatch from Actions UI). Low priority — can trail the code by a PR or two.
- **After Unit 6b (the deferred follow-up) observation window:** promote the CI Benchmarks step from advisory to hard gate by removing `continue-on-error: true` from Step A. Communicate the change in the PR description so contributors know bench failures now block merges. The script-error step (Step B) is already a hard gate — no change there.
- **Baseline refresh workflow (documented primary path):** when a PR intentionally improves performance, the author triggers `bench-update-baseline.yml` from the Actions UI, which opens a PR with the refreshed baseline. The perf-improvement PR and the baseline-refresh PR can be merged together (baseline refresh after perf improvement merges). Local `--update` is discouraged and blocked by default (requires `--force-non-ci`).
- **Emergency CI unblock:** if CI bench step is failing after a legitimate but expected perf shift (e.g., a known refactor), temporarily widen `--threshold` in the CI step command, merge the refactor, then refresh the baseline and restore the threshold in a follow-up PR. Document this pattern in `benchmarks/README.md` so it's not invented ad-hoc.
- **If a solutions entry is warranted:** any non-trivial friction encountered (1.9 vendoring dead-ends, Vitest experimental-API quirks, CI variance tuning, runner image rotation responses) should be written up in `docs/solutions/` so the next person doesn't repeat the work.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-16-performance-benchmarks-requirements.md](../brainstorms/2026-04-16-performance-benchmarks-requirements.md)
- Related code: [packages/data-core/src/lib/support-fields/build-data-row.ts](../../packages/data-core/src/lib/support-fields/build-data-row.ts), [packages/data-core/src/lib/support-fields/build-processing-plan.ts](../../packages/data-core/src/lib/support-fields/build-processing-plan.ts), [packages/data-core/src/lib/support-fields/types.ts](../../packages/data-core/src/lib/support-fields/types.ts)
- Existing Vitest config examples: [packages/vega-runtime/vitest.config.ts](../../packages/vega-runtime/vitest.config.ts), [packages/vega-react/vitest.config.ts](../../packages/vega-react/vitest.config.ts)
- CI workflow: [.github/workflows/ci.yml](../../.github/workflows/ci.yml)
- Turbo config: [turbo.json](../../turbo.json)
- 1.9 reference target: tag `1.9.1.0`, file `src/lib/dataset/processing.ts`
- Vitest benchmark docs: https://vitest.dev/config/benchmark
- Vitest bench mode known issues: https://github.com/vitest-dev/vitest/issues/5953, https://github.com/vitest-dev/vitest/issues/5349
