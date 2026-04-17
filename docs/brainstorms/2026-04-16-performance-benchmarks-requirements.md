# Performance Benchmarks for Dataset Processing — Requirements

**Date:** 2026-04-16
**Status:** Draft
**Supersedes:** `docs/brainstorms/2026-03-30-performance-benchmarks-design.md`

## Problem

Deneb processes potentially large datasets (up to 100K+ rows) through a hot path that includes plan building and per-row support field generation. There are no benchmarks to detect performance regressions. Changes to the processing engine could silently degrade throughput without detection.

Additionally, the 2.0 refactor introduced the `buildProcessingPlan`/`buildDataRow` pattern, replacing the 1.9 inline processing. There is no data confirming the refactor maintained or improved throughput.

## Goals

1. **Regression detection**: CI benchmarks that report (and eventually gate) when performance degrades beyond a threshold
2. **Cross-version validation**: One-time 1.9 baseline capture to confirm 2.0 didn't regress overall dataset processing throughput
3. **Scaling visibility**: Benchmark across multiple data sizes to catch non-linear performance degradation

## Non-Goals

- Benchmarking `getMappedDataset` end-to-end (heavy Power BI runtime mocking for unclear value — revisit later if needed)
- Ongoing benchmark maintenance in the 1.9 branch
- Real-time performance monitoring or profiling instrumentation

## Benchmark Targets

### `buildDataRow` (data-core)

The per-row function that executes the processing plan. Pure function with injectable provider — easy to benchmark cleanly. This is the inner hot loop and scales with row count.

**Tiers (row count):**

| Tier | Rows | Rationale |
|---|---|---|
| Medium | 1,000 | Typical dashboard dataset |
| Large | 10,000 | Max Power BI data reduction window |
| Extra large | 100,000 | Incremental fetch / stress scenario |

**Instruction variants (each tier runs both):**

| Variant | Plan composition | Rationale |
|---|---|---|
| Field-only | All field instructions | Baseline — simpler code path |
| With parameters | Mix of field + parameter group instructions | Exercises allocation-heavy `.map()` branch |

### `buildProcessingPlan` (data-core)

Runs once before the row loop. O(fields), not O(rows). Cheap for typical field counts but could regress with many fields.

**Tiers (field count):**

| Tier | Fields | Rationale |
|---|---|---|
| Minimal | 2 | Baseline — one column, one measure |
| Typical | 10 | Realistic dashboard field count |
| Stress | 50 | Unrealistic but catches non-linear scaling |

**Composition variants:**

| Variant | Field mix | Rationale |
|---|---|---|
| Fields only | All regular fields | Baseline path |
| With parameter groups | Some fields grouped into parameters | Exercises Set construction / grouping loop |

## Synthetic Data

Each benchmark uses consistent synthetic data generated once per file (not per iteration) to avoid allocation noise:

- Column fields: text values (e.g., category names)
- Measure fields: numeric values (e.g., sales values)
- Processing plan with representative flags (highlight on for measures, format on)
- Two provider variants for `buildDataRow` benchmarks:
  - **Passthrough** (default) — measures plan-execution overhead only
  - **Realistic mock** — simple non-trivial operations (e.g., string concat for formatted values, arithmetic for highlight) to approximate real Power BI cost
- Field metadata arrays with support field configuration for `buildProcessingPlan` benchmarks

## Threshold System

### Comparison Mechanism

Vitest's `bench` mode does not natively support baseline comparison with gating. A post-bench Node script handles enforcement:

1. Vitest bench emits results via `--outputJson` (or equivalent reporter)
2. A Node script reads the current run output and the committed baseline JSON
3. For each benchmark, compares `hz` (operations/second) against the baseline
4. Exits non-zero if any benchmark falls below baseline by more than the configured threshold

Script location: `benchmarks/compare.mjs` (or similar — finalize in planning).

### Relative Baselines (Regression Detection)

Baseline results stored as JSON files in `benchmarks/baselines/`, generated from CI runner. Each PR benchmark run compares against the stored baseline. Fails if `hz` regression exceeds a configurable percentage threshold (default: 20%).

Baselines are committed to the repo. Updated by re-running benchmarks on the CI runner when intentional performance changes are made. Baselines are the single source of truth — no separate absolute ceiling mechanism is maintained.

