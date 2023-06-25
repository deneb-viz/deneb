import React, { memo, useCallback, useMemo } from 'react';
import { createClassFromSpec, View } from 'react-vega';

import { ISpecification } from '../../specification';
import { TSpecProvider, TSpecRenderMode } from '../../../core/vega';
import { logDebug, logRender } from '../../logging';
import {
    getVegaLoader,
    handleNewView,
    handleViewError
} from '../../vega-extensibility';
import { useVegaStyles } from '..';
import { getPowerBiTooltipHandler } from '../../interactivity';
import { hostServices } from '../../../core/services';
import { getD3FormatLocale, getD3TimeFormatLocale } from '../../i18n';

interface IVegaRenderProps {
    datasetHash: string;
    enableTooltips: boolean;
    locale: string;
    logLevel: number;
    ordinalColorCount: number;
    provider: TSpecProvider;
    renderMode: TSpecRenderMode;
    specification: ISpecification;
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
        specification
    }) => {
        const loader = useMemo(() => getVegaLoader(), []);
        const classes = useVegaStyles();
        const tooltipHandler = useMemo(
            () =>
                getPowerBiTooltipHandler(
                    enableTooltips,
                    hostServices.tooltipService
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
        const onError = useCallback(
            (error: Error, containerRef: HTMLDivElement) => {
                handleViewError(error, containerRef);
            },
            []
        );
        const resolvedProvider = useMemo(
            () => (provider === 'vegaLite' ? 'vega-lite' : provider),
            [provider]
        );
        const VegaChart = createClassFromSpec({
            spec: specification.spec as object,
            mode: resolvedProvider
        });
        logRender('VegaRender', {
            hashValue: specification.hashValue,
            spec: VegaChart.getSpec()
        });
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
            />
        );
    },
    arePropsEqual
);
