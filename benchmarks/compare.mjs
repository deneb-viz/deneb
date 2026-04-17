#!/usr/bin/env node
/**
 * Benchmark comparison and baseline management script.
 *
 * Reads Vitest bench --outputJson results and compares each benchmark's
 * `hz` (operations/second) against a committed baseline. Exits non-zero
 * when regressions exceed a threshold.
 *
 * Exit codes:
 *   0 — all benchmarks pass (including NEW / MISSING)
 *   1 — at least one REGRESSION
 *   2 — script error (malformed input, invalid hz, duplicate keys, file
 *       missing, CLI parse error). CI treats this as a hard failure even
 *       during advisory rollout.
 *
 * Usage:
 *   node benchmarks/compare.mjs \
 *     --results <path> \
 *     --baseline <path> \
 *     [--threshold 20] \
 *     [--update] \
 *     [--allow-removed-benches] \
 *     [--force-non-ci]
 *
 * See docs/plans/2026-04-16-001-feat-performance-benchmarks-plan.md (Unit 4).
 */

import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXIT_OK = 0;
export const EXIT_REGRESSION = 1;
export const EXIT_ERROR = 2;

export const SCHEMA_SEPARATOR = ' > ';
export const MIN_SAMPLE_COUNT = 5;
export const MASS_MISMATCH_FRACTION = 0.5;

// =========================================================================
// Ingest — Vitest outputJson → flat key map with validation
// =========================================================================

/**
 * Validate a single `hz` value. Must be a finite, positive, non-zero number.
 * @param {unknown} hz
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateHz(hz) {
    if (typeof hz !== 'number') {
        return { ok: false, reason: `hz is not a number (got ${typeof hz})` };
    }
    if (Number.isNaN(hz)) {
        return { ok: false, reason: 'hz is NaN' };
    }
    if (!Number.isFinite(hz)) {
        return { ok: false, reason: 'hz is not finite (Infinity)' };
    }
    if (hz <= 0) {
        return { ok: false, reason: `hz must be positive (got ${hz})` };
    }
    return { ok: true };
}

/**
 * Walk a Vitest bench outputJson structure and return a flat Map of
 * benchmark entries keyed by `fullName + ' > ' + name`. Collects warnings
 * (low sample count, separator-in-name smell) and errors (invalid hz,
 * duplicate keys, wrong shape).
 *
 * @param {unknown} raw — parsed JSON from vitest bench --outputJson
 * @returns {{
 *   entries: Map<string, { hz: number, mean_ms: number, p75_ms: number, sampleCount: number }>,
 *   warnings: string[],
 *   errors: string[]
 * }}
 */
export function ingestVitestOutput(raw) {
    const warnings = [];
    const errors = [];
    const entries = new Map();

    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.files)) {
        errors.push(
            "unexpected JSON shape: expected { files: [...] } at the top level. Check Vitest version compatibility."
        );
        return { entries, warnings, errors };
    }

    for (const file of raw.files) {
        if (!file || !Array.isArray(file.groups)) continue;
        for (const group of file.groups) {
            if (!group || !Array.isArray(group.benchmarks)) continue;
            const groupFullName = typeof group.fullName === 'string' ? group.fullName : '';
            for (const bench of group.benchmarks) {
                if (!bench || typeof bench !== 'object') continue;
                const name = typeof bench.name === 'string' ? bench.name : '';
                if (!name) continue;
                const key = `${groupFullName}${SCHEMA_SEPARATOR}${name}`;

                const hzCheck = validateHz(bench.hz);
                if (!hzCheck.ok) {
                    errors.push(`bench "${key}": ${hzCheck.reason}`);
                    continue;
                }

                if (entries.has(key)) {
                    errors.push(
                        `duplicate key "${key}" — two benchmarks produced the same fullName+name. Rename one.`
                    );
                    continue;
                }

                const sampleCount = typeof bench.sampleCount === 'number' ? bench.sampleCount : 0;
                if (sampleCount >= 0 && sampleCount < MIN_SAMPLE_COUNT) {
                    warnings.push(
                        `bench "${key}": sampleCount=${sampleCount} (< ${MIN_SAMPLE_COUNT}). Result may be statistically weak — consider raising per-bench \`time\` or reducing workload.`
                    );
                }

                if (name.includes(SCHEMA_SEPARATOR)) {
                    warnings.push(
                        `bench name "${name}" contains "${SCHEMA_SEPARATOR}" — may confuse baseline key logic. Rename to use a different separator.`
                    );
                }

                entries.set(key, {
                    hz: bench.hz,
                    mean_ms: typeof bench.mean === 'number' ? bench.mean : 0,
                    p75_ms: typeof bench.p75 === 'number' ? bench.p75 : 0,
                    sampleCount
                });
            }
        }
    }

    return { entries, warnings, errors };
}