**Bootstrap:** Before the first baseline is committed, benchmarks run in report-only mode. Once the first baseline is committed to the repo, the comparison gate activates (advisory initially — see Integration).

### Baseline File Format

```json
{
    "buildDataRow/1000 rows": { "hz": 2380.95, "mean_ms": 0.42 },
    "buildDataRow/10000 rows": { "hz": 243.90, "mean_ms": 4.1 },
    "buildDataRow/100000 rows": { "hz": 23.81, "mean_ms": 42.0 },
    "buildProcessingPlan/2 fields": { "hz": 100000, "mean_ms": 0.01 },
    "buildProcessingPlan/10 fields": { "hz": 33333, "mean_ms": 0.03 },
    "buildProcessingPlan/50 fields": { "hz": 8333, "mean_ms": 0.12 }
}
```

Values use `hz` (operations/second) for comparison — more stable across hardware variance than absolute time. Millisecond values stored for reference but not used for regression gating.

## 1.9 Cross-Version Baseline

**Purpose:** One-time capture from the stable 1.9 branch to establish a baseline for validating that the 2.0 refactor maintained or improved end-to-end dataset mapping throughput.

**Approach:**
1. Check out the 1.9 branch (may require pinning Node version and resolving dependency compatibility — see note below)
2. Add a temporary benchmark file targeting the 1.9 equivalent of end-to-end dataset mapping (coarse granularity — 1.9 doesn't have the `buildDataRow`/`buildProcessingPlan` separation)
3. Use synthetic data with the same field composition as the 2.0 benchmarks to ensure data parity across versions
4. Run benchmarks at the same 3 row tiers (1K, 10K, 100K)
5. Commit results as `benchmarks/1.9-reference.md` in the 2.0 branch before submitting for review
6. No ongoing maintenance — this is a one-time data point

**Note:** The 1.9 branch was built with a different toolchain (potentially different Node version, lockfileVersion 2). Getting it to build may require extra effort. Time-box this task; if the full 1.9 build is impractical, extract the relevant processing function into a standalone file in 2.0 instead.

**Comparison:** The 1.9 numbers will be at a coarser granularity (end-to-end dataset mapping) vs. 2.0's per-function benchmarks. The comparison is directional and informational, not a CI-automated gate.

## File Structure

```
packages/data-core/
    src/lib/support-fields/__bench__/
        build-data-row.bench.ts          # buildDataRow benchmarks (3 row tiers)
        build-processing-plan.bench.ts   # buildProcessingPlan benchmarks (3 field tiers)
    vitest.config.ts                     # New: test + bench config (bench include: __bench__/**/*.bench.ts)

benchmarks/
    baselines/
        data-core.json                   # Committed baselines from CI
    1.9-reference.md                     # One-time 1.9 baseline numbers (informational)
```

Regression threshold percentage (default 20%) is co-located in each benchmark file — no shared config module until a second package adds benchmarks. The `benchmarks/compare.mjs` script (referenced in the Threshold System section) reads threshold values from the benchmark definitions or the baseline file.

## Integration

- `npm run bench` — runs all benchmarks across the monorepo via Turbo
- Benchmarks are separate from `npm run test` (different semantics, slower)
- Turbo task `bench` added to `turbo.json` with `dependsOn: ["^build"]` (mirrors the `test` task)
- CI runs benchmarks on PRs after the build step and compares against committed baselines
- **Initial rollout is advisory** — CI step uses `continue-on-error: true` so benchmarks report regressions but don't block merges. Promote to a hard gate once baseline stability is confirmed (target: after 2-4 weeks of observation)
- Baseline update is a manual step (run benchmarks on CI, commit new baselines)

## Success Criteria

### Benchmark Infrastructure
1. `npm run bench` runs both benchmark suites and reports ops/sec, mean, p75 for all tiers
2. CI pipeline includes benchmark step that compares against committed baselines

### CI Regression Detection
3. Benchmark step fails on regression beyond configured threshold from committed baseline

### One-Time Acceptance (Manual)
4. 1.9 reference numbers captured and stored as `benchmarks/1.9-reference.md` in 2.0 branch
5. 2.0 `buildDataRow` throughput at 10K rows is directionally comparable to 1.9 end-to-end throughput at 10K rows (human-reviewed, not CI-gated)
