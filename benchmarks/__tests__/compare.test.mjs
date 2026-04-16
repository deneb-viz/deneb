import { describe, expect, it } from 'vitest';
import {
    EXIT_ERROR,
    EXIT_OK,
    EXIT_REGRESSION,
    MASS_MISMATCH_FRACTION,
    MIN_SAMPLE_COUNT,
    buildBaselinePayload,
    buildMeta,
    classifyResults,
    compare,
    detectMassMismatch,
    detectRunnerImage,
    findMissingFromCurrent,
    ingestVitestOutput,
    isCiSource,
    renderDriftWarnings,
    renderSummary,
    renderTable,
    validateHz
} from '../compare.mjs';

// =========================================================================
// Test helpers
// =========================================================================

const sampleVitestOutput = (benches) => ({
    files: [
        {
            filepath: '/some/path/to/build-data-row.bench.ts',
            groups: [
                {
                    fullName: 'build-data-row.bench.ts > buildDataRow > field-only',
                    benchmarks: benches
                }
            ]
        }
    ]
});

const validBench = (overrides = {}) => ({
    id: 'x',
    name: '1000 rows',
    rank: 1,
    rme: 0.5,
    hz: 1000,
    mean: 1.0,
    p75: 1.2,
    p99: 1.5,
    sampleCount: 100,
    ...overrides
});

const makeCurrent = (entries) => ({
    entries: new Map(Object.entries(entries))
});

const makeBaseline = (benchmarks, meta = {}) => ({
    _meta: meta,
    benchmarks
});

// =========================================================================
// validateHz
// =========================================================================

describe('validateHz', () => {
    it('accepts positive finite numbers including very small values', () => {
        expect(validateHz(1).ok).toBe(true);
        expect(validateHz(1e-10).ok).toBe(true);
        expect(validateHz(2_000_000).ok).toBe(true);
    });

    it('rejects NaN', () => {
        const res = validateHz(NaN);
        expect(res.ok).toBe(false);
        expect(res.ok === false && res.reason).toContain('NaN');
    });

    it('rejects Infinity', () => {
        expect(validateHz(Infinity).ok).toBe(false);
        expect(validateHz(-Infinity).ok).toBe(false);
    });

    it('rejects zero', () => {
        expect(validateHz(0).ok).toBe(false);
    });

    it('rejects negative values', () => {
        expect(validateHz(-1).ok).toBe(false);
    });

    it('rejects non-number types', () => {
        expect(validateHz('1000').ok).toBe(false);
        expect(validateHz(null).ok).toBe(false);
        expect(validateHz(undefined).ok).toBe(false);
        expect(validateHz({}).ok).toBe(false);
    });
});

// =========================================================================
// ingestVitestOutput
// =========================================================================

