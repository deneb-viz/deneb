import { useEffect, useState, type RefObject } from 'react';

/**
 * Number of consecutive identical-width ResizeObserver callbacks required
 * before a container is considered "settled". Two is the minimum useful
 * value: one observation establishes the width, the second confirms the
 * host animation has stopped changing it.
 */
const REQUIRED_STABLE_OBSERVATIONS = 2;

export type StabilityState = 'pending' | 'settled';

export interface StabilityTracker {
    observe(width: number): StabilityState;
}

/**
 * Pure tracker shared by `useContainerStable` and its tests.
 *
 * Tracks how many consecutive ResizeObserver callbacks have reported the
 * same positive width, and reports `'settled'` once the threshold is
 * crossed. Width values of zero or below never count as stable — those
 * represent a detached or zero-sized container which should not release
 * the gate.
 */
export const createStabilityTracker = (): StabilityTracker => {
    let lastWidth: number | null = null;
    let consecutiveSame = 0;
    return {
        observe(width: number): StabilityState {
            if (width <= 0) return 'pending';
            if (width === lastWidth) {
                consecutiveSame += 1;
            } else {
                lastWidth = width;
                consecutiveSame = 1;
            }
            return consecutiveSame >= REQUIRED_STABLE_OBSERVATIONS
                ? 'settled'
                : 'pending';
        }
    };
};

/**
 * Quiet-debounce window after the last `ResizeObserver` callback before
 * the container is considered settled.
 *
 * `ResizeObserver` fires when the size *changes*; once an animation ends
 * it simply stops firing. We can't rely on "two consecutive same-width
 * callbacks" alone because the final-width callback is normally the
 * last event RO emits. After this many milliseconds of silence we treat
 * the container as stable.
 *
 * 50ms is short enough that the user perceives no extra lag and long
 * enough to ride out a single dropped animation frame on slow hardware.
 */
const STABILITY_QUIET_DEBOUNCE_MS = 50;

/**
 * Watches a container ref and reports `true` once one of three signals
 * fires, whichever comes first:
 *
 *   1. The tracker reports two consecutive same-width RO callbacks
 *      (rare-but-valid signal — happens when the host fires a duplicate
 *      resize event at animation end).
 *   2. `STABILITY_QUIET_DEBOUNCE_MS` elapses with no new RO callback —
 *      the host animation has stopped (the common path).
 *   3. `upperBoundMs` elapses since the hook mounted — the safety net
 *      for hosts that never fire a single RO callback (older Power BI
 *      quirks, test environments without RO).
 *
 * Once settled the hook never returns to pending — the gate is a
 * one-shot signal per mount.
 */
export const useContainerStable = (
    containerRef: RefObject<HTMLElement | null>,
    upperBoundMs: number
): boolean => {
    const [settled, setSettled] = useState(false);

    useEffect(() => {
        if (settled) return;
        const node = containerRef.current;
        if (!node) return;

        const tracker = createStabilityTracker();
        let quietDebounceId: number | undefined;

        const settleNow = () => {
            setSettled(true);
        };

        const clearQuietDebounce = () => {
            if (quietDebounceId !== undefined) {
                window.clearTimeout(quietDebounceId);
                quietDebounceId = undefined;
            }
        };

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (tracker.observe(entry.contentRect.width) === 'settled') {
                    clearQuietDebounce();
                    settleNow();
                    return;
                }
            }
            // Reset the quiet-debounce on every callback so it only
            // fires after the host has gone silent for long enough.
            clearQuietDebounce();
            quietDebounceId = window.setTimeout(
                settleNow,
                STABILITY_QUIET_DEBOUNCE_MS
            );
        });
        observer.observe(node);

        const upperBoundId = window.setTimeout(settleNow, upperBoundMs);

        return () => {
            observer.disconnect();
            clearQuietDebounce();
            window.clearTimeout(upperBoundId);
        };
    }, [containerRef, upperBoundMs, settled]);

    return settled;
};