// =========================================================================
// Baseline — wrapper format with _meta + benchmarks map
// =========================================================================

/**
 * Compute the runner fingerprint. In GitHub Actions, $ImageOS and
 * $ImageVersion identify the specific runner image build. Outside CI,
 * fall back to `local-<platform>`.
 */
export function detectRunnerImage(env = process.env, platform = process.platform) {
    if (env.ImageOS && env.ImageVersion) {
        return `${env.ImageOS}-${env.ImageVersion}`;
    }
    return `local-${platform}`;
}

/**
 * True when the current environment looks like a CI runner with a
 * fingerprint we can trust. Currently checks for $ImageOS / $ImageVersion
 * (GitHub-hosted runners).
 */
export function isCiSource(env = process.env) {
    return Boolean(env.ImageOS && env.ImageVersion);
}

/**
 * Build a `_meta` object for the baseline file. All fields are provided
 * by callers (no hidden side effects) — the CLI main() resolves them from
 * the environment and passes them in.
 */
export function buildMeta({
    runnerImage,
    nodeVersion,
    vitestVersion,
    commitSha,
    now = new Date()
}) {
    return {
        capturedAt: now.toISOString(),
        runnerImage,
        nodeVersion,
        vitestVersion,
        commitSha
    };
}

/**
 * Serialize ingested entries plus meta into the wrapper baseline format.
 * Existing per-benchmark thresholds (if any) on the PREVIOUS baseline are
 * preserved so a refresh doesn't silently widen thresholds.
 */
export function buildBaselinePayload({ entries, meta, previousBaseline }) {
    const benchmarks = {};
    for (const [key, value] of entries) {
        const entry = {
            hz: value.hz,
            mean_ms: value.mean_ms,
            p75_ms: value.p75_ms
        };
        // Preserve a per-benchmark threshold override from the previous
        // baseline if the key still exists. Otherwise leave unset — CLI
        // threshold applies.
        const prev = previousBaseline?.benchmarks?.[key];
        if (prev && typeof prev.threshold === 'number') {
            entry.threshold = prev.threshold;
        }
        benchmarks[key] = entry;
    }
    return { _meta: meta, benchmarks };
}

// =========================================================================
// Comparison
// =========================================================================

/**
 * Compare ingested current entries against a baseline. Returns a flat
 * array of result records, one per key present in either side.
 *
 * Status values:
 *   PASS        — both present, within threshold
 *   REGRESSION  — both present, deltaPct > effectiveThreshold
 *   NEW         — only in current
 *   MISSING     — only in baseline
 *
 * @param {{
 *   baseline: { _meta?: object, benchmarks: Record<string, { hz: number, threshold?: number }> },
 *   current: { entries: Map<string, { hz: number }> },
 *   defaultThreshold: number
 * }} params
 */