describe('ingestVitestOutput', () => {
    it('produces flat entries keyed by fullName + " > " + name', () => {
        const res = ingestVitestOutput(sampleVitestOutput([validBench()]));
        expect(res.errors).toEqual([]);
        expect(res.entries.size).toBe(1);
        const [key] = [...res.entries.keys()];
        expect(key).toBe(
            'build-data-row.bench.ts > buildDataRow > field-only > 1000 rows'
        );
    });

    it('extracts hz, mean_ms, p75_ms, sampleCount', () => {
        const res = ingestVitestOutput(
            sampleVitestOutput([validBench({ hz: 42, mean: 3.5, p75: 4.1, sampleCount: 200 })])
        );
        const entry = [...res.entries.values()][0];
        expect(entry).toEqual({ hz: 42, mean_ms: 3.5, p75_ms: 4.1, sampleCount: 200 });
    });

    it('rejects zero hz as an error (not silent pass)', () => {
        const res = ingestVitestOutput(sampleVitestOutput([validBench({ hz: 0 })]));
        expect(res.errors.length).toBe(1);
        expect(res.errors[0]).toContain('hz');
        expect(res.entries.size).toBe(0);
    });

    it('rejects NaN hz as an error', () => {
        const res = ingestVitestOutput(sampleVitestOutput([validBench({ hz: NaN })]));
        expect(res.errors.length).toBe(1);
        expect(res.errors[0]).toContain('NaN');
    });

    it('rejects negative hz', () => {
        const res = ingestVitestOutput(sampleVitestOutput([validBench({ hz: -100 })]));
        expect(res.errors.length).toBe(1);
    });

    it('rejects Infinity hz', () => {
        const res = ingestVitestOutput(sampleVitestOutput([validBench({ hz: Infinity })]));
        expect(res.errors.length).toBe(1);
    });

    it('rejects missing hz', () => {
        const bench = validBench();
        delete bench.hz;
        const res = ingestVitestOutput(sampleVitestOutput([bench]));
        expect(res.errors.length).toBe(1);
    });

    it('rejects non-number hz (string)', () => {
        const res = ingestVitestOutput(sampleVitestOutput([validBench({ hz: '1000' })]));
        expect(res.errors.length).toBe(1);
    });

    it('detects duplicate keys within a single run', () => {
        const res = ingestVitestOutput(
            sampleVitestOutput([validBench({ name: 'same' }), validBench({ name: 'same', hz: 2000 })])
        );
        expect(res.errors.length).toBe(1);
        expect(res.errors[0]).toContain('duplicate key');
    });

    it('warns on low sampleCount (< MIN_SAMPLE_COUNT) without failing', () => {
        const res = ingestVitestOutput(
            sampleVitestOutput([validBench({ sampleCount: MIN_SAMPLE_COUNT - 1 })])
        );
        expect(res.errors).toEqual([]);
        expect(res.warnings.length).toBe(1);
        expect(res.warnings[0]).toContain('sampleCount');
        expect(res.entries.size).toBe(1);
    });

    it('warns when bench name contains the " > " separator', () => {
        const res = ingestVitestOutput(
            sampleVitestOutput([validBench({ name: 'bad > name' })])
        );
        expect(res.warnings.some((w) => w.includes('"bad > name"'))).toBe(true);
    });

    it('errors on unexpected JSON shape (missing files[])', () => {
        const res = ingestVitestOutput({ not: 'vitest shape' });
        expect(res.errors.length).toBe(1);
        expect(res.errors[0]).toContain('unexpected JSON shape');
    });

    it('errors on non-object input', () => {
        expect(ingestVitestOutput(null).errors.length).toBe(1);
        expect(ingestVitestOutput('string').errors.length).toBe(1);
        expect(ingestVitestOutput(42).errors.length).toBe(1);
    });
});

// =========================================================================
// compare
// =========================================================================

