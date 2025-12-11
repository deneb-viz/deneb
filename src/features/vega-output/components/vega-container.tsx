import React, { useEffect, useMemo } from 'react';
import isEqual from 'lodash/isEqual';

import store, { getState } from '../../../store';
import { VegaRender } from './vega-render';
import { useVegaStyles } from '..';
import { mergeClasses } from '@griffel/core';
import Scrollbars, { positionValues } from 'react-custom-scrollbars-2';
import { VEGA_CONTAINER_ID } from '../../../constants';
import {
    type SpecProvider,
    type SpecRenderMode
} from '@deneb-viz/vega-runtime/embed';
import { VegaViewServices } from '../../vega-extensibility';
import throttle from 'lodash/throttle';
import { getSignalPbiContainer } from '@deneb-viz/powerbi-compat/signals';
import { getLocale } from '@deneb-viz/powerbi-compat/visual-host';
import { logRender } from '@deneb-viz/utils/logging';
import { InteractivityManager } from '@deneb-viz/powerbi-compat/interactivity';

/**
 * Master component for hosting Vega content. We will handle the workflow
 * around memoisation of UI-specific dependencies here, so that we don't
 * compute more re-renders than we need to.
 */
// eslint-disable-next-line max-lines-per-function
export const VegaContainer: React.FC = () => {
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
    } = store(
        (state) => ({
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
                state.visualSettings.display.scrollbars.scrollbarColor.value
                    .value,
            scrollbarOpacity:
                state.visualSettings.display.scrollbars.scrollbarOpacity.value,
            scrollbarRadius:
                state.visualSettings.display.scrollbars.scrollbarRadius.value,
            scrollEventThrottle:
                state.visualSettings.display.scrollEvents.scrollEventThrottle
                    .value,
            specification: state.specification,
            viewportHeight: state.visualViewportReport.height,
            viewportWidth: state.visualViewportReport.width,
            visualMode: state.interface.mode
        }),
        (prev, next) => isEqual(prev, next)
    );
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
    const classes = useVegaStyles();
    const containerClassName = mergeClasses(
        visualMode === 'View'
            ? classes.overflowOverlay
            : classes.overflowVisible,
        classes.vegaContainer
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
    return useScrollbars ? (
        <Scrollbars
            id={VEGA_CONTAINER_ID}
            className={containerClassName}
            renderThumbHorizontal={scrollbarThumbHorizontal}
            renderThumbVertical={scrollbarThumbVertical}
            onClick={() => InteractivityManager.crossFilter()}
            onScrollFrame={throttle((e: positionValues) => {
                const container = VegaViewServices.getView().container();
                const signal = getSignalPbiContainer({
                    scroll: {
                        height: container.clientHeight,
                        width: container.clientWidth,
                        scrollHeight: container.scrollHeight,
                        scrollWidth: container.scrollWidth,
                        scrollTop: e.scrollTop,
                        scrollLeft: e.scrollLeft
                    }
                });
                VegaViewServices.setSignalByName(signal.name, signal.value);
            }, scrollEventThrottle)}
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
const scrollbarThumbVertical = (props: any) =>
    getScrollBarThumb(props, { width: '100%' });

/**
 * Custom rendering for scrollbar horizontal thumb.
 */
const scrollbarThumbHorizontal = (props: any) =>
    getScrollBarThumb(props, { height: '100%' });

/**
 * Generic scrollbar thumb component.
 */
const getScrollBarThumb = (props: any, style: React.CSSProperties) => {
    const { scrollbarRadius, scrollbarColor, scrollbarOpacity } =
        getState().visualSettings.display.scrollbars;
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
