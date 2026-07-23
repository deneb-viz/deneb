import { useCallback, useEffect } from 'react';

import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import {
    SIGNAL_DENEB_CONTAINER,
    type DenebContainerSignal
} from '@deneb-viz/vega-runtime/signals';
import { useDenebState } from '../../state';
import {
    getMeasuredContainerRefresh,
    observeContainerResize
} from './container-size-observer';

export type UseContainerSignalOwnerOptions = {
    /**
     * Whether THIS VisualViewer instance is the single live embed
     * (defect C1). Only the active instance may route geometry through
     * the re-embed action or write the shared `VegaViewServices`
     * singleton's signal.
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
 * SINGLE write authority for container truth
 * (docs/plans/2026-07-23-001-container-signal-consolidation-design.md,
 * Revision 2). Two channels, one owner:
 *
 *  - GEOMETRY (box width/height) → `compilation.refreshContainerDimensions`.
 *    This rewrites the stored compilation result's `denebContainer` init
 *    dims and returns a NEW `result` object; that identity change flows
 *    through `VegaEmbed`'s spec memo into `useVegaEmbed`, which re-embeds
 *    from the ALREADY-COMPILED template. This is a cheap re-embed, not a
 *    signal write: enter-encoded Vega specs only re-run `encode.enter`
 *    geometry when the view is rebuilt (core Vega semantics — enter runs
 *    once per datum for the life of the view), so a signal-only resize
 *    provably resized the canvas but left enter-encoded marks stale (#480
 *    UAT). No other code may call `refreshContainerDimensions`.
 *
 *  - SCROLL (offsets only) → the `denebContainer` Vega signal, written
 *    directly via `VegaViewServices.setSignalByName`. Offsets are runtime
 *    view state, not geometry, so they stay on the cheap signal path — a
 *    full six-field read from the measured element, guarded by
 *    `getMeasuredContainerRefresh`'s value-equal check (the box matches
 *    the init by construction here, so only offset changes get through).
 *    No other code may call `setSignalByName(SIGNAL_DENEB_CONTAINER, …)`.
 *
 * Three triggers feed the two channels:
 *
 *  - ResizeObserver (150ms trailing debounce) — physical box changes,
 *    including host-late iframe resizes (#480 OoF residual) → geometry
 *    channel.
 *  - Post-embed reconcile on `viewReady` — a view is born from the
 *    compiled spec's init dims; if the container differed at embed time
 *    and never changes again, the observer has nothing to see → geometry
 *    channel. Terminates: the re-embedded view's init equals the measured
 *    box, so the next reconcile is a no-op.
 *  - Throttled scroll → scroll channel.
 */
export const useContainerSignalOwner = ({
    isActive,
    viewReady,
    throttledScrollPosition,
    container
}: UseContainerSignalOwnerOptions): void => {
    const refreshContainerDimensions = useDenebState(
        (state) => state.compilation.refreshContainerDimensions
    );

    /**
     * Geometry channel: route box changes through the compilation
     * slice's cheap re-embed. The action + underlying rewrite helper are
     * identity-stable, so value-equal boxes are a no-op there — the
     * zero-dimension guard here just avoids dispatching for a
     * hidden/tearing-down container or a mid-layout partial measurement
     * (0×N / N×0); the observer fires again once layout settles.
     */
    const refreshGeometry = useCallback(() => {
        if (container === null) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === 0 || height === 0) return;
        refreshContainerDimensions({ width, height });
    }, [container, refreshContainerDimensions]);

    /**
     * Scroll channel: offsets are runtime view state, not geometry —
     * they stay a guarded `denebContainer` signal write (full
     * six-field read from the measured element).
     */
    const refreshScrollSignal = useCallback(() => {
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

    // Trigger 1: physical box changes (debounced in the observer) → re-embed.
    useEffect(() => {
        if (!isActive || container === null) return;
        return observeContainerResize(container, refreshGeometry);
    }, [isActive, container, refreshGeometry]);

    // Trigger 2: post-embed reconcile (born-stale case) → re-embed if the
    // box drifted between compile-seed and layout.
    useEffect(() => {
        if (!isActive || !viewReady) return;
        refreshGeometry();
    }, [isActive, viewReady, refreshGeometry]);

    // Trigger 3: throttled scroll → signal write (gated on viewReady —
    // before the view exists there is no signal to update).
    useEffect(() => {
        if (!isActive || !viewReady || throttledScrollPosition === null) return;
        refreshScrollSignal();
    }, [isActive, viewReady, throttledScrollPosition, refreshScrollSignal]);
};
