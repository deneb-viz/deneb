import React, { useEffect, useMemo } from 'react';
import isEqual from 'lodash/isEqual';

import store, { getState } from '../../../store';
import { getLocale } from '../../i18n';
import { logRender } from '../../logging';
import { TSpecProvider, TSpecRenderMode } from '../../../core/vega';
import { VegaRender } from './vega-render';
import { useVegaStyles } from '..';
import { mergeClasses } from '@griffel/core';
import Scrollbars from 'react-custom-scrollbars-2';
import { clearSelection, hidePowerBiTooltip } from '../../interactivity';

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
        ordinalColorCount,
        previewScrollbars,
        provider,
        renderMode,
        scrollbarColor,
        scrollbarOpacity,
        scrollbarRadius,
        specification,
        viewportHeight,
        viewportWidth,
        visualMode
    } = store(
        (state) => ({
            datasetHash: state.dataset.hashValue,
            devLocale: state.visualSettings.developer.locale,
            enableTooltips: state.visualSettings.vega.enableTooltips,
            jsonConfig: state.visualSettings.vega.jsonConfig,
            jsonSpec: state.visualSettings.vega.jsonSpec,
            logLevel: state.visualSettings.vega.logLevel,
            ordinalColorCount: state.visualSettings.theme.ordinalColorCount,
            previewScrollbars: state.visualSettings.editor.previewScrollbars,
            provider: state.visualSettings.vega.provider as TSpecProvider,
            renderMode: state.visualSettings.vega.renderMode as TSpecRenderMode,
            scrollbarColor: state.visualSettings.display.scrollbarColor,
            scrollbarOpacity: state.visualSettings.display.scrollbarOpacity,
            scrollbarRadius: state.visualSettings.display.scrollbarRadius,
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
            logLevel={logLevel}
            ordinalColorCount={ordinalColorCount}
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
            id='deneb-vega-container'
            className={containerClassName}
            renderThumbHorizontal={scrollbarThumbHorizontal}
            renderThumbVertical={scrollbarThumbVertical}
            onClick={clearSelection}
            onMouseOut={hidePowerBiTooltip}
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
        getState().visualSettings.display;
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
