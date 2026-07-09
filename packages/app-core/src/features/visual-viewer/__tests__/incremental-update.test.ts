import { describe, expect, it, vi } from 'vitest';
import type { View } from 'vega';
import {
    performIncrementalUpdate,
    resolveDataChangeAction
} from '../incremental-update';

// incremental-update.ts imports only `logDebug` from this module.
vi.mock('@deneb-viz/utils/logging', () => ({
    logDebug: vi.fn()
}));

type Deferred = {
    promise: Promise<unknown>;
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
};

/**
 * Build a minimal fake Vega `View` whose `runAsync()` returns a controllable
 * deferred each call, so a test can hold an update "in flight" and settle it
 * deterministically. `error` is a plain read/write property matching the
 * `ViewWithError` shape the module casts to.
 */
const makeFakeView = (originalError?: (err: Error) => void) => {
    const deferreds: Deferred[] = [];
    const view = {
        error: originalError,
        data: vi.fn(),
        runAsync: vi.fn(() => {
            let resolve!: (value?: unknown) => void;
            let reject!: (reason?: unknown) => void;
            const promise = new Promise<unknown>((res, rej) => {
                resolve = res;
                reject = rej;
            });
            deferreds.push({ promise, resolve, reject });
            return promise;
        })
    };
    return { view, deferreds };
};