describe('compare', () => {
    it('happy path: identical hz → all PASS', () => {
        const baseline = makeBaseline({ a: { hz: 100 }, b: { hz: 200 } });
        const current = makeCurrent({ a: { hz: 100 }, b: { hz: 200 } });
        const results = compare({ baseline, current, defaultThreshold: 20 });
        expect(results.every((r) => r.status === 'PASS')).toBe(true);
    });

    it('flags REGRESSION when deltaPct > threshold', () => {
        const baseline = makeBaseline({ a: { hz: 100 } });
        const current = makeCurrent({ a: { hz: 74 } }); // 26% slower
        const results = compare({ baseline, current, defaultThreshold: 20 });
        expect(results[0]?.status).toBe('REGRESSION');
        expect(results[0]?.deltaPct).toBeCloseTo(26, 1);
    });

    it('uses strict `>` threshold semantics (not >=)', () => {
        // threshold - 1e-9 passes; threshold + 1e-9 fails
        const baseline = makeBaseline({ a: { hz: 100 } });
        // Compute hz such that deltaPct = 20 - 1e-9 (just under)
        const justUnder = makeCurrent({ a: { hz: 100 - (20 - 1e-9) } });
        const justOver = makeCurrent({ a: { hz: 100 - (20 + 1e-9) } });
        expect(
            compare({ baseline, current: justUnder, defaultThreshold: 20 })[0]?.status
        ).toBe('PASS');
        expect(
            compare({ baseline, current: justOver, defaultThreshold: 20 })[0]?.status
        ).toBe('REGRESSION');
    });

    it('improvement (higher hz) reports PASS, never REGRESSION', () => {
        const baseline = makeBaseline({ a: { hz: 100 } });
        const current = makeCurrent({ a: { hz: 500 } }); // 5x faster
        const results = compare({ baseline, current, defaultThreshold: 20 });
        expect(results[0]?.status).toBe('PASS');
        expect(results[0]?.deltaPct).toBeLessThan(0);
    });

    it('per-benchmark threshold override beats CLI default', () => {
        const baseline = makeBaseline({
            a: { hz: 100, threshold: 5 } // stricter than CLI default
        });
        const current = makeCurrent({ a: { hz: 90 } }); // 10% slower
        const results = compare({ baseline, current, defaultThreshold: 20 });
        expect(results[0]?.status).toBe('REGRESSION');
        expect(results[0]?.effectiveThreshold).toBe(5);
    });

    it('flags NEW for keys only in current results', () => {
        const baseline = makeBaseline({});
        const current = makeCurrent({ a: { hz: 100 } });
        const results = compare({ baseline, current, defaultThreshold: 20 });
        expect(results[0]?.status).toBe('NEW');
    });

    it('flags MISSING for keys only in baseline', () => {
        const baseline = makeBaseline({ a: { hz: 100 } });
        const current = makeCurrent({});
        const results = compare({ baseline, current, defaultThreshold: 20 });
        expect(results[0]?.status).toBe('MISSING');
    });
});

// =========================================================================
// detectMassMismatch
// =========================================================================

describe('detectMassMismatch', () => {
    it('returns true when >50% of baseline keys are MISSING or NEW', () => {
        const baseline = makeBaseline({ a: { hz: 100 }, b: { hz: 200 } });
        const results = [
            { key: 'a', status: 'MISSING', baselineHz: 100 },
            { key: 'b', status: 'MISSING', baselineHz: 200 }
        ];
        expect(detectMassMismatch(results, baseline)).toBe(true);
    });

    it('returns false for normal PASS/REGRESSION mix', () => {
        const baseline = makeBaseline({ a: { hz: 100 }, b: { hz: 200 }, c: { hz: 300 } });
        const results = [
            { key: 'a', status: 'PASS' },
            { key: 'b', status: 'REGRESSION' },
            { key: 'c', status: 'PASS' }
        ];
        expect(detectMassMismatch(results, baseline)).toBe(false);
    });

    it('returns false when baseline is empty (first run)', () => {
        expect(detectMassMismatch([], makeBaseline({}))).toBe(false);
    });

    it(`uses the ${MASS_MISMATCH_FRACTION * 100}% threshold`, () => {
        const baseline = makeBaseline({
            a: { hz: 1 },
            b: { hz: 2 },
            c: { hz: 3 },
            d: { hz: 4 }
        });
        // exactly 50% missing — threshold is strict `>`, not `>=`, so should NOT trip
        const results = [
            { key: 'a', status: 'MISSING' },
            { key: 'b', status: 'MISSING' },
            { key: 'c', status: 'PASS' },
            { key: 'd', status: 'PASS' }
        ];
        expect(detectMassMismatch(results, baseline)).toBe(false);
    });
});

// =========================================================================
// classifyResults
// =========================================================================

describe('classifyResults', () => {
    it('counts each status category', () => {
        const results = [
            { status: 'PASS' },
            { status: 'PASS' },
            { status: 'REGRESSION' },
            { status: 'NEW' },
            { status: 'MISSING' },
            { status: 'MISSING' }
        ];
        expect(classifyResults(results)).toEqual({
            pass: 2,
            regressions: 1,
            newKeys: 1,
            missing: 2
        });
    });
});

// =========================================================================
// findMissingFromCurrent (update mode superset check)
// =========================================================================

