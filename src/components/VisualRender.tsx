import React, { useCallback, memo } from 'react';
import { createClassFromSpec, VegaLite } from 'react-vega';
import * as Vega from 'vega';
import { deepEqual } from 'vega-lite';

import { useStoreProp } from '../store';
import SpecificationError from './status/SpecificationError';
import FourD3D3D3 from '../components/editor/preview/FourD3D3D3';
import SplashNoSpec from './status/SplashNoSpec';

import { getTooltipHandler } from '../core/interactivity/tooltip';
import { hostServices } from '../core/services';
import { locales } from '../core/ui/i18n';
import {
    handleNewView,
    registerCustomExpressions,
    registerCustomSchemes,
    resolveLoaderLogic,
    TSpecProvider,
    TSpecRenderMode
} from '../core/vega';
import { View } from 'vega';
import { dispatchSpec, TSpecStatus } from '../core/utils/specification';
import { IVisualDatasetValueRow } from '../core/data';

interface IVisualRenderProps {
    specification: object;
    config: object;
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
) =>
    deepEqual(prevProps.specification, nextProps.specification) &&
    deepEqual(prevProps.config, nextProps.config) &&
    deepEqual(prevProps.data, nextProps.data) &&
    prevProps.provider === nextProps.provider &&
    prevProps.enableTooltips === nextProps.enableTooltips &&
    prevProps.renderMode === nextProps.renderMode;

const VisualRender: React.FC<IVisualRenderProps> = memo(
    ({ specification, config, data, provider, enableTooltips, renderMode }) => {
        const status = useStoreProp<TSpecStatus>('status', 'editorSpec');
        const rawSpec = useStoreProp<TSpecStatus>('status', 'rawSpec');
        const visual4d3d3d = useStoreProp<boolean>('visual4d3d3d');
        const { locale } = hostServices;
        const tooltipHandler = getTooltipHandler(
            enableTooltips,
            hostServices.tooltipService
        );
        const loader = resolveLoaderLogic();
        const newView = (view: View) => {
            handleNewView(view);
        };
        const handleError = (error: Error) => {
            loggerServices.reset();
            loggerServices.error(error);
            dispatchSpec({
        const formatLocale =
            locales.format[locale] || locales.format[locales.default];
        const timeFormatLocale =
            locales.timeFormat[locale] || locales.timeFormat[locales.default];
        if (visual4d3d3d) return <FourD3D3D3 />;
        registerCustomExpressions();
        registerCustomSchemes();
        switch (status) {
            case 'error': {
                return <SpecificationError />;
            }
            case 'valid': {
                switch (provider) {
                    case 'vegaLite': {
                        return (
                            <VegaLite
                                spec={specification}
                                data={data}
                                renderer={renderMode}
                                actions={false}
                                tooltip={tooltipHandler}
                                config={config}
                                formatLocale={formatLocale}
                                timeFormatLocale={timeFormatLocale}
                                loader={loader}
                                onNewView={newView}
                                onError={handleError}
                            />
                        );
                    }
                    case 'vega': {
                        const VegaChart = createClassFromSpec({
                            spec: specification
                        });
                        return (
                            <VegaChart
                                data={data}
                                renderer={renderMode as Vega.Renderers}
                                actions={false}
                                tooltip={tooltipHandler}
                                config={config}
                                formatLocale={formatLocale}
                                timeFormatLocale={timeFormatLocale}
                                loader={loader}
                                onNewView={newView}
                                onError={handleError}
                            />
                        );
                    }
                }
            }
            default: {
                return <SplashNoSpec />;
            }
        }
    },
    areEqual
);

export default VisualRender;