/** Flush microtasks + the current macrotask so `.then`/`.catch` chains run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const asView = (view: unknown) => view as unknown as View;

describe('performIncrementalUpdate — happy path', () => {
    it('applies a single data update and restores the original error handler on success', async () => {
        const trueOriginal = vi.fn();
        const { view, deferreds } = makeFakeView(trueOriginal);
        const onFailure = vi.fn();
        const onSuccess = vi.fn();

        performIncrementalUpdate({
            view: asView(view),
            values: [{ a: 1 }],
            onFailure,
            onSuccess
        });

        expect(view.data).toHaveBeenCalledTimes(1);
        expect(view.data).toHaveBeenCalledWith('dataset', [{ a: 1 }]);
        expect(view.runAsync).toHaveBeenCalledTimes(1);
        // Override installed (not the original) while the update is in flight.
        expect(view.error).not.toBe(trueOriginal);

        deferreds[0].resolve(view);
        await flush();

        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onFailure).not.toHaveBeenCalled();
        expect(view.error).toBe(trueOriginal);
    });
});

describe('performIncrementalUpdate — serialization (M7 overlap / revert-check)', () => {
    it('defers a second update that overlaps the first, leaving the TRUE original handler installed', async () => {
        const trueOriginal = vi.fn();
        const { view, deferreds } = makeFakeView(trueOriginal);
        const onFailure1 = vi.fn();
        const onSuccess1 = vi.fn();
        const onFailure2 = vi.fn();
        const onSuccess2 = vi.fn();

        // Update 1 starts; its runAsync() stays pending.
        performIncrementalUpdate({
            view: asView(view),
            values: [{ a: 1 }],
            onFailure: onFailure1,
            onSuccess: onSuccess1
        });
        // Update 2 arrives while update 1's runAsync() is still pending.
        performIncrementalUpdate({
            view: asView(view),
            values: [{ a: 2 }],
            onFailure: onFailure2,
            onSuccess: onSuccess2
        });

        // Serialized: update 2 must not have installed a second override or run
        // the view — it defers to a re-compile via onFailure. (On the pre-fix
        // code, runAsync is called twice here.)
        expect(view.runAsync).toHaveBeenCalledTimes(1);
        expect(onFailure2).toHaveBeenCalledTimes(1);
        expect(onFailure2).toHaveBeenCalledWith(
            expect.stringContaining('concurrent'),
            null
        );

        // Settle both runs (guard deferreds[1] so the assertion is meaningful
        // on the pre-fix path too, where update 2 also ran).
        deferreds[0].resolve(view);
        await flush();
        if (deferreds[1]) {
            deferreds[1].resolve(view);
            await flush();
        }

        expect(onSuccess1).toHaveBeenCalledTimes(1);
        // The corruption this guards: on the pre-fix code update 1's override is
        // left permanently installed. With serialization + token-checked
        // restore, the true original handler is what remains.
        expect(view.error).toBe(trueOriginal);
    });
});

describe('performIncrementalUpdate — failure fallbacks', () => {
    it('falls back on an internal Vega error surfaced via the error handler', async () => {
        const trueOriginal = vi.fn();
        const { view, deferreds } = makeFakeView(trueOriginal);
        const onFailure = vi.fn();
        const onSuccess = vi.fn();

        performIncrementalUpdate({
            view: asView(view),
            values: [{ a: 1 }],
            onFailure,
            onSuccess
        });

        // Simulate Vega routing a dataflow error through the (overridden)
        // handler during runAsync().
        (view.error as (err: Error) => void)(new Error('transform failed'));
        // Original handler still invoked (logging preserved).
        expect(trueOriginal).toHaveBeenCalledTimes(1);

        deferreds[0].resolve(view);
        await flush();

        expect(onSuccess).not.toHaveBeenCalled();
        expect(onFailure).toHaveBeenCalledWith(
            'internal Vega error during update',
            'transform failed'
        );
        expect(view.error).toBe(trueOriginal);
    });

    it('falls back when runAsync rejects', async () => {
        const trueOriginal = vi.fn();
        const { view, deferreds } = makeFakeView(trueOriginal);
        const onFailure = vi.fn();
        const onSuccess = vi.fn();

        performIncrementalUpdate({
            view: asView(view),
            values: [{ a: 1 }],
            onFailure,
            onSuccess
        });

        deferreds[0].reject(new Error('async fail'));
        await flush();

        expect(onSuccess).not.toHaveBeenCalled();
        expect(onFailure).toHaveBeenCalledWith('runAsync rejected', 'async fail');
        expect(view.error).toBe(trueOriginal);
    });

    it('falls back synchronously when view.data throws and releases the in-flight lock', async () => {
        const trueOriginal = vi.fn();
        const { view, deferreds } = makeFakeView(trueOriginal);
        view.data = vi.fn(() => {
            throw new Error('data boom');
        });
        const onFailure = vi.fn();

        performIncrementalUpdate({
            view: asView(view),
            values: [{ a: 1 }],
            onFailure,
            onSuccess: vi.fn()
        });

        expect(onFailure).toHaveBeenCalledWith(
            'exception during update',
            'data boom'
        );
        expect(view.error).toBe(trueOriginal);
        expect(view.runAsync).not.toHaveBeenCalled();

        // The in-flight lock must have been released so a subsequent update on
        // the same view is NOT wrongly treated as an overlap.
        view.data = vi.fn();
        const onSuccess2 = vi.fn();
        performIncrementalUpdate({
            view: asView(view),
            values: [{ a: 2 }],
            onFailure: vi.fn(),
            onSuccess: onSuccess2
        });
        expect(view.runAsync).toHaveBeenCalledTimes(1);

        deferreds[0].resolve(view);
        await flush();
        expect(onSuccess2).toHaveBeenCalledTimes(1);
    });
});

describe('resolveDataChangeAction (L3 routing)', () => {
    it("returns 'ignore' when the dataset is absent (inline/remote data)", () => {
        expect(resolveDataChangeAction('absent', true, 10, 500)).toBe('ignore');
    });

    it("returns 'recompile' when the dataset lookup failed, even for a small enabled update", () => {
        expect(resolveDataChangeAction('error', true, 1, 500)).toBe('recompile');
    });

    it("returns 'incremental' for a present dataset within threshold when enabled", () => {
        expect(resolveDataChangeAction('present', true, 100, 500)).toBe(
            'incremental'
        );
    });

    it("returns 'recompile' for a present dataset when incremental updates are disabled", () => {
        expect(resolveDataChangeAction('present', false, 10, 500)).toBe(
            'recompile'
        );
    });

    it("returns 'recompile' for a present dataset above the threshold", () => {
        expect(resolveDataChangeAction('present', true, 501, 500)).toBe(
            'recompile'
        );
    });

    it('treats the threshold as inclusive (row count == threshold stays incremental)', () => {
        expect(resolveDataChangeAction('present', true, 500, 500)).toBe(
            'incremental'
        );
    });
});
