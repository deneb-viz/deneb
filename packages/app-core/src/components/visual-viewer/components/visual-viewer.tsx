import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useThrottle } from '@uidotdev/usehooks';
import { makeStyles, mergeClasses } from '@fluentui/react-components';
import {
    OverlayScrollbarsComponent,
    type OverlayScrollbarsComponentRef
} from 'overlayscrollbars-react';
import type { EventListeners, PartialOptions } from 'overlayscrollbars';
import 'overlayscrollbars/overlayscrollbars.css';

import { DEFAULT_VIEWPORT_SCALE } from '@deneb-viz/configuration';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import type { SchemaValidator } from '@deneb-viz/vega-runtime/spec-processing';
import type { Renderers } from 'vega';
import { getSignalDenebContainer } from '@deneb-viz/vega-runtime/signals';
import { logRender, logDebug } from '@deneb-viz/utils/logging';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { VegaEmbed } from './vega-embed';
import { VegaEmbedErrorBoundary } from './vega-embed-error-boundary';
import { VEGA_CONTAINER_ID } from '../constants';
import { performIncrementalUpdate } from '../incremental-update';
import { useDenebState } from '../../../state';
import { useDenebPlatformProvider } from '../../deneb-platform';
import { INCREMENTAL_UPDATE_CONFIGURATION } from '../../../lib/vega/incremental-update-configuration';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import { getScrollbarStyleVars } from '../../../lib/scrollbars/scrollbar-style-vars';

/**
 * The original device pixel ratio, captured once at module load.
 * Used to compute the effective DPR when canvas DPI compensation is active.
 */
const originalDevicePixelRatio = window.devicePixelRatio;

/**
 * Module-level effective DPR, read by the devicePixelRatio getter override.
 * Updated synchronously during render by any VisualViewer instance.
 */
let effectiveDevicePixelRatio = originalDevicePixelRatio;
Object.defineProperty(window, 'devicePixelRatio', {
    get: () => effectiveDevicePixelRatio,
    configurable: true
});

type ScrollPosition = { scrollTop: number; scrollLeft: number };

const useVisualViewerStyles = makeStyles({
    container: {
        height: '100%',
        minHeight: '100%',
        width: '100%',
        minWidth: '100%',
        display: 'flex'
    },
    overflowVisible: { overflow: 'visible' }
});

/**
 * Stable overlayscrollbars options reference. Lifted to module scope so the
 * library does not re-apply options on every VisualViewer render (the
 * library compares the `options` prop by reference and calls
 * `instance.options(...)` whenever it changes). The values here are constant
 * and do not depend on any component state.
 */
const SCROLLBAR_OPTIONS: PartialOptions = {
    scrollbars: {
        autoHide: 'never',
        visibility: 'auto'
    },
    overflow: { x: 'scroll', y: 'scroll' }
};

type VisualViewerProps = {
    isEmbeddedInEditor?: boolean;
    /**
     * Optional schema validator for spec validation during compilation.
     * Only provided when embedded in the editor — viewer-only builds pass
     * no validator, which keeps schema dependencies out of the viewer bundle.
     */
    schemaValidator?: SchemaValidator;
};

/**
 * Master component for hosting Vega content. Handles memoisation of UI-specific dependencies to minimize re-renders.
 *
 * Uses vega-embed for rendering with compilation API (VegaEmbed component).
 *
 * When data changes from state ('known' host datasets):
 * - If spec has binding AND row count <= threshold: use `view.data()` API (preserves signals)
 * - If spec has binding AND row count > threshold: trigger full re-compile
 * - If spec has NO binding (inline or remote data): do nothing (data changes are irrelevant)
 */
