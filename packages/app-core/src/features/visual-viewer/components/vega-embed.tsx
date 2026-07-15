import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useVegaEmbed, useVegaView } from '@deneb-viz/vega-react';
import { makeStyles } from '@fluentui/react-components';
import { type Loader, type TooltipHandler, type View } from 'vega';
import { Handler as VegaTooltipHandler } from 'vega-tooltip';

import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { VegaPatternFillServices } from '@deneb-viz/vega-runtime/pattern-fill';
import {
    getSignalDenebContainer,
    SIGNAL_DENEB_CONTAINER
} from '@deneb-viz/vega-runtime/signals';
import { patchSpecWithData } from '@deneb-viz/vega-runtime/spec-processing';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../state';
import { type ViewEventBinder } from '../../../components/deneb-platform';
import { VEGA_EMBED_ROOT_STYLE } from './vega-embed-styles';
import { getRestrictiveVegaLoader } from './restrictive-loader';

type VegaEmbedProps = {
    /**
     * Whether this is the single live embed instance (defect C1). When false,
     * the `spec` memo returns `null` so `useVegaEmbed` finalizes and clears the
     * view, and this instance runs no view side effects.
     */
    isActive: boolean;
    onRenderingError?: (error: Error) => void;
    onRenderingFinished?: () => void;
    onRenderingStarted?: () => void;
    tooltipHandler?: TooltipHandler;
    vegaLoader?: Loader | null;
    viewEventBinders: ViewEventBinder[];
    viewportHeight: number;
    viewportWidth: number;
};

const useVegaEmbedStyles = makeStyles({
    root: VEGA_EMBED_ROOT_STYLE
});

/**
 * VegaEmbed component - embeds Vega/Vega-Lite specs into the DOM.
 *
 * This is a "dumb" component that:
 * - Embeds when the `compilation` result changes (from Zustand store)
 * - Patches dataset values into the compiled spec before embedding
 * - Manages view lifecycle (bind to VegaViewServices, event handlers, signals)
 *
 * This component does NOT handle incremental data updates - that logic lives in VisualViewer which uses view.data()
 * API directly on the existing view. VegaEmbed only re-embeds when compilation changes (spec/config edits, or when
 * VisualViewer triggers a re-compile for large datasets).
 */
