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
import { VEGA_VIEWPORT_ADJUST } from '../constants';
import { type ViewEventBinder } from '../../deneb-platform';

type VegaEmbedProps = {
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
    root: {
        height: `calc(100% - ${VEGA_VIEWPORT_ADJUST}px)`,
        width: `calc(100% - ${VEGA_VIEWPORT_ADJUST}px)`,
        // Hide vega-embed actions menu (workaround: actions: false doesn't fully work and needs further investigation).
        '& .vega-actions': {
            display: 'none !important'
        },
        // Embed always adds the .has-actions class, which adds padding. Remove it here.
        paddingRight: '0 !important'
    }
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

    const {
        compilation,
        generateRenderId,
        logError,
        values,
        provider,
        setViewReady,
        viewReady
    } = useDenebState((state) => ({
        compilation: state.compilation.result,
        generateRenderId: state.interface.generateRenderId,
        logError: state.compilation.logError,
        values: state.dataset.values,
        provider: state.project.provider,
        setViewReady: state.compilation.setViewReady,
        viewReady: state.compilation.viewReady
    }));

    const { setView } = useVegaView();

    /**
     * Handle successful embed - bind view and initialize signals.
     */
    const handleEmbed = useCallback(
        (result: { view: View; vgSpec?: object }) => {
            logDebug('VegaEmbed: New view created', {
                hasVgSpec: !!result.vgSpec
            });

            // Mark view as NOT ready - datasets/signals won't be populated until runAsync completes
            setViewReady(false);

            // Bind view to services singleton
            VegaViewServices.bind(result.view);

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
        if (!compilation || compilation.status !== 'ready') {
            return null;
        }

        const specProvider = provider === 'vegaLite' ? 'vega-lite' : 'vega';
        const patchedSpec = patchSpecWithData(
            compilation.parsed.spec as object,
            values,
            specProvider
        );

        logDebug('VegaEmbed: Spec ready for embedding', {
            rowCount: values.length
        });

        return patchedSpec;
    }, [compilation, provider]);

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
            loader: vegaLoader ?? undefined
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