export function compare({ baseline, current, defaultThreshold }) {
    const results = [];
    const baselineKeys = new Set(Object.keys(baseline.benchmarks));
    const currentKeys = new Set(current.entries.keys());
    const allKeys = new Set([...baselineKeys, ...currentKeys]);

    for (const key of allKeys) {
        const b = baseline.benchmarks[key];
        const c = current.entries.get(key);
        if (b && c) {
            const rawThreshold =
                typeof b.threshold === 'number' ? b.threshold : defaultThreshold;
            const effectiveThreshold = rawThreshold >= 0 ? rawThreshold : defaultThreshold;
            const deltaPct = ((b.hz - c.hz) / b.hz) * 100;
            const status = deltaPct > effectiveThreshold ? 'REGRESSION' : 'PASS';
            results.push({
                key,
                status,
                baselineHz: b.hz,
                currentHz: c.hz,
                deltaPct,
                effectiveThreshold
            });
        } else if (b && !c) {
            results.push({ key, status: 'MISSING', baselineHz: b.hz });
        } else if (!b && c) {
            results.push({ key, status: 'NEW', currentHz: c.hz });
        }
    }

    return results;
}

/**
 * Sanity check: if more than 50% of baseline keys are MISSING from the
 * current results, the baseline is likely wholly mismatched (e.g., Vitest
 * changed how fullName is constructed, or a large rename). Reporting 0
 * regressions in that state is a silent-dark failure mode — treat it as
 * a hard error.
 *
 * Only MISSING keys count — NEW keys (benches added in this run but absent
 * from baseline) are a normal additive change and must not inflate the
 * mismatch ratio.
 */
export function detectMassMismatch(results, baseline) {
    const total = Object.keys(baseline.benchmarks).length;
    if (total === 0) return false;
    let missingCount = 0;
    for (const r of results) {
        if (r.status === 'MISSING') missingCount++;
    }
    return missingCount / total > MASS_MISMATCH_FRACTION;
}

/**
 * Classify results into counts for the summary line.
 */
export function classifyResults(results) {
    let pass = 0,
        regressions = 0,
        newKeys = 0,
        missing = 0;
    for (const r of results) {
        if (r.status === 'PASS') pass++;
        else if (r.status === 'REGRESSION') regressions++;
        else if (r.status === 'NEW') newKeys++;
        else if (r.status === 'MISSING') missing++;
    }
    return { pass, regressions, newKeys, missing };
}

// =========================================================================
// Rendering
// =========================================================================

function formatHz(hz) {
    if (typeof hz !== 'number') return '—';
    if (hz >= 1_000_000) return (hz / 1_000_000).toFixed(2) + 'M';
    if (hz >= 1_000) return (hz / 1_000).toFixed(2) + 'k';
    return hz.toFixed(2);
}

function formatDelta(deltaPct) {
    if (typeof deltaPct !== 'number') return '—';
    const sign = deltaPct >= 0 ? '+' : '';
    return `${sign}${deltaPct.toFixed(2)}%`;
}

/**
 * Render the markdown comparison table. Status column uses plain-text
 * tokens so it's terminal-safe and ANSI-free.
 */
export function renderTable(results) {
    const header = '| Benchmark | Baseline hz | Current hz | Δ% | Status |';
    const divider = '|---|---|---|---|---|';
    const rows = results
        .slice()
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((r) => {
            const baselineHz = formatHz(r.baselineHz);
            const currentHz = formatHz(r.currentHz);
            const delta = formatDelta(r.deltaPct);
            return `| ${r.key} | ${baselineHz} | ${currentHz} | ${delta} | ${r.status} |`;
        });
    return [header, divider, ...rows].join('\n');
}

export function renderSummary(classification) {
    const { pass, regressions, newKeys, missing } = classification;
    return `${pass} pass, ${regressions} regression${regressions === 1 ? '' : 's'}, ${newKeys} new, ${missing} missing`;
}

/**
 * Render a warning banner when runner fingerprint or Vitest version
 * differ between baseline capture and current run.
 */
