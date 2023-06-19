import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { createClassFromSpec } from 'react-vega';
import * as Vega from 'vega';
import isEqual from 'lodash/isEqual';

import store from '../store';

import { hostServices } from '../core/services';
import { locales } from '../core/ui/i18n';
import { TSpecProvider, TSpecRenderMode } from '../core/vega';
import {
    VegaViewServices,
    handleNewView
} from '../features/vega-extensibility';
import { View } from 'vega';

import { IVisualDatasetValueRow } from '../core/data';
import { getPowerBiTooltipHandler } from '../features/interactivity';
import { getVegaLoader } from '../features/vega-extensibility';
import { logDebug, logError, logRender } from '../features/logging';
import { shallow } from 'zustand/shallow';

interface IVisualRenderProps {
    specification: object;
    provider: TSpecProvider;
    enableTooltips: boolean;
    renderMode: TSpecRenderMode;
    data: {
        dataset: IVisualDatasetValueRow[];
    };
}

/**
 * Custom memoization function, to ensure that we don't forcibly re-render
 */
const areEqual = (
    prevProps: IVisualRenderProps,
    nextProps: IVisualRenderProps
) => {
    logDebug(
        'VisualRender equality check',
        'prevProps',
        prevProps,
        'nextProps',
        nextProps
    );
    const specificationMatch = isEqual(
        prevProps.specification,
        nextProps.specification
    );
    const dataMatch = isEqual(prevProps.data, nextProps.data);
    const providerMatch = isEqual(prevProps.provider, nextProps.provider);
    const enableTooltipsMatch = isEqual(
        prevProps.enableTooltips,
        nextProps.enableTooltips
    );
    const renderModeMatch = isEqual(prevProps.renderMode, nextProps.renderMode);
    const result =
        specificationMatch &&
        dataMatch &&
        providerMatch &&
        enableTooltipsMatch &&
        renderModeMatch;

    logDebug('VisualRender equality check', {
        result,
        specificationMatch,
        dataMatch,
        providerMatch,
        enableTooltipsMatch,
        renderModeMatch
    });
    return result;
};

const VisualRender: React.FC<IVisualRenderProps> = memo(
    ({ specification, provider, enableTooltips, renderMode }) => {
        const { logLevel, status, generateRenderId, logStoreError } = store(
            (state) => ({
                logLevel: state.visualSettings.vega.logLevel,
                status: state.specification.status,
                generateRenderId: state.interface.generateRenderId,
                logStoreError: state.specification.logError
            }),
            shallow
        );
        const { locale } = hostServices;
        const tooltipHandler = useMemo(
            () =>
                getPowerBiTooltipHandler(
                    enableTooltips,
                    hostServices.tooltipService
                ),
            [enableTooltips]
        );
        const loader = useMemo(() => getVegaLoader(), []);
        const onNewView = useCallback((view: View) => {
            logDebug('New view', { status, specification });
            if (status !== 'error') {
                handleNewView(view);
            }
        }, []);
        const handleError = (error: Error) => {
            logError('Vega view error', error);
            switch (error.message) {
                default: {
                    logDebug('Clearing down view...');
                    VegaViewServices.clearView();
                    logDebug('View services', {
                        view: VegaViewServices.getView(),
                        signals: VegaViewServices.getAllSignals(),
                        data: VegaViewServices.getAllData()
                    });
                    logStoreError(error.message);
                    generateRenderId();
                    return;
                }
            }
        };
        const formatLocale =
            locales.format[locale] || locales.format[locales.default];
        const timeFormatLocale =
            locales.timeFormat[locale] || locales.timeFormat[locales.default];
        const resolvedProvider = useMemo(
            () => (provider === 'vegaLite' ? 'vega-lite' : provider),
            [provider]
        );
        const VegaChart = createClassFromSpec({
            spec: specification,
            mode: resolvedProvider
        });
        logRender('VisualRender');
        return (
            <VegaChart
                renderer={renderMode as Vega.Renderers}
                actions={false}
                tooltip={tooltipHandler}
                formatLocale={formatLocale}
                timeFormatLocale={timeFormatLocale}
                loader={loader}
                onNewView={onNewView}
                onError={handleError}
                logLevel={logLevel}
            />
        );
    },
    areEqual
);

export default VisualRender;