describe('findMissingFromCurrent', () => {
    it('returns keys in baseline but not in current', () => {
        const baseline = makeBaseline({ a: { hz: 1 }, b: { hz: 2 }, c: { hz: 3 } });
        const current = makeCurrent({ a: { hz: 1 }, c: { hz: 3 } });
        expect(findMissingFromCurrent(baseline, current)).toEqual(['b']);
    });

    it('returns empty array when current is a superset', () => {
        const baseline = makeBaseline({ a: { hz: 1 } });
        const current = makeCurrent({ a: { hz: 1 }, b: { hz: 2 } });
        expect(findMissingFromCurrent(baseline, current)).toEqual([]);
    });
});

// =========================================================================
// detectRunnerImage / isCiSource
// =========================================================================

describe('runner fingerprint', () => {
    it('returns "ImageOS-ImageVersion" when both env vars are set', () => {
        expect(
            detectRunnerImage({ ImageOS: 'ubuntu22', ImageVersion: '20240818.1.0' })
        ).toBe('ubuntu22-20240818.1.0');
    });

    it('falls back to "local-<platform>" when env vars are absent', () => {
        expect(detectRunnerImage({}, 'darwin')).toBe('local-darwin');
        expect(detectRunnerImage({}, 'win32')).toBe('local-win32');
    });

    it('falls back to local when only one env var is present', () => {
        expect(detectRunnerImage({ ImageOS: 'ubuntu22' }, 'linux')).toBe('local-linux');
        expect(detectRunnerImage({ ImageVersion: '1.0' }, 'linux')).toBe('local-linux');
    });

    it('isCiSource requires both ImageOS and ImageVersion', () => {
        expect(isCiSource({ ImageOS: 'ubuntu22', ImageVersion: '1.0' })).toBe(true);
        expect(isCiSource({ ImageOS: 'ubuntu22' })).toBe(false);
        expect(isCiSource({})).toBe(false);
    });
});

// =========================================================================
// buildMeta / buildBaselinePayload
// =========================================================================

describe('buildMeta', () => {
    it('includes capturedAt as ISO timestamp', () => {
        const now = new Date('2026-04-16T12:34:56Z');
        const meta = buildMeta({
            runnerImage: 'ubuntu22-1.0',
            nodeVersion: 'v22.0.0',
            vitestVersion: '3.2.4',
            commitSha: 'abc123',
            now
        });
        expect(meta.capturedAt).toBe('2026-04-16T12:34:56.000Z');
    });

    it('preserves all fields from inputs', () => {
        const meta = buildMeta({
            runnerImage: 'ubuntu22-1.0',
            nodeVersion: 'v22.0.0',
            vitestVersion: '3.2.4',
            commitSha: 'abc123',
            now: new Date('2026-01-01T00:00:00Z')
        });
        expect(meta).toMatchObject({
            runnerImage: 'ubuntu22-1.0',
            nodeVersion: 'v22.0.0',
            vitestVersion: '3.2.4',
            commitSha: 'abc123'
        });
    });
});

describe('buildBaselinePayload', () => {
    it('wraps entries under `benchmarks` with `_meta`', () => {
        const entries = new Map([['a', { hz: 100, mean_ms: 1, p75_ms: 1.5, sampleCount: 50 }]]);
        const meta = { capturedAt: 'now', runnerImage: 'x' };
        const payload = buildBaselinePayload({ entries, meta });
        expect(payload._meta).toBe(meta);
        expect(payload.benchmarks.a).toEqual({ hz: 100, mean_ms: 1, p75_ms: 1.5 });
    });

    it('preserves per-benchmark threshold from previous baseline', () => {
        const entries = new Map([['a', { hz: 100, mean_ms: 1, p75_ms: 1.5, sampleCount: 50 }]]);
        const previousBaseline = makeBaseline({ a: { hz: 90, threshold: 5 } });
        const payload = buildBaselinePayload({
            entries,
            meta: {},
            previousBaseline
        });
        expect(payload.benchmarks.a.threshold).toBe(5);
        // hz updated to current, not preserved
        expect(payload.benchmarks.a.hz).toBe(100);
    });

    it('drops threshold when previous baseline has no override', () => {
        const entries = new Map([['a', { hz: 100, mean_ms: 1, p75_ms: 1.5, sampleCount: 50 }]]);
        const previousBaseline = makeBaseline({ a: { hz: 90 } });
        const payload = buildBaselinePayload({
            entries,
            meta: {},
            previousBaseline
        });
        expect(payload.benchmarks.a.threshold).toBeUndefined();
    });
});

