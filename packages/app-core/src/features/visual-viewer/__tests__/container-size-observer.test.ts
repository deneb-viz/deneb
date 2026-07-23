// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    CONTAINER_RESIZE_DEBOUNCE_MS,
    isSameDenebContainerValue,
    observeContainerResize
} from '../container-size-observer';

/**
 * jsdom does not implement ResizeObserver; a minimal recording stub is
 * installed per-test so the module's observe/disconnect wiring and the
 * trailing-debounce behaviour can be driven deterministically with fake
 * timers.
 */
class ResizeObserverStub {
    static instances: ResizeObserverStub[] = [];
    callback: ResizeObserverCallback;
    observed: Element[] = [];
    disconnected = false;
    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        ResizeObserverStub.instances.push(this);
    }
    observe(target: Element) {
        this.observed.push(target);
    }
    disconnect() {
        this.disconnected = true;
    }
    unobserve() {}
    /** Simulate the browser delivering a resize notification. */
    fire() {
        this.callback([], this as unknown as ResizeObserver);
    }
}

describe('observeContainerResize', () => {
    beforeEach(() => {
        ResizeObserverStub.instances = [];
        vi.stubGlobal('ResizeObserver', ResizeObserverStub);
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    const arrange = (debounceMs?: number) => {
        const container = document.createElement('div');
        const onResize = vi.fn();
        const dispose = observeContainerResize(container, onResize, debounceMs);
        const observer = ResizeObserverStub.instances[0];
        return { container, onResize, dispose, observer };
    };

    it('observes the given container element', () => {
        const { container, observer } = arrange();
        expect(observer.observed).toEqual([container]);
    });

    it('invokes onResize once after the debounce window elapses', () => {
        const { onResize, observer } = arrange();
        observer.fire();
        expect(onResize).not.toHaveBeenCalled();
        vi.advanceTimersByTime(CONTAINER_RESIZE_DEBOUNCE_MS);
        expect(onResize).toHaveBeenCalledTimes(1);
    });

    it('coalesces a burst of notifications into a single trailing call', () => {
        const { onResize, observer } = arrange();
        observer.fire();
        vi.advanceTimersByTime(CONTAINER_RESIZE_DEBOUNCE_MS - 1);
        observer.fire();
        vi.advanceTimersByTime(CONTAINER_RESIZE_DEBOUNCE_MS - 1);
        observer.fire();
        expect(onResize).not.toHaveBeenCalled();
        vi.advanceTimersByTime(CONTAINER_RESIZE_DEBOUNCE_MS);
        expect(onResize).toHaveBeenCalledTimes(1);
    });

    it('honours a caller-supplied debounce duration', () => {
        const { onResize, observer } = arrange(500);
        observer.fire();
        vi.advanceTimersByTime(499);
        expect(onResize).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(onResize).toHaveBeenCalledTimes(1);
    });

    it('dispose cancels a pending trailing call and disconnects the observer', () => {
        const { onResize, dispose, observer } = arrange();
        observer.fire();
        dispose();
        vi.advanceTimersByTime(CONTAINER_RESIZE_DEBOUNCE_MS * 2);
        expect(onResize).not.toHaveBeenCalled();
        expect(observer.disconnected).toBe(true);
    });
});

describe('isSameDenebContainerValue', () => {
    const base = {
        width: 949,
        height: 710,
        scrollWidth: 949,
        scrollHeight: 710,
        scrollTop: 0,
        scrollLeft: 0
    };

    it('returns true for value-identical container signals', () => {
        expect(isSameDenebContainerValue(base, { ...base })).toBe(true);
    });

    it('returns false when any dimension differs', () => {
        expect(isSameDenebContainerValue(base, { ...base, height: 682 })).toBe(
            false
        );
    });

    it('returns false when the current signal value is undefined', () => {
        expect(isSameDenebContainerValue(undefined, base)).toBe(false);
    });
});
