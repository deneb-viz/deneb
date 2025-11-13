import React, { memo, useCallback, useMemo } from 'react';
import { createClassFromSpec, View } from 'react-vega';

import { logDebug, logRender, logTimeStart } from '../../logging';
import {
    getVegaLoader,
    handleNewView,
    handleViewError
} from '../../vega-extensibility';
import { useVegaStyles } from '..';
import { getPowerBiTooltipHandler } from '../../interactivity';
import { getD3FormatLocale, getD3TimeFormatLocale } from '../../i18n';
import { getSpecificationForVisual } from '../../specification/logic';
import { getVisualHost } from '../../visual-host';
import {
    type SpecProvider,
    type SpecRenderMode
} from '@deneb-viz/vega-runtime/embed';
import { type CompiledSpecification } from '@deneb-viz/json-processing/spec-processing';

interface IVegaRenderProps {
    datasetHash: string;
    enableTooltips: boolean;
    locale: string;
    logLevel: number;
    ordinalColorCount: number;
    provider: SpecProvider;
    renderMode: SpecRenderMode;
    specification: CompiledSpecification;
    viewportHeight: number;
    viewportWidth: number;
}

/**
 * Memoization function for determining whether we should re-render the Vega
 * content.
 */
const arePropsEqual = (
    prevProps: IVegaRenderProps,
    nextProps: IVegaRenderProps
) => {
    const isSpecEqual =
        prevProps.specification.hashValue == nextProps.specification.hashValue;
    const isProviderEqual = prevProps.provider == nextProps.provider;
    const isTooltipEqual =
        prevProps.enableTooltips === nextProps.enableTooltips;
    const isRenderModeEqual = prevProps.renderMode == nextProps.renderMode;
    const isDatasetEqual = prevProps.datasetHash == nextProps.datasetHash;
    const isViewportEqual =
        prevProps.viewportHeight == nextProps.viewportHeight &&
        prevProps.viewportWidth == nextProps.viewportWidth;
    const isLogLevelEqual = prevProps.logLevel == nextProps.logLevel;
    const isLocaleEqual = prevProps.locale == nextProps.locale;
    const isOrdinalColorCountEqual =
        prevProps.ordinalColorCount == nextProps.ordinalColorCount;
    const isSame =
        isSpecEqual &&
        isProviderEqual &&
        isTooltipEqual &&
        isRenderModeEqual &&
        isViewportEqual &&
        isDatasetEqual &&
        isLocaleEqual &&
        isLogLevelEqual &&
        isOrdinalColorCountEqual;
    logDebug('VegaRender: arePropsEqual', {
        isSame,
        isSpecEqual,
        isProviderEqual,
        isTooltipEqual,
        isRenderModeEqual,
        isViewportEqual,
        isDatasetEqual,
        prevData: prevProps.datasetHash,
        nextData: nextProps.datasetHash,
        isLocaleEqual,
        isLogLevelEqual
    });
    return isSame;
};

/**
 * Renders the Vega content.
 */
export const VegaRender: React.FC<IVegaRenderProps> = memo(
    ({
        enableTooltips,
        locale,
        logLevel,
        provider,
        renderMode,
        specification,
        viewportHeight,
        viewportWidth
    }) => {
        const loader = useMemo(() => getVegaLoader(), []);
        const classes = useVegaStyles();
        const tooltipHandler = useMemo(
            () =>
                getPowerBiTooltipHandler(
                    enableTooltips,
                    getVisualHost().tooltipService
                ),
            [enableTooltips]
        );
        const numberFormatLocale = useMemo(() => getD3FormatLocale(), [locale]);
        const timeFormatLocale = useMemo(
            () => getD3TimeFormatLocale(),
            [locale]
        );
        const onNewView = useCallback((view: View) => {
            logDebug('New Vega view', {
                hashValue: specification.hashValue
            });
            handleNewView(view);
        }, []);
        const onError = useCallback((error: Error) => {
            handleViewError(error);
        }, []);
        const resolvedProvider = useMemo(
            () => (provider === 'vegaLite' ? 'vega-lite' : provider),
            [provider]
        );
        /**
         * Vega doesn't easily recompute the layout when the viewport changes,
         * so we need to override the style to force it to resize. This is
         * similar logic to the styling we apply on the `vegaRender` class,
         * but with explicit sizing rather than percentages. Doing it this way
         * allows Vega-Lite to be reasonably responsive on resize.
         */
        const styleOverride: React.CSSProperties = useMemo(
            () =>
                provider == 'vega'
                    ? {
                          height: `${viewportHeight - 4}px`,
                          width: `${viewportWidth - 4}px`
                      }
                    : {},
            [viewportHeight, viewportWidth, provider]
        );
        const VegaChart = createClassFromSpec({
            spec: getSpecificationForVisual(),
            mode: resolvedProvider
        });
        logRender('VegaRender', {
            hashValue: specification.hashValue,
            spec: VegaChart.getSpec()
        });
        logTimeStart('VegaRender');
        return (
            <VegaChart
                actions={false}
                renderer={renderMode}
                loader={loader}
                tooltip={tooltipHandler}
                logLevel={logLevel}
                formatLocale={numberFormatLocale}
                timeFormatLocale={timeFormatLocale}
                onNewView={onNewView}
                onError={onError}
                className={classes.vegaRender}
                style={styleOverride}
            />
        );
    },
    arePropsEqual
);
