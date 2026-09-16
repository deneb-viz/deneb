import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type Mock
} from 'vitest';

/**
 * Tests for the editor-open-marker module.
 *
 * The module captures performance timings around the viewer→editor transition
 * so that the freeze caused by host-animation-vs-React-mount timing can be
 * measured before and after the fix in subsequent units of the same plan.
 *
 * These tests assert behaviour, not implementation:
 *  - A complete open cycle (start + three stages + flush) produces non-negative
 *    deltas relative to the start, and emits a single structured debug log.
 *  - A new start clears prior cycle state so consecutive opens are independent.
 *  - Calling stage() or flush() without a prior start() does not throw and
 *    surfaces a warning so dropped opens are visible during dev.
 *  - When `globalThis.performance` is unavailable the module falls back to a
 *    timestamp source and tests still pass without errors.
 *  - Logging is gated by the shared @deneb-viz/utils/logging module.
 */

const logDebugMock = vi.fn();
const logWarningMock = vi.fn();

vi.mock('@deneb-viz/utils/logging', () => ({
    logDebug: (...args: unknown[]) => logDebugMock(...args),
    logWarning: (...args: unknown[]) => logWarningMock(...args)
}));

type EditorOpenMarkerModule = typeof import('../editor-open-marker');

const loadModule = async (): Promise<EditorOpenMarkerModule> => {
    vi.resetModules();
    return await import('../editor-open-marker');
};

describe('editor-open-marker', () => {
    let nowSpy: Mock | undefined;

    beforeEach(() => {
        logDebugMock.mockReset();
        logWarningMock.mockReset();
    });

    afterEach(() => {
        if (nowSpy) {
            nowSpy.mockRestore?.();
            nowSpy = undefined;
        }
    });

    /**
     * Replace the `performance.now` reading with a deterministic queue of
     * values. Each successive call to `now()` consumes the next entry, so a
     * test can advance the clock by listing the wall-clock values it expects.
     */
    const stubClock = (values: number[]) => {
        const queue = [...values];
        // Fall back to the last value once the queue is exhausted so unrelated
        // calls inside the module (or its dependencies) do not throw.
        const last = () =>
            queue.length > 0
                ? (queue.shift() as number)
                : (values[values.length - 1] ?? 0);
        nowSpy = vi
            .spyOn(globalThis.performance, 'now')
            .mockImplementation(last);
    };

    describe('happy path: complete open cycle', () => {
        it('emits one structured debug log with non-negative deltas from start', async () => {
            stubClock([100, 110, 360, 540]);
            const marker = await loadModule();

            marker.markEditorOpenStart();
            marker.markEditorOpenStage('editor-mount');
            marker.markEditorOpenStage('content-paint');
            marker.markEditorOpenStage('monaco-ready');
            marker.flushEditorOpenTimings();

            expect(logDebugMock).toHaveBeenCalledTimes(1);
            const [, payload] = logDebugMock.mock.calls[0];
            expect(payload).toMatchObject({
                durations: {
                    'editor-mount': 10,
                    'content-paint': 260,
                    'monaco-ready': 440
                }
            });
            expect(payload.durations['editor-mount']).toBeGreaterThanOrEqual(0);
            expect(payload.durations['content-paint']).toBeGreaterThanOrEqual(
                0
            );
            expect(payload.durations['monaco-ready']).toBeGreaterThanOrEqual(0);
            expect(logWarningMock).not.toHaveBeenCalled();
        });

        it('reports stages individually so a partial flush still surfaces the slowest leg', async () => {
            stubClock([0, 50, 220]);
            const marker = await loadModule();

            marker.markEditorOpenStart();
            marker.markEditorOpenStage('editor-mount');
            marker.markEditorOpenStage('content-paint');
            marker.flushEditorOpenTimings();

            expect(logDebugMock).toHaveBeenCalledTimes(1);
            const [, payload] = logDebugMock.mock.calls[0];
            expect(payload.durations).toEqual({
                'editor-mount': 50,
                'content-paint': 220
            });
            // No 'monaco-ready' should appear in this partial cycle.
            expect(payload.durations['monaco-ready']).toBeUndefined();
        });
    });

    describe('multiple cycles', () => {
        it('clears prior state on start so consecutive opens log independently', async () => {
            stubClock([0, 100, 250, 1000, 1010, 1280]);
            const marker = await loadModule();

            // First cycle
            marker.markEditorOpenStart();
            marker.markEditorOpenStage('editor-mount');
            marker.markEditorOpenStage('content-paint');
            marker.flushEditorOpenTimings();

            // Second cycle — must not include first-cycle stages.
            marker.markEditorOpenStart();
            marker.markEditorOpenStage('editor-mount');
            marker.markEditorOpenStage('content-paint');
            marker.flushEditorOpenTimings();

            expect(logDebugMock).toHaveBeenCalledTimes(2);

            const firstDurations = logDebugMock.mock.calls[0][1].durations;
            const secondDurations = logDebugMock.mock.calls[1][1].durations;

            expect(firstDurations).toEqual({
                'editor-mount': 100,
                'content-paint': 250
            });
            expect(secondDurations).toEqual({
                'editor-mount': 10,
                'content-paint': 280
            });
        });

        it('treats a second start as a soft reset rather than an error', async () => {
            stubClock([0, 50, 200, 400]);
            const marker = await loadModule();

            marker.markEditorOpenStart();
            marker.markEditorOpenStage('editor-mount');
            // Simulate a stray re-flip (e.g. host quirk) that would otherwise
            // confuse the timeline. The next stage should be measured from
            // the second start.
            marker.markEditorOpenStart();
            marker.markEditorOpenStage('editor-mount');
            marker.flushEditorOpenTimings();

            expect(logDebugMock).toHaveBeenCalledTimes(1);
            const [, payload] = logDebugMock.mock.calls[0];
            expect(payload.durations['editor-mount']).toBe(200);
        });
    });

    describe('mis-use is visible but never throws', () => {
        it('warns and no-ops when stage() is called without a prior start', async () => {
            const marker = await loadModule();

            expect(() =>
                marker.markEditorOpenStage('editor-mount')
            ).not.toThrow();
            expect(logWarningMock).toHaveBeenCalledTimes(1);
            expect(logDebugMock).not.toHaveBeenCalled();
        });

        it('warns and no-ops when flush() is called without a prior start', async () => {
            const marker = await loadModule();

            expect(() => marker.flushEditorOpenTimings()).not.toThrow();
            expect(logWarningMock).toHaveBeenCalledTimes(1);
            expect(logDebugMock).not.toHaveBeenCalled();
        });
    });

    describe('environment fallback', () => {
        it('still records and flushes when globalThis.performance is missing', async () => {
            const original = globalThis.performance;
            // @ts-expect-error — deliberately removing the global to simulate
            // environments without performance.now (older Node, sandboxed hosts).
            delete (globalThis as { performance?: Performance }).performance;

            try {
                const marker = await loadModule();

                expect(() => {
                    marker.markEditorOpenStart();
                    marker.markEditorOpenStage('editor-mount');
                    marker.flushEditorOpenTimings();
                }).not.toThrow();

                expect(logDebugMock).toHaveBeenCalledTimes(1);
                const [, payload] = logDebugMock.mock.calls[0];
                expect(
                    payload.durations['editor-mount']
                ).toBeGreaterThanOrEqual(0);
            } finally {
                (globalThis as { performance?: Performance }).performance =
                    original;
            }
        });
    });
});
