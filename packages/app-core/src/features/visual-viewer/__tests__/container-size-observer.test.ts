// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    CONTAINER_RESIZE_DEBOUNCE_MS,
    getMeasuredContainerRefresh,
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

describe('getMeasuredContainerRefresh', () => {
    /**
     * jsdom computes no layout — box metrics and scroll offsets are
     * stubbed. Unlike the legacy wrapper-measured builder, the
     * measured element here IS the scroll container, so its own
     * offsets are authoritative.
     */
    const buildMeasuredContainer = (metrics: {
        clientWidth: number;
        clientHeight: number;
        scrollWidth?: number;
        scrollHeight?: number;
        scrollTop?: number;
        scrollLeft?: number;
    }): HTMLElement => {
        const container = document.createElement('div');
        Object.defineProperties(container, {
            clientWidth: { value: metrics.clientWidth },
            clientHeight: { value: metrics.clientHeight },
            scrollWidth: { value: metrics.scrollWidth ?? metrics.clientWidth },
            scrollHeight: {
                value: metrics.scrollHeight ?? metrics.clientHeight
            }
        });
        // scrollTop/scrollLeft are writable on real elements; jsdom
        // allows plain assignment.
        container.scrollTop = metrics.scrollTop ?? 0;
        container.scrollLeft = metrics.scrollLeft ?? 0;
        return container;
    };

    const currentSignal = {
        width: 949,
        height: 682,
        scrollWidth: 949,
        scrollHeight: 1200,
        scrollTop: 250,
        scrollLeft: 10
    };

    it('reads all six fields from the measured scroll container', () => {
        const container = buildMeasuredContainer({
            clientWidth: 949,
            clientHeight: 710,
            scrollHeight: 1400,
            scrollTop: 300,
            scrollLeft: 5
        });
        const refresh = getMeasuredContainerRefresh(container, currentSignal);
        expect(refresh?.value).toEqual({
            width: 949,
            height: 710,
            scrollWidth: 949,
            scrollHeight: 1400,
            scrollTop: 300,
            scrollLeft: 5
        });
    });

    it('a container scrolled back to 0 yields offset 0 — no stale preservation', () => {
        const container = buildMeasuredContainer({
            clientWidth: 949,
            clientHeight: 682,
            scrollHeight: 1200,
            scrollTop: 0,
            scrollLeft: 0
        });
        const refresh = getMeasuredContainerRefresh(container, currentSignal);
        expect(refresh?.value.scrollTop).toBe(0);
        expect(refresh?.value.scrollLeft).toBe(0);
    });

    it('returns null when there is no current signal (no live view yet)', () => {
        const container = buildMeasuredContainer({
            clientWidth: 949,
            clientHeight: 710
        });
        expect(getMeasuredContainerRefresh(container, undefined)).toBeNull();
    });

    it('returns null for a 0×0 container (hidden or tearing down)', () => {
        const container = buildMeasuredContainer({
            clientWidth: 0,
            clientHeight: 0
        });
        expect(
            getMeasuredContainerRefresh(container, currentSignal)
        ).toBeNull();
    });

    it('returns null for a partial-zero container (mid-layout 0×N / N×0)', () => {
        const zeroWidth = buildMeasuredContainer({
            clientWidth: 0,
            clientHeight: 682
        });
        const zeroHeight = buildMeasuredContainer({
            clientWidth: 949,
            clientHeight: 0
        });
        expect(
            getMeasuredContainerRefresh(zeroWidth, currentSignal)
        ).toBeNull();
        expect(
            getMeasuredContainerRefresh(zeroHeight, currentSignal)
        ).toBeNull();
    });

    it('returns null when the measured value equals the current signal', () => {
        const container = buildMeasuredContainer({
            clientWidth: 949,
            clientHeight: 682,
            scrollHeight: 1200,
            scrollTop: 250,
            scrollLeft: 10
        });
        expect(
            getMeasuredContainerRefresh(container, currentSignal)
        ).toBeNull();
    });
});
