# Performance Benchmarks for Dataset Processing

## Problem

Deneb processes potentially large datasets (up to 100K+ rows) through a hot path that includes plan building, per-row support field generation, and full dataset mapping. There are no benchmarks to detect performance regressions. Changes to the processing engine (like the support field configuration work) could silently degrade throughput without detection.

## Scope

Add Vitest bench-mode benchmarks for the two key hot-path functions (`buildDataRow` and `getMappedDataset`) across four dataset sizes. Include both absolute ceiling thresholds (hard fail) and relative baseline comparison (fail on regression beyond configurable percentage).

## Benchmark Targets

### `buildDataRow` (data-core)

The per-row function that executes the processing plan. Benchmarked in `@deneb-viz/data-core` using the default provider and a pre-built processing plan.

### `getMappedDataset` (root visual)

The end-to-end orchestrator that builds the plan, loops all rows, handles selection queue and drilldown. Benchmarked in the root visual using mock Power BI DataView structures.

## Dataset Sizes

| Tier | Rows | Rationale |
|---|---|---|
| Small | 100 | Baseline/sanity |
| Medium | 1,000 | Typical dashboard |
| Large | 10,000 | Max Power BI data reduction window |
| Extra large | 100,000 | Incremental fetch scenario |

## Synthetic Data

Each benchmark uses consistent synthetic data:
- 1 column field (text, e.g., category names)
- 1 measure field (numeric, e.g., sales values)
- Processing plan with representative flags (highlight on for measure, format off)
- Default passthrough provider for `buildDataRow` benchmarks
- Mock Power BI `DataViewCategorical` structures for `getMappedDataset` benchmarks

Data is generated once per benchmark file (not per iteration) to avoid allocation noise.

## Threshold System

### Absolute Ceilings (Hard Fail)

Per-benchmark maximum acceptable time. Set initially generous based on profiling, tightened over time. Configured directly in the benchmark file. If a benchmark exceeds its ceiling, the run fails.

### Relative Baselines (Regression Detection)

Baseline results stored as JSON files in `benchmarks/baselines/`. Each benchmark run compares against the stored baseline. Fails if regression exceeds a configurable percentage threshold (default: 20%).

Baselines are committed to the repo and updated manually when intentional performance changes are made (e.g., via a dedicated update command/script).

### Baseline File Format

```json
{
    "buildDataRow/100 rows": { "mean": 0.045, "p75": 0.052 },
    "buildDataRow/1000 rows": { "mean": 0.42, "p75": 0.48 },
    "getMappedDataset/10000 rows": { "mean": 85.2, "p75": 92.1 }
}
```

Values in milliseconds. Comparison uses `mean` by default.

## File Structure

```
packages/data-core/
    src/lib/support-fields/__bench__/
        build-data-row.bench.ts          # buildDataRow benchmarks
    vitest.config.ts                     # Add bench config

src/lib/dataset/
    __bench__/
        get-mapped-dataset.bench.ts      # getMappedDataset benchmarks

benchmarks/
    baselines/
        data-core.json                   # buildDataRow baselines
        dataset-processing.json          # getMappedDataset baselines
    threshold.config.ts                  # Shared threshold configuration
```

## Integration

- `npm run bench` — runs all benchmarks across the monorepo via Turbo
- Benchmarks are separate from `npm run test` (different semantics, slower)
- Turbo task `bench` added to `turbo.json` for package-level orchestration
- Can be added to CI as a gate later

## Output

Vitest bench produces per-benchmark: ops/sec, mean, p75, p99, standard deviation. The threshold checks run as a post-bench assertion step comparing results against absolute ceilings and stored baselines.

## Testing

No tests for the benchmarks themselves — they are the performance tests. Verify by running `npm run bench` and confirming output includes all four tiers for both functions, with threshold pass/fail status.