export function renderDriftWarnings({ baselineMeta, currentMeta }) {
    const warnings = [];
    if (!baselineMeta) return warnings;
    if (
        baselineMeta.runnerImage &&
        currentMeta.runnerImage &&
        baselineMeta.runnerImage !== currentMeta.runnerImage
    ) {
        warnings.push(
            `⚠ runnerImage differs: baseline "${baselineMeta.runnerImage}" vs current "${currentMeta.runnerImage}" — hardware drift may look like code regression.`
        );
    }
    if (
        baselineMeta.vitestVersion &&
        currentMeta.vitestVersion &&
        baselineMeta.vitestVersion !== currentMeta.vitestVersion
    ) {
        warnings.push(
            `⚠ vitestVersion differs: baseline "${baselineMeta.vitestVersion}" vs current "${currentMeta.vitestVersion}" — unexpected MISSING/NEW patterns may follow.`
        );
    }
    return warnings;
}

// =========================================================================
// Update mode — superset check
// =========================================================================

/**
 * Return the list of keys present in the baseline but absent from the
 * current results (i.e., keys that would be LOST if we blindly overwrote
 * the baseline with the current run).
 */
export function findMissingFromCurrent(baseline, current) {
    const missing = [];
    for (const key of Object.keys(baseline.benchmarks)) {
        if (!current.entries.has(key)) missing.push(key);
    }
    return missing;
}

// =========================================================================
// Environment helpers (CLI-only, thin wrappers over Node built-ins)
// =========================================================================

/**
 * Read the installed Vitest version from node_modules. Falls back to
 * 'unknown' if it can't be resolved — never throws.
 */
export async function readVitestVersion(
    pathResolver = (p) => resolve(process.cwd(), p)
) {
    try {
        const pkg = JSON.parse(
            await readFile(pathResolver('node_modules/vitest/package.json'), 'utf-8')
        );
        return typeof pkg.version === 'string' ? pkg.version : 'unknown';
    } catch {
        return 'unknown';
    }
}

/**
 * Resolve the current commit SHA via `git rev-parse HEAD`. Falls back to
 * 'unknown' if git isn't available — never throws.
 */
export function readCommitSha() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        return 'unknown';
    }
}

// =========================================================================
// CLI entrypoint
// =========================================================================

async function main(argv) {
    let values;
    try {
        ({ values } = parseArgs({
            args: argv.slice(2),
            options: {
                results: { type: 'string' },
                baseline: { type: 'string' },
                threshold: { type: 'string', default: '20' },
                update: { type: 'boolean', default: false },
                'allow-removed-benches': { type: 'boolean', default: false },
                'force-non-ci': { type: 'boolean', default: false }
            },
            strict: true,
            allowPositionals: false
        }));
    } catch (e) {
        console.error(`CLI parse error: ${e.message}`);
        console.error(
            'Usage: node benchmarks/compare.mjs --results <path> --baseline <path> [--threshold 20] [--update] [--allow-removed-benches] [--force-non-ci]'
        );
        return EXIT_ERROR;
    }

    if (!values.results) {
        console.error('--results <path> is required');
        return EXIT_ERROR;
    }
    if (!values.baseline) {
        console.error('--baseline <path> is required');
        return EXIT_ERROR;
    }

    const threshold = Number(values.threshold);
    if (!Number.isFinite(threshold) || Number.isNaN(threshold) || threshold < 0) {
        console.error(`--threshold must be a non-negative finite number (got "${values.threshold}")`);
        return EXIT_ERROR;
    }

    // Load current results
    let currentJson;
    try {
        const text = await readFile(values.results, 'utf-8');
        currentJson = JSON.parse(text);
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.error(`results file not found at ${values.results}`);
        } else if (e instanceof SyntaxError) {
            console.error(`results file is not valid JSON: ${e.message}`);
        } else {
            console.error(`failed to load results: ${e.message}`);
        }
        return EXIT_ERROR;
    }

    const ingest = ingestVitestOutput(currentJson);
    for (const warn of ingest.warnings) console.warn(`warning: ${warn}`);
    if (ingest.errors.length > 0) {
        for (const err of ingest.errors) console.error(`error: ${err}`);
        return EXIT_ERROR;
    }

    // Load baseline (if exists)
    let baseline = null;
    if (existsSync(values.baseline)) {
        try {
            baseline = JSON.parse(await readFile(values.baseline, 'utf-8'));
        } catch (e) {
            console.error(`baseline file is not valid JSON: ${e.message}`);
            return EXIT_ERROR;
        }
        if (!baseline || typeof baseline !== 'object' || !baseline.benchmarks) {
            console.error(
                `baseline file has unexpected shape: expected { _meta, benchmarks } wrapper. Got keys: ${baseline ? Object.keys(baseline).join(', ') : '(not object)'}`
            );
            return EXIT_ERROR;
        }
    }

    if (values.update) {
        return handleUpdate({
            current: ingest,
            baseline,
            baselinePath: values.baseline,
            allowRemovedBenches: values['allow-removed-benches'],
            forceNonCi: values['force-non-ci']
        });
    }

    return handleCompare({
        current: ingest,
        baseline,
        baselinePath: values.baseline,
        defaultThreshold: threshold
    });
}