// =========================================================================
// rendering
// =========================================================================

describe('renderTable', () => {
    it('produces a markdown table with header + divider + rows', () => {
        const results = [
            { key: 'a', status: 'PASS', baselineHz: 100, currentHz: 102, deltaPct: -2 },
            { key: 'b', status: 'REGRESSION', baselineHz: 200, currentHz: 150, deltaPct: 25 }
        ];
        const out = renderTable(results);
        const lines = out.split('\n');
        expect(lines[0]).toContain('Benchmark');
        expect(lines[1]).toContain('---');
        expect(lines).toHaveLength(4);
        expect(out).toContain('REGRESSION');
        expect(out).toContain('PASS');
    });

    it('sorts rows alphabetically by key', () => {
        const results = [
            { key: 'z', status: 'PASS', baselineHz: 1, currentHz: 1, deltaPct: 0 },
            { key: 'a', status: 'PASS', baselineHz: 1, currentHz: 1, deltaPct: 0 }
        ];
        const out = renderTable(results);
        const lines = out.split('\n');
        expect(lines[2]).toContain('| a |');
        expect(lines[3]).toContain('| z |');
    });

    it('formats hz values with k/M suffixes', () => {
        const results = [
            { key: 'a', status: 'PASS', baselineHz: 2_000_000, currentHz: 1_500, deltaPct: 0 }
        ];
        const out = renderTable(results);
        expect(out).toContain('2.00M');
        expect(out).toContain('1.50k');
    });
});

describe('renderSummary', () => {
    it('pluralizes "regression" correctly', () => {
        expect(renderSummary({ pass: 10, regressions: 0, newKeys: 0, missing: 0 })).toContain(
            '0 regressions'
        );
        expect(renderSummary({ pass: 10, regressions: 1, newKeys: 0, missing: 0 })).toContain(
            '1 regression,'
        );
        expect(renderSummary({ pass: 10, regressions: 2, newKeys: 0, missing: 0 })).toContain(
            '2 regressions'
        );
    });
});

describe('renderDriftWarnings', () => {
    it('warns on runnerImage mismatch', () => {
        const warnings = renderDriftWarnings({
            baselineMeta: { runnerImage: 'ubuntu22-1' },
            currentMeta: { runnerImage: 'ubuntu24-2' }
        });
        expect(warnings.length).toBe(1);
        expect(warnings[0]).toContain('runnerImage differs');
    });

    it('warns on vitestVersion mismatch', () => {
        const warnings = renderDriftWarnings({
            baselineMeta: { vitestVersion: '3.2.4' },
            currentMeta: { vitestVersion: '3.3.0' }
        });
        expect(warnings.length).toBe(1);
        expect(warnings[0]).toContain('vitestVersion differs');
    });

    it('emits no warnings when values match', () => {
        const warnings = renderDriftWarnings({
            baselineMeta: { runnerImage: 'x', vitestVersion: '3.2.4' },
            currentMeta: { runnerImage: 'x', vitestVersion: '3.2.4' }
        });
        expect(warnings).toEqual([]);
    });

    it('emits no warnings when baselineMeta is missing', () => {
        const warnings = renderDriftWarnings({
            baselineMeta: null,
            currentMeta: { runnerImage: 'x' }
        });
        expect(warnings).toEqual([]);
    });
});

// =========================================================================
// Exit code constants
// =========================================================================

describe('exit code constants', () => {
    it('are stable values the CI pipeline depends on', () => {
        // These are load-bearing for .github/workflows — regressions break CI.
        expect(EXIT_OK).toBe(0);
        expect(EXIT_REGRESSION).toBe(1);
        expect(EXIT_ERROR).toBe(2);
    });
});
