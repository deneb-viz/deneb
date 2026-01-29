import {
    type CSSProperties,
    type HTMLProps,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { useThrottle } from '@uidotdev/usehooks';
import { mergeClasses } from '@fluentui/react-components';
import { Scrollbars, type positionValues } from 'react-custom-scrollbars-2';

import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { getSignalDenebContainer } from '@deneb-viz/vega-runtime/signals';
import { logRender, logDebug } from '@deneb-viz/utils/logging';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { makeStyles } from '@fluentui/react-components';
import { VegaEmbed } from './vega-embed';
import { VegaEmbedErrorBoundary } from './vega-embed-error-boundary';
import { VEGA_CONTAINER_ID } from '../constants';
import { performIncrementalUpdate } from '../incremental-update';
import { getDenebState, useDenebState } from '../../../state';
import { useDenebPlatformProvider } from '../../deneb-platform';
import {
    INCREMENTAL_UPDATE_CONFIGURATION,
    createSchemaValidator
} from '../../../lib/vega';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';

const useVisualViewerStyles = makeStyles({
    container: {
        height: '100%',
        minHeight: '100%',
        width: '100%',
        minWidth: '100%',
        display: 'flex'
    },
    overflowVisible: { overflow: 'visible' },
    overflowOverlay: {
        overflow: 'overlay'
    }
});

type VisualViewerProps = {
    isEmbeddedInEditor?: boolean;
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
export const VisualViewer = ({ isEmbeddedInEditor }: VisualViewerProps) => {
    const {
        config,
        spec,
        logLevel,
        previewScrollbars,
        provider,
        scrollbarColor,
        scrollbarOpacity,
        scrollbarRadius,
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
        previewScrollbars:
            state.editorPreferences.previewAreaShowScrollbarsOnOverflow,
        provider: state.project.provider as SpecProvider,
        scrollbarColor: state.visualRender.scrollbarColor,
        scrollbarOpacity: state.visualRender.scrollbarOpacity,
        scrollbarRadius: state.visualRender.scrollbarRadius,
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

    /**
     * Schema validator - only created when in editor mode to avoid perf overhead in viewer.
     * Memoized per provider to avoid recreating the validator on every render.
     */
    const schemaValidator = useMemo(
        () =>
            isEmbeddedInEditor ? createSchemaValidator(provider) : undefined,
        [isEmbeddedInEditor, provider]
    );

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
                logLevel
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
                    logLevel
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
        compileSpec,
        schemaValidator,
        logDurableError,
        logDurableWarn,
        translate
    ]);

    const useScrollbars = useMemo(
        () => !isEmbeddedInEditor || previewScrollbars,
        [
            isEmbeddedInEditor,
            previewScrollbars,
            scrollbarColor,
            scrollbarOpacity,
            scrollbarRadius
        ]
    );

    const [scrollFrame, setScrollFrame] = useState<positionValues | null>(null);
    const throttledScrollFrame = useThrottle(scrollFrame, scrollEventThrottle);
    const classes = useVisualViewerStyles();
    const {
        onRenderingError,
        onRenderingFinished,
        onRenderingStarted,
        tooltipHandler,
        vegaLoader,
        viewEventBinders
    } = useDenebPlatformProvider();

    const containerClassName = mergeClasses(
        !isEmbeddedInEditor ? classes.overflowOverlay : classes.overflowVisible,
        classes.container
    );

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
            logLevel
        });
    }, [
        spec,
        config,
        provider,
        viewportHeight,
        viewportWidth,
        logLevel,
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
            hasValidViewport,
            hasValidSpec,
            canRender,
            specStatus: specification.status,
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

    useEffect(() => {
        // Don't update scroll signal if view isn't ready or scroll frame not set
        if (!throttledScrollFrame || !viewReady) return;
        const view = VegaViewServices.getView();
        if (!view) return;
        const container = view.container();
        if (!container) return;
        const signal = getSignalDenebContainer({
            scroll: {
                height: container.clientHeight ?? 0,
                width: container.clientWidth ?? 0,
                scrollHeight: container.scrollHeight ?? 0,
                scrollWidth: container.scrollWidth ?? 0,
                scrollTop: throttledScrollFrame.scrollTop,
                scrollLeft: throttledScrollFrame.scrollLeft
            }
        });
        VegaViewServices.setSignalByName(signal.name, signal.value);
    }, [throttledScrollFrame, viewReady]);

    return useScrollbars ? (
        <Scrollbars
            id={VEGA_CONTAINER_ID}
            className={containerClassName}
            renderThumbHorizontal={scrollbarThumbHorizontal}
            renderThumbVertical={scrollbarThumbVertical}
            onScrollFrame={(e: positionValues) => setScrollFrame(e)}
        >
            {vegaComponent}
        </Scrollbars>
    ) : (
        <>{vegaComponent}</>
    );
};

/**
 * Custom rendering for scrollbar vertical thumb.
 */
const scrollbarThumbVertical = (props: HTMLProps<HTMLDivElement>) =>
    getScrollBarThumb(props, { width: '100%' });

/**
 * Custom rendering for scrollbar horizontal thumb.
 */
const scrollbarThumbHorizontal = (props: HTMLProps<HTMLDivElement>) =>
    getScrollBarThumb(props, { height: '100%' });

/**
 * Generic scrollbar thumb component.
 */
const getScrollBarThumb = (
    props: HTMLProps<HTMLDivElement>,
    style: CSSProperties
) => {
    const { scrollbarRadius, scrollbarColor, scrollbarOpacity } =
        getDenebState().visualRender;
    const backgroundColor = addAlpha(scrollbarColor, scrollbarOpacity / 100);
    return (
        <div
            {...props}
            className='thumb-horizontal'
            style={{
                ...{
                    backgroundColor,
                    borderRadius: scrollbarRadius
                },
                ...style
            }}
        />
    );
};

/**
 * For a hex value, add the corresponding opacity value to the end, adjusted
 * based on the value.
 */
const addAlpha = (color: string, opacity: number) => {
    const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
    return `${color}${_opacity.toString(16)}`;
};