export async function handleCompare({ current, baseline, baselinePath, defaultThreshold }) {
    if (!baseline) {
        console.log(`no baseline found at ${baselinePath} — treating as first run.`);
        return EXIT_OK;
    }

    const results = compare({ baseline, current, defaultThreshold });

    if (detectMassMismatch(results, baseline)) {
        console.error(
            `baseline appears wholly mismatched — more than ${MASS_MISMATCH_FRACTION * 100}% of baseline keys are MISSING or NEW in current results. Likely a Vitest schema change or major bench rename. Refresh required.`
        );
        return EXIT_ERROR;
    }

    const currentMeta = {
        runnerImage: detectRunnerImage(),
        vitestVersion: await readVitestVersion()
    };
    const driftWarnings = renderDriftWarnings({
        baselineMeta: baseline._meta,
        currentMeta
    });
    for (const w of driftWarnings) console.warn(w);

    console.log(renderTable(results));
    const classification = classifyResults(results);
    console.log('');
    console.log(renderSummary(classification));

    return classification.regressions > 0 ? EXIT_REGRESSION : EXIT_OK;
}

export async function handleUpdate({ current, baseline, baselinePath, allowRemovedBenches, forceNonCi }) {
    // CI-source enforcement
    if (!isCiSource() && !forceNonCi) {
        console.error(
            'refusing to update baseline from non-CI source: ImageOS/ImageVersion not detected. Use --force-non-ci to override (not recommended — produces a baseline that will drift against CI runs).'
        );
        return EXIT_ERROR;
    }

    // Superset check
    if (baseline && !allowRemovedBenches) {
        const missing = findMissingFromCurrent(baseline, current);
        if (missing.length > 0) {
            console.error(
                `refusing to update baseline: the following ${missing.length} keys exist in the current baseline but are missing from current results. This would truncate the baseline silently. Pass --allow-removed-benches if the removal is intentional.`
            );
            for (const key of missing) console.error(`  MISSING: ${key}`);
            return EXIT_ERROR;
        }
    }

    // Build new baseline
    const meta = buildMeta({
        runnerImage: detectRunnerImage(),
        nodeVersion: process.version,
        vitestVersion: await readVitestVersion(),
        commitSha: readCommitSha()
    });
    const payload = buildBaselinePayload({
        entries: current.entries,
        meta,
        previousBaseline: baseline
    });

    // Ensure parent dir exists
    await mkdir(dirname(baselinePath), { recursive: true });
    await writeFile(baselinePath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');

    console.log(`wrote baseline to ${baselinePath}`);
    console.log(`  entries: ${current.entries.size}`);
    console.log(`  runnerImage: ${meta.runnerImage}`);
    console.log(`  commitSha: ${meta.commitSha}`);
    return EXIT_OK;
}

// Run main() only when this file is executed directly (not when imported
// by tests). Windows-safe: compare the resolved path, not raw argv.
const scriptPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (scriptPath === invokedPath) {
    main(process.argv).then(
        (code) => process.exit(code),
        (e) => {
            console.error('unexpected error:', e);
            process.exit(EXIT_ERROR);
        }
    );
}
