/**
 * Diagnostic instrumentation for editor↔viewer transitions.
 *
 * Captures per-animation-frame samples of the iframe's interior size
 * (`window.innerWidth/Height`) and the host-reported viewport
 * (`options.viewport.width/Height`) for `TRACE_DURATION_MS` after a
 * transition trigger, alongside host events recorded via
 * `logHostEvent`. The full timeline is batched into a single
 * `logDebug` call when the trace window closes.
 *
 * Development-only — gated by `LOG_LEVEL=DEBUG` (or higher) via the
 * project's `logDebug` helper. Removed before merge per the plan's
 * cleanup unit (U6) in
 * docs/plans/2026-05-04-001-fix-editor-viewer-transition-bounce-plan.md.
 *
 * Recovered from PR #657's pre-squash history (description preserved
 * in docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md).
 * Extended to fire on the editor → viewer (exit) direction, which the
 * parent investigation did not capture.
 */

import { logDebug } from '@deneb-viz/utils/logging';

type Viewport = { width: number; height: number } | undefined;

type TraceSample = {
    /** ms since trace start */
    t: number;
    iw: number;
    ih: number;
    vw: number | undefined;
    vh: number | undefined;
};

type TraceEvent = {
    /** ms since trace start */
    t: number;
    type: string;
    payload?: Record<string, unknown>;
};

type ActiveTrace = {
    label: string;
    startedAt: number;
    samples: TraceSample[];
    events: TraceEvent[];
    rafId: number;
    timeoutId: ReturnType<typeof setTimeout>;
    getViewport: () => Viewport;
};

const TRACE_DURATION_MS = 2000;

let active: ActiveTrace | null = null;

const finishTrace = (): void => {
    if (!active) return;
    cancelAnimationFrame(active.rafId);
    clearTimeout(active.timeoutId);
    const { label, samples, events } = active;
    active = null;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const iwMatchSample = samples.find(
        (s) => s.vw !== undefined && s.iw === s.vw
    );
    const summary = {
        label,
        sampleCount: samples.length,
        eventCount: events.length,
        firstFrame: first,
        lastFrame: last,
        firstIwEqualsVwAtMs: iwMatchSample?.t
    };
    logDebug(`[edit-transition-trace:${label}]`, summary, { samples, events });
};

/**
 * Begin a new trace window. If a trace is already active, it is
 * finished and dumped before the new one starts. The supplied
 * `getViewport` callback is invoked once per animation frame to read
 * the latest host-reported viewport (typically a ref into the
 * visual's update options).
 */
export const startEditTransitionTrace = (
    label: string,
    getViewport: () => Viewport
): void => {
    if (active) finishTrace();
    const startedAt = performance.now();
    const trace: ActiveTrace = {
        label,
        startedAt,
        samples: [],
        events: [],
        rafId: 0,
        timeoutId: setTimeout(finishTrace, TRACE_DURATION_MS),
        getViewport
    };
    const sample = () => {
        if (active !== trace) return;
        const v = trace.getViewport();
        trace.samples.push({
            t: Math.round(performance.now() - trace.startedAt),
            iw: window.innerWidth,
            ih: window.innerHeight,
            vw: v?.width,
            vh: v?.height
        });
        trace.rafId = requestAnimationFrame(sample);
    };
    trace.rafId = requestAnimationFrame(sample);
    active = trace;
};

/**
 * Record a host-driven event in the active trace, if any. Calls
 * outside an active trace window are no-ops.
 */
export const logHostEvent = (
    type: string,
    payload?: Record<string, unknown>
): void => {
    if (!active) return;
    active.events.push({
        t: Math.round(performance.now() - active.startedAt),
        type,
        payload
    });
};
