import { useCallback, useEffect } from 'react';

import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import {
    SIGNAL_DENEB_CONTAINER,
    type DenebContainerSignal
} from '@deneb-viz/vega-runtime/signals';
import {
    getMeasuredContainerRefresh,
    observeContainerResize
} from './container-size-observer';

export type UseContainerSignalOwnerOptions = {
    /**
     * Whether THIS VisualViewer instance is the single live embed
     * (defect C1). Only the active instance may write the shared
     * `VegaViewServices` singleton's signal.
     */
    isActive: boolean;
    /** Embed-in-flight window flag from the compilation slice. */
    viewReady: boolean;
    /**
     * Already-throttled scroll position (VisualViewer's existing
     * `useThrottle(scrollPosition, scrollEventThrottle)` output).
     * Identity changes per throttled scroll tick; used purely as an
     * effect trigger — field values are re-read from the element.
     */
    throttledScrollPosition: {
        scrollTop: number;
        scrollLeft: number;
    } | null;
    /**
     * The measured scroll container: the OverlayScrollbars viewport
     * (`#deneb-vega-container`) or the plain fallback div when
     * scrollbars are disabled. Null until the element exists (the
     * scrollbars component initializes with `defer`) — effects re-run
     * when it arrives.
     */
    container: HTMLElement | null;
};

/**
 * SINGLE write authority for the `denebContainer` signal
 * (docs/plans/2026-07-23-001-container-signal-consolidation-design.md).
 * Merges three triggers into one guarded write path, all six fields
 * measured from the one scroll-container element:
 *
 *  - ResizeObserver (150ms trailing debounce) — physical box changes,
 *    including host-late iframe resizes (#480 OoF residual).
 *  - Throttled scroll — offset changes.
 *  - Post-embed reconcile on `viewReady` — a view is born from the
 *    compiled spec's init dims; if the container differed at embed
 *    time and never changes again, the observer has nothing to see.
 *
 * No other code may call `setSignalByName(SIGNAL_DENEB_CONTAINER, …)`.
 */
export const useContainerSignalOwner = ({
    isActive,
    viewReady,
    throttledScrollPosition,
    container
}: UseContainerSignalOwnerOptions): void => {
    const refresh = useCallback(() => {
        if (container === null) return;
        const result = getMeasuredContainerRefresh(
            container,
            VegaViewServices.getSignalByName(SIGNAL_DENEB_CONTAINER) as
                | DenebContainerSignal
                | undefined
        );
        if (result === null) return;
        VegaViewServices.setSignalByName(result.name, result.value);
    }, [container]);

    // Trigger 1: physical box changes (debounced in the observer).
    useEffect(() => {
        if (!isActive || container === null) return;
        return observeContainerResize(container, refresh);
    }, [isActive, container, refresh]);

    // Trigger 2: post-embed reconcile (born-stale case).
    useEffect(() => {
        if (!isActive || !viewReady) return;
        refresh();
    }, [isActive, viewReady, refresh]);

    // Trigger 3: throttled scroll. Gated on viewReady like the
    // pre-consolidation scroll effect — before the view exists there
    // is no signal to update.
    useEffect(() => {
        if (!isActive || !viewReady || throttledScrollPosition === null) return;
        refresh();
    }, [isActive, viewReady, throttledScrollPosition, refresh]);
};
