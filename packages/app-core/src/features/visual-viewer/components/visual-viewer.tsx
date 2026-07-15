import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useThrottle } from '@uidotdev/usehooks';
import { makeStyles, mergeClasses } from '@fluentui/react-components';
import {
    OverlayScrollbarsComponent,
    type OverlayScrollbarsComponentRef
} from 'overlayscrollbars-react';
import type { EventListeners } from 'overlayscrollbars';
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
import {
    performIncrementalUpdate,
    resolveDataChangeAction,
    resolveDataChangeGate,
    shouldAdvancePrevValues
} from '../incremental-update';
import { computeEmbedActive } from '../embed-active';
import { useDenebState } from '../../../state';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';
import { INCREMENTAL_UPDATE_CONFIGURATION } from '../../../lib/vega/incremental-update-configuration';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import {
    getScrollbarStyleVars,
    SCROLLBAR_OPTIONS
} from '../../../lib/scrollbars/scrollbar-style-vars';

/**
 * The original device pixel ratio, captured once at module load.
 * Used to compute the effective DPR when canvas DPI compensation is active.
 */
const originalDevicePixelRatio = window.devicePixelRatio;

/**
 * Module-level effective DPR, read by the devicePixelRatio getter override.
 * Updated synchronously during render by the active VisualViewer instance.
 */
let effectiveDevicePixelRatio = originalDevicePixelRatio;

/**
 * Whether the `window.devicePixelRatio` getter override has been installed.
 * The override is installed lazily on the first VisualViewer mount rather than
 * at import time, so merely importing this module never mutates global
 * `window`. Guarded by this flag so repeated mounts (multiple instances,
 * remounts) install it exactly once.
 */
let devicePixelRatioOverrideInstalled = false;

/**
 * Install the `window.devicePixelRatio` getter override, once. Idempotent: safe
 * to call from every VisualViewer mount.
 */
const installDevicePixelRatioOverride = () => {
    if (devicePixelRatioOverrideInstalled) return;
    devicePixelRatioOverrideInstalled = true;
    Object.defineProperty(window, 'devicePixelRatio', {
        get: () => effectiveDevicePixelRatio,
        configurable: true
    });
};

type ScrollPosition = { scrollTop: number; scrollLeft: number };

