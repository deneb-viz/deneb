import {
    type CSSProperties,
    type HTMLProps,
    useEffect,
    useMemo,
    useState
} from 'react';
import { useThrottle } from '@uidotdev/usehooks';
import { mergeClasses } from '@fluentui/react-components';
import { Scrollbars, type positionValues } from 'react-custom-scrollbars-2';

import {
    type SpecProvider,
    type SpecRenderMode
} from '@deneb-viz/vega-runtime/embed';
import { getSignalPbiContainer } from '@deneb-viz/powerbi-compat/signals';
import { getLocale } from '@deneb-viz/powerbi-compat/visual-host';
import { logRender } from '@deneb-viz/utils/logging';
import { InteractivityManager } from '@deneb-viz/powerbi-compat/interactivity';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { makeStyles } from '@fluentui/react-components';
import { VegaRender } from './vega-render';
import { VEGA_CONTAINER_ID } from '../constants';
import { getDenebState, useDenebState } from '../../../state';

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

/**
 * Master component for hosting Vega content. We will handle the workflow
 * around memoisation of UI-specific dependencies here, so that we don't
 * compute more re-renders than we need to.
 */
// eslint-disable-next-line max-lines-per-function
export const VisualViewer = () => {
    const {
        datasetHash,
        devLocale,
        enableTooltips,
        jsonConfig,
        jsonSpec,
        logLevel,
        multiSelectDelay,
        previewScrollbars,
        provider,
        renderMode,
        scrollbarColor,
        scrollbarOpacity,
        scrollbarRadius,
        scrollEventThrottle,
        specification,
        viewportHeight,
        viewportWidth,
        visualMode
    } = useDenebState((state) => ({
        datasetHash: state.dataset.hashValue,
        devLocale: state.visualSettings.developer.localization.locale.value,
        enableTooltips:
            state.visualSettings.vega.interactivity.enableTooltips.value,
        jsonConfig: state.visualSettings.vega.output.jsonConfig.value,
        jsonSpec: state.visualSettings.vega.output.jsonSpec.value,
        logLevel: state.visualSettings.vega.logging.logLevel.value,
        multiSelectDelay:
            state.visualSettings.vega.interactivity.tooltipDelay.value,
        previewScrollbars:
            state.visualSettings.editor.preview.previewScrollbars.value,
        provider: state.visualSettings.vega.output.provider
            .value as SpecProvider,
        renderMode: state.visualSettings.vega.output.renderMode
            .value as SpecRenderMode,
        scrollbarColor:
            state.visualSettings.display.scrollbars.scrollbarColor.value.value,
        scrollbarOpacity:
            state.visualSettings.display.scrollbars.scrollbarOpacity.value,
        scrollbarRadius:
            state.visualSettings.display.scrollbars.scrollbarRadius.value,
        scrollEventThrottle:
            state.visualSettings.display.scrollEvents.scrollEventThrottle.value,
        specification: state.specification,
        viewportHeight: state.visualViewportReport.height,
        viewportWidth: state.visualViewportReport.width,
        visualMode: state.interface.mode
    }));
    const locale = useMemo(
        () => getLocale(),
        [jsonConfig, jsonSpec, devLocale]
    );
    const useScrollbars = useMemo(
        () => visualMode === 'View' || previewScrollbars,
        [
            visualMode,
            previewScrollbars,
            scrollbarColor,
            scrollbarOpacity,
            scrollbarRadius
        ]
    );
    const [scrollFrame, setScrollFrame] = useState<positionValues | null>(null);
    const throttledScrollFrame = useThrottle(scrollFrame, scrollEventThrottle);
    const classes = useVisualViewerStyles();
    const containerClassName = mergeClasses(
        visualMode === 'View'
            ? classes.overflowOverlay
            : classes.overflowVisible,
        classes.container
    );
    const vegaComponent = (
        <VegaRender
            datasetHash={datasetHash}
            enableTooltips={enableTooltips}
            locale={locale}
            logLevel={logLevel as number}
            multiSelectDelay={multiSelectDelay}
            provider={provider}
            renderMode={renderMode}
            specification={specification}
            viewportHeight={viewportHeight}
            viewportWidth={viewportWidth}
        />
    );
    useEffect(() => {
        logRender('VegaContainer', {
            datasetHash,
            jsonConfig,
            jsonSpec,
            provider,
            specification,
            viewportHeight,
            viewportWidth,
            visualMode
        });
    }, [
        datasetHash,
        jsonConfig,
        jsonSpec,
        provider,
        specification.hashValue,
        viewportHeight,
        viewportWidth,
        visualMode
    ]);

    useEffect(() => {
        if (!throttledScrollFrame) return;
        const container = VegaViewServices?.getView()?.container();
        const signal = getSignalPbiContainer({
            scroll: {
                height: container?.clientHeight ?? 0,
                width: container?.clientWidth ?? 0,
                scrollHeight: container?.scrollHeight ?? 0,
                scrollWidth: container?.scrollWidth ?? 0,
                scrollTop: throttledScrollFrame.scrollTop,
                scrollLeft: throttledScrollFrame.scrollLeft
            }
        });
        VegaViewServices.setSignalByName(signal.name, signal.value);
    }, [throttledScrollFrame]);
    return useScrollbars ? (
        <Scrollbars
            id={VEGA_CONTAINER_ID}
            className={containerClassName}
            renderThumbHorizontal={scrollbarThumbHorizontal}
            renderThumbVertical={scrollbarThumbVertical}
            onClick={() => InteractivityManager.crossFilter()}
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
        getDenebState().visualSettings.display.scrollbars;
    const backgroundColor = addAlpha(
        scrollbarColor.value.value,
        scrollbarOpacity.value / 100
    );
    return (
        <div
            {...props}
            className='thumb-horizontal'
            style={{
                ...{
                    backgroundColor,
                    borderRadius: scrollbarRadius.value
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
