import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { View } from 'vega';
import { logDebug } from '@deneb-viz/utils/logging';
import { VegaViewServices } from '../service';

// service.ts imports only `logDebug` from this module; stub it so we can assert
// the internal debug-log sink is used and keep test output quiet.
vi.mock('@deneb-viz/utils/logging', () => ({
    logDebug: vi.fn()
}));

/**
 * Minimal stand-in for a Vega `View`. Only the members the service touches are
 * implemented; each test supplies just the behaviour it exercises.
 */
type FakeView = {
    getState?: (opts: unknown) => unknown;
    signal?: (name: string, value?: unknown) => unknown;
    runAsync?: () => Promise<unknown>;
    data?: (name: string, values?: unknown) => unknown;
};

const bindFakeView = (fake: FakeView) => {
    VegaViewServices.bind(fake as unknown as View);
};

beforeEach(() => {
    vi.mocked(logDebug).mockClear();
});

afterEach(() => {
    VegaViewServices.clearView();
});

describe('VegaViewServices.setSignalByName (M6 — no floating runAsync)', () => {
    it('does not set the signal or run the view when the signal does not exist', () => {
        const signal = vi.fn();
        const runAsync = vi.fn(() => Promise.resolve());
        bindFakeView({ getState: () => ({ signals: {} }), signal, runAsync });

        const result = VegaViewServices.setSignalByName('missing', 1);

        expect(signal).not.toHaveBeenCalled();
        expect(runAsync).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
    });

    it('sets the signal and runs the view when the signal exists (happy path, sink untouched)', async () => {
        const signal = vi.fn();
        const runAsync = vi.fn(() => Promise.resolve());
        const onError = vi.fn();
        bindFakeView({
            getState: () => ({ signals: { mySignal: 0 } }),
            signal,
            runAsync
        });

        await VegaViewServices.setSignalByName('mySignal', 42, onError);

        expect(signal).toHaveBeenCalledWith('mySignal', 42);
        expect(runAsync).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();
    });

    it('routes a runAsync rejection to the onError sink and settles (nothing unhandled)', async () => {
        const error = new Error('dataflow boom');
        const onError = vi.fn();
        bindFakeView({
            getState: () => ({ signals: { mySignal: 0 } }),
            signal: vi.fn(),
            runAsync: () => Promise.reject(error)
        });

        // The returned promise resolving (not rejecting) proves the rejection
        // was caught inside the service — no unhandled rejection escapes.
        await expect(
            VegaViewServices.setSignalByName('mySignal', 1, onError)
        ).resolves.toBeUndefined();

        expect(onError).toHaveBeenCalledWith(error);
    });

    it('swallows a runAsync rejection into the debug log when no sink is provided', async () => {
        bindFakeView({
            getState: () => ({ signals: { mySignal: 0 } }),
            signal: vi.fn(),
            runAsync: () => Promise.reject(new Error('dataflow boom'))
        });

        await expect(
            VegaViewServices.setSignalByName('mySignal', 1)
        ).resolves.toBeUndefined();

        expect(vi.mocked(logDebug)).toHaveBeenCalled();
    });
});

describe('VegaViewServices.getDatasetPresence (L3 — absent vs failed lookup)', () => {
    it("returns 'error' when no view is bound", () => {
        VegaViewServices.clearView();
        expect(VegaViewServices.getDatasetPresence('dataset')).toBe('error');
    });

    it("returns 'present' when the view exposes the named dataset", () => {
        bindFakeView({
            getState: () => ({ data: { dataset: [{ a: 1 }], source_0: [] } })
        });
        expect(VegaViewServices.getDatasetPresence('dataset')).toBe('present');
    });

    it("returns 'absent' when the state read succeeds but the dataset is not present", () => {
        bindFakeView({ getState: () => ({ data: { source_0: [] } }) });
        expect(VegaViewServices.getDatasetPresence('dataset')).toBe('absent');
    });

    it("returns 'error' (not 'absent') when reading the view state throws", () => {
        bindFakeView({
            getState: () => {
                throw new Error('corrupt view');
            }
        });
        expect(VegaViewServices.getDatasetPresence('dataset')).toBe('error');
    });
});