const useVisualViewerStyles = makeStyles({
    container: {
        height: '100%',
        minHeight: '100%',
        width: '100%',
        minWidth: '100%',
        display: 'flex',
        // The overlayscrollbars library applies its default theme
        // (.os-theme-dark) to each .os-scrollbar element, which sets
        // --os-handle-bg, --os-handle-bg-hover, --os-handle-bg-active,
        // --os-size and --os-handle-border-radius with hard-coded theme
        // defaults. Those declarations shadow any values we set via inline
        // style on the host element, so the user's display.scrollbar*
        // settings never reach the scrollbar handle.
        //
        // Force the scrollbar elements to re-inherit each of those custom
        // properties from their cascade instead. This selector's specificity
        // (0,2,0) beats both .os-scrollbar (0,1,0) and .os-theme-dark (0,1,0),
        // so `inherit` wins. The inherited value ultimately comes from the
        // host element where getScrollbarStyleVars set the inline style vars
        // from user settings. See #480.
        '& .os-scrollbar': {
            '--os-size': 'inherit',
            '--os-handle-bg': 'inherit',
            '--os-handle-bg-hover': 'inherit',
            '--os-handle-bg-active': 'inherit',
            '--os-handle-border-radius': 'inherit'
        }
    },
    overflowVisible: { overflow: 'visible' }
});

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
        interfaceType,
        logError,
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
        interfaceType: state.interface.type,
        logError: state.compilation.logError,
        logDurableError: state.compilation.logDurableError,
        logDurableWarn: state.compilation.logDurableWarn,
        translate: state.i18n.translate
    }));

    // Hoisted from below the incremental-update effect so the effect's
    // dependency array can reference `onRenderingFinished` without
    // tripping the const Temporal Dead Zone at render time. Previously
    // declared near the JSX return, but the data-change effect (~line
    // 198) depends on it for the U10 incremental close — and the deps
    // array is evaluated synchronously during the component body.
    const {
        onRenderingError,
        onRenderingFinished,
        onRenderingStarted,
        tooltipHandler,
        vegaLoader,
        viewEventBinders
    } = useDenebPlatformProvider();

    // Whether THIS instance is the single live embed. The retained (hidden)
    // editor instance and the standalone viewer instance can both be mounted at
    // once; exactly one runs live, chosen by the current interface mode (defect
    // C1). The inactive instance runs no compile/data/DPR side effects and
    // renders a `null` spec (see `VegaEmbed`).
    const isActive = computeEmbedActive(interfaceType, !!isEmbeddedInEditor);

    // Install the devicePixelRatio getter override on first mount (idempotent),
    // rather than at module import time. Installed unconditionally regardless of
    // `isActive` — the getter merely reads `effectiveDevicePixelRatio`, which
    // only the active instance writes.
    useLayoutEffect(() => {
        installDevicePixelRatioOverride();
    }, []);

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
        // Only the live instance writes the shared module-level DPR, so the two
        // mounted instances never fight over `effectiveDevicePixelRatio` (defect
        // C1).
        if (!isActive) return;
        effectiveDevicePixelRatio =
            embedScaleFactor !== undefined
                ? originalDevicePixelRatio * embedScaleFactor
                : originalDevicePixelRatio;
    }, [embedScaleFactor, isActive]);

    // Track previous values reference for incremental update detection
    const prevValuesRef = useRef<unknown[] | null>(null);

    /**
     * Handle data changes from host/'known' datasets.
     */
    useEffect(() => {
        const view = VegaViewServices.getView();
        const previousValues = prevValuesRef.current;
        const gate = resolveDataChangeGate({
            prevValues: previousValues,
            values,
            isActive,
            viewReady,
            hasView: !!view
        });

        // Advance the baseline ONLY when an update is actually consumed
        // ('initialize' records the first baseline; 'act' consumes a change).
        // Critically, 'defer' (view mid-embed) does NOT advance — so when
        // `viewReady` (a dependency of this effect) flips true, the effect
        // re-runs and applies the update instead of dropping it (defect #7).
        if (shouldAdvancePrevValues(gate)) {
            prevValuesRef.current = values;
        }

        switch (gate) {
            case 'initialize':
                logDebug(
                    'VisualViewer: Initial values set, waiting for first embed'
                );
                return;
            case 'unchanged':
                return;
            case 'inactive':
                // Not the single live instance (defect C1): run no side effects.
                return;
            case 'defer':
                logDebug(
                    'VisualViewer: View not ready yet (runAsync in progress), skipping data change'
                );
                return;
            case 'no-view':
                logDebug('VisualViewer: No view yet, skipping data change');
                return;
        }

        // gate === 'act': an active, ready, view-bound instance is consuming a
        // data change. `view` is guaranteed non-null here (the 'no-view' gate
        // covers the null case); this guard only narrows the type.
        if (!view) return;

        // Do "recompile threshold" checks
        const effectiveThreshold = Math.min(
            incrementalUpdateThreshold,
            INCREMENTAL_UPDATE_CONFIGURATION.maxThreshold
        );

        // Distinguish "the spec has no `dataset` binding (inline/remote data)"
        // from "the dataset lookup failed" (L3). `getDataByName` swallows both
        // into `undefined`; `getDatasetPresence` separates them so a genuine
        // failure falls through to a full re-compile below instead of being
        // mistaken for inline data and silently dropping the update.
        const datasetPresence =
            VegaViewServices.getDatasetPresence(DATASET_DEFAULT_NAME);
        const dataChangeAction = resolveDataChangeAction(
            datasetPresence,
            enableIncrementalDataUpdates,
            values.length,
            effectiveThreshold
        );

        if (dataChangeAction === 'ignore') {
            logDebug(
                'VisualViewer: Spec uses inline data (no dataset binding) - ignoring data change'
            );
            return;
        }

        if (dataChangeAction === 'recompile') {
            logDebug(
                'VisualViewer: Data changed - triggering full re-compile',
                {
                    reason:
                        datasetPresence === 'error'
                            ? 'dataset lookup failed'
                            : !enableIncrementalDataUpdates
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
                previousCount: previousValues?.length ?? 0
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

                // Do NOT close the lifecycle here. The re-compile
                // below triggers VegaEmbed to re-embed, whose
                // `handleEmbed` fires `onRenderingFinished` at the
                // end of `view.runAsync()` — that is the correct
                // terminal because it fires AFTER the recompile
                // actually paints. Closing here instead would mean
                // emitting `renderingFinished(options)` to the host
                // while the recompile is still in flight; Power BI
                // export / snapshot captures sample visual state on
                // `renderingFinished`, so an early close would let
                // them capture the pre-update content. If the
                // recompile itself fails to ever paint (a real
                // orphan), the coordinator's 10s safety-net is the
                // deterministic backstop.

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
                // Incremental data update reconciled in place via
                // `view.data()` — no re-embed, so vega-embed.tsx's
                // `onRenderingFinished` never fires. Close the
                // lifecycle here instead so the update's
                // pending-render id terminates cleanly (R12 / AE2 /
                // U10) rather than waiting for the 10s safety-net.
                onRenderingFinished?.();
            }
        });
    }, [
        values,
        viewReady,
        isActive,
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
        translate,
        onRenderingFinished
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

    /**
     * Trigger initial compilation when spec, config, provider, or viewport changes.
     *
     * NOTE: This does NOT run on data (values) changes - those are handled by the incremental update effect above.
     * `tooltipHandler` and `vegaLoader` are NOT deps here - they are runtime options that can be updated on an
     * existing view without triggering a full re-compile/re-embed.
     */
    useEffect(() => {
        // Only the single live instance compiles (defect C1). When this instance
        // becomes active, `isActive` flips true and the effect re-fires,
        // producing the instance-appropriate scaleFactor from `embedScaleFactor`.
        if (!isActive) return;

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
        schemaValidator,
        isActive
    ]);

    /**
     * Vega visualization component using vega-embed.
     */
    const vegaComponent = useMemo(
        () => (
            <VegaEmbedErrorBoundary onError={onRenderingError}>
                <VegaEmbed
                    isActive={isActive}
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
            isActive,
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
        VegaViewServices.setSignalByName(signal.name, signal.value, (error) => {
            logError(
                `VisualViewer: Failed to update scroll signal: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        });
    }, [throttledScrollPosition, viewReady, logError]);

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
