import { logDebug, logWarning } from '@deneb-viz/utils/logging';

/**
 * Lightweight performance instrumentation for the viewer > editor open path.
 *
 * The freeze investigated under `docs/plans/2026-05-01-001-perf-resolve-freeze-on-transition-plan.md`
 * is sensitive to where time is spent between four moments:
 *
 *   1. `start`           — the host transitions the visual into editor mode
 *   2. `editor-mount`    — `<DenebEditor>` commits its initial mount
 *   3. `content-paint`   — `<EditorContent>` first paints with a non-zero
 *                          measured container
 *   4. `monaco-ready`    — Monaco's `onMount` callback fires
 *
 * We capture each moment with `performance.now` (falling back to `Date.now`
 * when a sandboxed host strips the global) and emit a single structured
 * `logDebug` line per open cycle. Logging is gated by the shared
 * `LOG_LEVEL` env var via `logDebug`, so the marker is invisible at the
 * default log level and free in production builds where `LOG_LEVEL=0`.
 *
 * Misuse warnings (stage/flush called without a prior start) route
 * through `logWarning` so they are also gated by `LOG_LEVEL` — visible
 * to a developer running with `LOG_LEVEL=WARN`+ but never emitted from
 * a certified build.
 *
 * The module is self-contained singleton state — there is exactly one open
 * cycle in flight per visual instance, and any second start is treated as a
 * soft reset of the prior cycle.
 *
 * Retention note: with `<RetainedDenebEditor>` the `editor-mount`,
 * `content-paint`, and `monaco-ready` stages only fire on the FIRST
 * editor open per visual instance — Monaco, Allotment, and the editor
 * pane layout are all retained and do not re-mount. `markEditorOpenStart`
 * is still called on every transition into editor mode, but the cycle
 * it begins for retained reopens never reaches a flush. The next
 * `markEditorOpenStart` soft-resets the prior cycle's start time. This
 * is intentional: the marker exists to instrument the first-open cold
 * path, which is where the freeze symptom lives. Retained-reopen
 * timings would need a separate signal (e.g. `gate-released`) if a
 * later effort needs to capture them.
 */

const LOG_LABEL = '[editor-open-marker]';

export type EditorOpenStage = 'editor-mount' | 'content-paint' | 'monaco-ready';

const now = (): number => {
    const perf = globalThis.performance;
    if (perf && typeof perf.now === 'function') {
        return perf.now();
    }
    return Date.now();
};

let startTime: number | null = null;
const stageTimestamps = new Map<EditorOpenStage, number>();

const reset = (): void => {
    startTime = null;
    stageTimestamps.clear();
};

/**
 * Record the start of an editor open cycle.
 *
 * Calling this clears any stages from a previous cycle so consecutive
 * viewer→editor transitions log independently. A second call before
 * `flushEditorOpenTimings` is treated as a soft reset rather than an error.
 */
export const markEditorOpenStart = (): void => {
    startTime = now();
    stageTimestamps.clear();
};

/**
 * Record a named stage of the in-flight open cycle.
 *
 * If no prior `markEditorOpenStart` has happened the call is dropped with a
 * `logWarning` (gated by `LOG_LEVEL`) so the misuse is visible during
 * development without disturbing the user-facing flow or leaking into
 * certified builds.
 */
export const markEditorOpenStage = (stage: EditorOpenStage): void => {
    if (startTime === null) {
        logWarning(
            `${LOG_LABEL} stage "${stage}" recorded with no active open cycle — call markEditorOpenStart first.`
        );
        return;
    }
    stageTimestamps.set(stage, now());
};

/**
 * Emit the structured timing log for the in-flight open cycle and clear
 * state so the next start begins a fresh cycle.
 *
 * If no prior `markEditorOpenStart` has happened the call is dropped with a
 * `logWarning` (gated by `LOG_LEVEL`).
 */
export const flushEditorOpenTimings = (): void => {
    if (startTime === null) {
        logWarning(
            `${LOG_LABEL} flush called with no active open cycle — call markEditorOpenStart first.`
        );
        return;
    }
    const durations: Partial<Record<EditorOpenStage, number>> = {};
    for (const [stage, timestamp] of stageTimestamps) {
        durations[stage] = timestamp - startTime;
    }
    logDebug(LOG_LABEL, { durations });
    reset();
};