export const VisualViewer = ({
    isEmbeddedInEditor,
    schemaValidator
}: VisualViewerProps) => {
    const {
        config,
        spec,
        logLevel,
        renderMode,
        scaleToZoom,
        embedScale,
        editorZoomLevel,
        previewScrollbars,
        provider,
        scrollbarColor,
        scrollbarOpacity,
        scrollbarRadius,
        scrollbarWidth,
        scrollEventThrottle,
        lastCompiled,
        values,
        viewportHeight,
        viewportWidth,
        compileSpec,
        enableIncrementalDataUpdates,
        incrementalUpdateThreshold,
        viewReady,
        logDurableError,
        logDurableWarn,
        translate
    } = useDenebState((state) => ({
        spec: state.project.spec,
        config: state.project.config,
        logLevel: state.project.logLevel,
        renderMode: state.project.renderMode,
        scaleToZoom: state.project.scaleToZoom,
        embedScale:
            state.interface.embedViewport?.scale ?? DEFAULT_VIEWPORT_SCALE,
        editorZoomLevel: state.editorZoomLevel,
        previewScrollbars:
            state.editorPreferences.previewAreaShowScrollbarsOnOverflow,
        provider: state.project.provider as SpecProvider,
        scrollbarColor: state.visualRender.scrollbarColor,
        scrollbarOpacity: state.visualRender.scrollbarOpacity,
        scrollbarRadius: state.visualRender.scrollbarRadius,
        scrollbarWidth: state.visualRender.scrollbarWidth,
        scrollEventThrottle: state.visualRender.scrollEventThrottle,
        lastCompiled: state.compilation.lastCompiled,
        values: state.dataset.values,
        viewportHeight: state.interface.embedViewport?.height ?? 0,
        viewportWidth: state.interface.embedViewport?.width ?? 0,
        compileSpec: state.compilation.compile,
        enableIncrementalDataUpdates:
            state.compilation.enableIncrementalDataUpdates,
        incrementalUpdateThreshold:
            state.compilation.incrementalUpdateThreshold,
        viewReady: state.compilation.viewReady,
        logDurableError: state.compilation.logDurableError,
        logDurableWarn: state.compilation.logDurableWarn,
        translate: state.i18n.translate
    }));

    const embedScaleFactor = useMemo(() => {
        if (!scaleToZoom || renderMode !== 'canvas') return undefined;
        const editorScale = isEmbeddedInEditor
            ? editorZoomLevel / 100
            : DEFAULT_VIEWPORT_SCALE;
        const effectiveScale = embedScale * editorScale;
        if (Math.abs(effectiveScale - DEFAULT_VIEWPORT_SCALE) < 1e-9)
            return undefined;
        return effectiveScale;
    }, [
        scaleToZoom,
        renderMode,
        embedScale,
        isEmbeddedInEditor,
        editorZoomLevel
    ]);

    // Update the module-level DPR so Vega's canvas renderer produces enough
    // backing pixels to remain crisp after Power BI applies its CSS zoom.
    // The canvas resize() function reads devicePixelRatio() for live rendering
    // (scaleFactor in embed options only affects exports).
    // Uses useLayoutEffect to run synchronously after commit but before paint.
    useLayoutEffect(() => {
        effectiveDevicePixelRatio =
            embedScaleFactor !== undefined
                ? originalDevicePixelRatio * embedScaleFactor
                : originalDevicePixelRatio;
    }, [embedScaleFactor]);

    // Track previous values reference for incremental update detection
    const prevValuesRef = useRef<unknown[] | null>(null);

    /**
     * Handle data changes from host/'known' datasets.
     */
    useEffect(() => {
        // Skip on initial mount - wait for first embed to complete
        if (prevValuesRef.current === null) {
            prevValuesRef.current = values;
            logDebug(
                'VisualViewer: Initial values set, waiting for first embed'
            );
            return;
        }

        // Skip if values reference hasn't changed
        if (prevValuesRef.current === values) {
            return;
        }

        // Update ref immediately
        const previousValues = prevValuesRef.current;
        prevValuesRef.current = values;

        // Skip if view is not ready yet (runAsync() hasn't completed)
        // This is critical - the view's datasets/signals are only populated AFTER runAsync() finishes
        if (!viewReady) {
            logDebug(
                'VisualViewer: View not ready yet (runAsync in progress), skipping data change'
            );
            return;
        }

        // Get the current view
        const view = VegaViewServices.getView();
        if (!view) {
            logDebug('VisualViewer: No view yet, skipping data change');
            return;
        }

        if (
            VegaViewServices.getDataByName(DATASET_DEFAULT_NAME) === undefined
        ) {
            logDebug(
                'VisualViewer: Spec uses inline data (no dataset binding) - ignoring data change'
            );
            return;
        }

        // Do "recompile threshold" checks
        const effectiveThreshold = Math.min(
            incrementalUpdateThreshold,
            INCREMENTAL_UPDATE_CONFIGURATION.maxThreshold
        );

        if (
            !enableIncrementalDataUpdates ||
            values.length > effectiveThreshold
        ) {
            logDebug(
                'VisualViewer: Data changed - triggering full re-compile',
                {
                    reason: !enableIncrementalDataUpdates
                        ? 'incremental updates disabled'
                        : 'dataset too large',
                    rowCount: values.length,
                    threshold: effectiveThreshold
                }
            );

            compileSpec({
                spec,
                config,
                provider,
                schemaValidator,
                containerDimensions: {
                    width: viewportWidth,
                    height: viewportHeight
                },
                logLevel,
                embedOptions: {
                    renderer: renderMode as Renderers,
                    ...(embedScaleFactor !== undefined && {
                        scaleFactor: embedScaleFactor
                    })
                }
            });
            return;
        }

        logDebug(
            'VisualViewer: INCREMENTAL UPDATE - Updating data via view.data() API',
            {
                datasetName: DATASET_DEFAULT_NAME,
                rowCount: values.length,
                previousCount: previousValues.length
            }
        );

        performIncrementalUpdate({
            view,
            values,
            onFailure: (reason, errorDetails) => {
                logDebug(
                    `VisualViewer: Incremental update failed (${reason}), triggering re-compile`,
                    errorDetails ? { error: errorDetails } : undefined
                );

                // Log durable error with the actual error message (shown at ERROR level in editor)
                if (errorDetails) {
                    logDurableError(errorDetails);
                }

                // Log durable warning explaining the fallback (shown at WARN level in editor)
                logDurableWarn(
                    translate('Text_Warn_Incremental_Update_Failure', [reason])
                );

                // Trigger full re-compile as fallback
                compileSpec({
                    spec,
                    config,
                    provider,
                    schemaValidator,
                    containerDimensions: {
                        width: viewportWidth,
                        height: viewportHeight
                    },
                    logLevel,
                    embedOptions: {
                        renderer: renderMode as Renderers,
                        ...(embedScaleFactor !== undefined && {
                            scaleFactor: embedScaleFactor
                        })
                    }
                });
            },
            onSuccess: () => {
                logDebug(
                    'VisualViewer: INCREMENTAL UPDATE SUCCESS - Data updated via view.data() API'
                );
            }
        });
    }, [
        values,
        viewReady,
        enableIncrementalDataUpdates,
        incrementalUpdateThreshold,
        spec,
        config,
        provider,
        viewportHeight,
        viewportWidth,
        logLevel,
        renderMode,
        embedScaleFactor,
        compileSpec,
        schemaValidator,
        logDurableError,
        logDurableWarn,
        translate
    ]);

    const useScrollbars = useMemo(
        () => !isEmbeddedInEditor || previewScrollbars,
        [isEmbeddedInEditor, previewScrollbars]
    );

    const osRef = useRef<OverlayScrollbarsComponentRef>(null);
    const [scrollPosition, setScrollPosition] = useState<ScrollPosition | null>(
        null
    );
    const throttledScrollPosition = useThrottle(
        scrollPosition,
        scrollEventThrottle
    );
    const classes = useVisualViewerStyles();
    const {
        onRenderingError,
        onRenderingFinished,
        onRenderingStarted,
        tooltipHandler,
        vegaLoader,
        viewEventBinders
    } = useDenebPlatformProvider();

    /**
     * Trigger initial compilation when spec, config, provider, or viewport changes.
     *
     * NOTE: This does NOT run on data (values) changes - those are handled by the incremental update effect above.
     * `tooltipHandler` and `vegaLoader` are NOT deps here - they are runtime options that can be updated on an
     * existing view without triggering a full re-compile/re-embed.
     */
    useEffect(() => {
        logDebug('VisualViewer: Triggering compilation', {
            hasSpec: !!spec,
            hasConfig: !!config,
            provider,
            viewportHeight,
            viewportWidth
        });

        compileSpec({
            spec,
            config,
            provider,
            schemaValidator,
            containerDimensions: {
                width: viewportWidth,
                height: viewportHeight
            },
            logLevel,
            embedOptions: {
                renderer: renderMode as Renderers,
                ...(embedScaleFactor !== undefined && {
                    scaleFactor: embedScaleFactor
                })
            }
        });
    }, [
        spec,
        config,
        provider,
        viewportHeight,
        viewportWidth,
        logLevel,
        renderMode,
        embedScaleFactor,
        schemaValidator
    ]);

    /**
     * Vega visualization component using vega-embed.
     */
    const vegaComponent = useMemo(
        () => (
            <VegaEmbedErrorBoundary onError={onRenderingError}>
                <VegaEmbed
                    onRenderingError={onRenderingError}
                    onRenderingFinished={onRenderingFinished}
                    onRenderingStarted={onRenderingStarted}
                    tooltipHandler={tooltipHandler}
                    vegaLoader={vegaLoader}
                    viewEventBinders={viewEventBinders}
                    viewportHeight={viewportHeight}
                    viewportWidth={viewportWidth}
                />
            </VegaEmbedErrorBoundary>
        ),
        [
            onRenderingError,
            onRenderingFinished,
            onRenderingStarted,
            tooltipHandler,
            vegaLoader,
            viewEventBinders,
            viewportHeight,
            viewportWidth
        ]
    );

    useEffect(() => {
        logRender('VisualViewer', {
            isEmbeddedInEditor,
            config,
            spec,
            provider,
            lastCompiled,
            viewportHeight,
            viewportWidth
        });
    }, [
        isEmbeddedInEditor,
        config,
        spec,
        provider,
        lastCompiled,
        viewportHeight,
        viewportWidth
    ]);

    // Overlayscrollbars event handlers. The `initialized` callback fires after
    // the library creates its viewport element — the only safe point to read
    // `instance.elements().viewport` from (before `initialized`, osInstance()
    // is null, especially when `defer` is enabled). We route VEGA_CONTAINER_ID
    // onto the viewport element here so outside consumers (debugging, tests,
    // any CSS targeting the ID) can find the scrollable container.
    //
    // The `scroll` event is the library's native pass-through of the viewport
    // scroll event. It fires on every user scroll; our useThrottle on the
    // downstream state handles rate-limiting. Using the library's event means
    // we don't manage addEventListener/removeEventListener manually — the
    // library attaches/detaches its own listener across instance lifecycle.
    //
    // Memoized with [] deps because the only closure capture is setScrollPosition
    // (stable React state setter). This gives the `events` prop a stable
    // reference so the library does not re-wire listeners on every render.
    const scrollbarEvents = useMemo<EventListeners>(
        () => ({
            initialized: (instance) => {
                instance.elements().viewport.id = VEGA_CONTAINER_ID;
            },
            scroll: (instance) => {
                const viewport = instance.elements().viewport;
                setScrollPosition({
                    scrollTop: viewport.scrollTop,
                    scrollLeft: viewport.scrollLeft
                });
            }
        }),
        []
    );

    useEffect(() => {
        // Don't update scroll signal if view isn't ready or scroll position not set
        if (!throttledScrollPosition || !viewReady) return;
        const view = VegaViewServices.getView();
        if (!view) return;
        const viewport = osRef.current?.osInstance()?.elements().viewport;
        const signal = getSignalDenebContainer({
            scroll: {
                height: viewport?.clientHeight ?? 0,
                width: viewport?.clientWidth ?? 0,
                scrollHeight: viewport?.scrollHeight ?? 0,
                scrollWidth: viewport?.scrollWidth ?? 0,
                scrollTop: throttledScrollPosition.scrollTop,
                scrollLeft: throttledScrollPosition.scrollLeft
            }
        });
        VegaViewServices.setSignalByName(signal.name, signal.value);
    }, [throttledScrollPosition, viewReady]);

    const scrollbarStyleVars = getScrollbarStyleVars(
        scrollbarColor,
        scrollbarOpacity,
        scrollbarRadius,
        scrollbarWidth
    );

    return useScrollbars ? (
        <OverlayScrollbarsComponent
            ref={osRef}
            className={classes.container}
            style={scrollbarStyleVars}
            options={SCROLLBAR_OPTIONS}
            events={scrollbarEvents}
            defer
        >
            {vegaComponent}
        </OverlayScrollbarsComponent>
    ) : (
        <div
            className={mergeClasses(classes.container, classes.overflowVisible)}
        >
            {vegaComponent}
        </div>
    );
};