export const VegaEmbed: React.FC<VegaEmbedProps> = ({
    isActive,
    onRenderingError,
    onRenderingFinished,
    onRenderingStarted,
    tooltipHandler,
    vegaLoader,
    viewEventBinders,
    viewportHeight,
    viewportWidth
}) => {
    const classes = useVegaEmbedStyles();
    const embedRef = useRef<HTMLDivElement>(null);

    // Store vega-tooltip Handler instance for when custom tooltip handler is disabled
    const vegaTooltipHandlerRef = useRef<TooltipHandler | null>(null);

    // Track whether we've done the initial embed (to distinguish first render from updates)
    const hasEmbeddedRef = useRef(false);

    // The view THIS instance last bound to the shared `VegaViewServices`
    // singleton. Used as an ownership token: the deactivation-clear effect only
    // wipes the singleton if it still points at this instance's own view, so an
    // inactive/unmounting instance can never clear the OTHER instance's
    // freshly-bound view (defect C1).
    const ownViewRef = useRef<View | null>(null);

    const {
        compilation,
        generateRenderId,
        logError,
        provider,
        setViewReady,
        values,
        viewReady
    } = useDenebState((state) => ({
        compilation: state.compilation.result,
        generateRenderId: state.interface.generateRenderId,
        logError: state.compilation.logError,
        provider: state.project.provider,
        setViewReady: state.compilation.setViewReady,
        values: state.dataset.values,
        viewReady: state.compilation.viewReady
    }));

    const { setView } = useVegaView();

    /**
     * Handle successful embed - bind view and initialize signals.
     */
    const handleEmbed = useCallback(
        (result: { view: View; vgSpec?: object }) => {
            logDebug('VegaEmbed: New view created');

            // NOTE: `setViewReady(false)` is NOT called here. It is driven by a
            // separate effect keyed on the memoized `spec` identity (below), so
            // the false→true transition spans two renders and the in-flight
            // window actually exists. Toggling false→true in this single
            // synchronous callback batched into a no-op, erasing the window
            // (defect #7).

            // Bind view to services singleton
            VegaViewServices.bind(result.view);

            // Record this instance's own view for the ownership-guarded
            // deactivation clear (defect C1).
            ownViewRef.current = result.view;

            // Update pattern fill services for dynamic pattern fills
            VegaPatternFillServices.update();

            // Set view in context for other hooks
            setView(result.view);

            // Mark that we've done an embed
            hasEmbeddedRef.current = true;

            /**
             * Create vega-tooltip Handler instance for fallback if host tooltip handler is disabled. We create this
             * lazily on first embed since we need the view to exist
             */
            if (!vegaTooltipHandlerRef.current) {
                vegaTooltipHandlerRef.current = new VegaTooltipHandler().call;
                logDebug(
                    'VegaEmbed: Created vega-tooltip handler for fallback'
                );
            }

            // Bind view event handlers
            if (viewEventBinders.length > 0) {
                viewEventBinders.forEach((binder) => {
                    binder(result.view);
                });
            }

            // Set log level
            result.view.logLevel(
                (compilation?.embedOptions?.logLevel as number) ?? 0
            );

            // Notify rendering started
            onRenderingStarted?.();

            logDebug('VegaEmbed: View run complete (via vega-embed)');
            setViewReady(true);

            // Generate new renderId to trigger debug pane listeners to reattach to new view
            generateRenderId();

            onRenderingFinished?.();
        },
        [
            viewEventBinders,
            onRenderingStarted,
            onRenderingFinished,
            onRenderingError,
            setView,
            setViewReady,
            generateRenderId,
            logError,
            compilation?.embedOptions?.logLevel
        ]
    );

    /**
     * Handle embed errors.
     */
    const handleError = useCallback(
        (error: Error) => {
            logError(`VegaEmbed error: ${error.message}`);
            setView(null);
            onRenderingError?.(error);
        },
        [onRenderingError, setView, logError]
    );

    /**
     * Get the spec to embed with dataset values patched in; returns `null` if compilation not ready.
     *
     * IMPORTANT: This memo depends on `compilation` only, NOT on `values`. Data changes are handled by VisualViewer
     * via `view.data()` API. VegaEmbed only re-embeds when compilation changes.
     */
    const spec = useMemo(() => {
        // Inactive instance embeds nothing (defect C1). A `null` spec makes
        // `useVegaEmbed` finalize the current view, clear the container, and bump
        // its generation token, so only the live instance holds a running view.
        if (!isActive) {
            return null;
        }

        if (!compilation || compilation.status !== 'ready' || !provider) {
            return null;
        }

        const embedMode = provider === 'vegaLite' ? 'vega-lite' : 'vega';

        // Guard against provider/compilation mismatch during provider switch.
        // When the provider changes (e.g. "Edit Vega Spec"), the memo recalculates
        // before the recompile effect fires. Skip until compilation catches up.
        if (compilation.embedOptions.mode !== embedMode) {
            return null;
        }

        const patchedSpec = patchSpecWithData(
            compilation.parsed.spec as object,
            values,
            provider
        );

        logDebug('VegaEmbed: Spec ready for embedding', {
            rowCount: values.length
        });

        return patchedSpec;
    }, [compilation, provider, isActive]);

    /**
     * Get the embed options. Returns empty object if compilation not ready.
     *
     * IMPORTANT: We include `tooltipHandler` and `vegaLoader` here for the INITIAL embed only. These are NOT in the
     * deps array - changes to them should NOT trigger a re-embed. Instead, we use a separate effect to update tooltip
     * on the existing view.
     */
    const options = useMemo(() => {
        if (!compilation || compilation.status !== 'ready') {
            return {};
        }
        return {
            ...compilation.embedOptions,
            tooltip: tooltipHandler,
            // Fail closed: if the platform supplies no loader, fall back to a
            // restrictive one (data: URIs only) rather than Vega's permissive
            // default, which would fetch arbitrary external URLs (L9).
            loader: vegaLoader ?? getRestrictiveVegaLoader()
        };
    }, [compilation]);

    /**
     * Use the vega-embed hook to manage embedding lifecycle.
     *
     * IMPORTANT: We pass `null` instead of `{}` when spec is not ready. This prevents the hook from attempting to
     * embed an empty spec, which would create a view with no datasets.
     */
    useVegaEmbed({
        ref: embedRef,
        spec: spec,
        options,
        onEmbed: handleEmbed,
        onError: handleError
    });

    /**
     * Open the "embed in flight" window before a new spec embeds.
     *
     * Keyed on the memoized `spec` identity: when a new non-null spec is about
     * to embed, mark the view not-ready. `handleEmbed` flips it back to true
     * once `runAsync()` completes. Because this runs in a separate render from
     * `handleEmbed`, the false→true transition actually spans time (defect #7) —
     * previously both calls happened in one synchronous callback and React
     * batched them into a no-op, so the window never existed and updates landing
     * mid-embed were dropped.
     *
     * Data-only changes do NOT recompute `spec` (its memo deps are
     * `[compilation, provider, isActive]`, not `values`), so this does not fire
     * on the incremental-update path.
     */
    useEffect(() => {
        if (spec) {
            setViewReady(false);
        }
    }, [spec, setViewReady]);

    /**
     * Deactivation clear (defect C1). When this instance stops being the live
     * one, its `spec` goes `null` and `useVegaEmbed` finalizes the view — but
     * the shared `VegaViewServices` singleton and React view state still point
     * at it. Clear them here so a single live view remains.
     *
     * Ownership guard: only clear if the singleton STILL points at the view this
     * instance bound. Otherwise an inactive (or never-active) instance could
     * wipe the OTHER instance's freshly-bound view. Skipped entirely when this
     * instance never bound a view.
     */
    useEffect(() => {
        if (isActive) return;
        if (
            ownViewRef.current &&
            VegaViewServices.getView() === ownViewRef.current
        ) {
            logDebug('VegaEmbed: Deactivated - clearing owned view');
            VegaViewServices.clearView();
            setView(null);
            setViewReady(false);
        }
        // Drop our reference either way: our view (if any) has been finalized by
        // the `spec === null` path in `useVegaEmbed`.
        ownViewRef.current = null;
    }, [isActive, setView, setViewReady]);

    /**
     * Clear view state when compilation has errors (ensures stale view references don't persist when spec is invalid).
     */
    useEffect(() => {
        if (compilation?.status === 'error') {
            logDebug('VegaEmbed: Compilation error - clearing view');
            VegaViewServices.clearView();
            setView(null);
            setViewReady(false);
        }
    }, [compilation?.status, setView, setViewReady]);

    /**
     * Update tooltip handler on existing view when user toggles tooltip settings.
     *
     * This effect responds to changes in the `tooltipHandler` prop, which now only changes when:
     * - User toggles "Enable tooltips" setting (enableTooltips)
     * - User changes tooltip delay setting (multiSelectDelay)
     *
     * When `tooltipHandler` becomes undefined (tooltips disabled), we restore the default vega-tooltip handler to show
     * tooltips based on the spec's tooltip encoding.
     */
    useEffect(() => {
        const view = VegaViewServices.getView();
        // Don't run on initial mount - the initial handler is set via embed options
        if (!view || !hasEmbeddedRef.current) return;

        if (tooltipHandler) {
            logDebug('VegaEmbed: Switching to custom tooltip handler');
            view.tooltip(tooltipHandler);
        } else if (vegaTooltipHandlerRef.current) {
            logDebug('VegaEmbed: Switching to vega-tooltip default handler');
            view.tooltip(vegaTooltipHandlerRef.current);
        }

        // Re-run the view to apply the tooltip change and prevent blank view
        view.runAsync().catch((error) => {
            logError(
                `VegaEmbed: Failed to run view after tooltip update: ${error.message}`
            );
        });
    }, [tooltipHandler, logError]);

    /**
     * Log rendering for debugging.
     */
    useEffect(() => {
        logRender('VegaEmbed', {
            hasCompilation: !!compilation,
            compilationStatus: compilation?.status,
            viewportHeight,
            viewportWidth
        });
    }, [compilation, viewportHeight, viewportWidth]);

    /**
     * Update `denebContainer` signal when viewport changes.
     * This handles responsive sizing when the container is resized.
     */
    useEffect(() => {
        // Don't update signal until view is ready (runAsync completed)
        if (!embedRef.current || !viewReady) return;

        if (
            VegaViewServices.getSignalByName(SIGNAL_DENEB_CONTAINER) ===
            undefined
        ) {
            return;
        }

        const signal = getSignalDenebContainer({
            container: embedRef.current,
            scroll: {
                scrollTop: embedRef.current.scrollTop,
                scrollLeft: embedRef.current.scrollLeft
            }
        });

        VegaViewServices.setSignalByName(signal.name, signal.value);
    }, [viewportHeight, viewportWidth, viewReady]);

    return <div ref={embedRef} className={classes.root} />;
};
