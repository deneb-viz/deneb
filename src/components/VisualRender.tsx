import React, { memo } from 'react';
import { createClassFromSpec, VegaLite } from 'react-vega';
import * as Vega from 'vega';
import { deepEqual } from 'vega-lite';

import { useStoreProp, useStoreVegaProp } from '../store';
import SpecificationError from './status/SpecificationError';
import { FourD3D3D3 } from '../features/preview-area';
import SplashNoSpec from './status/SplashNoSpec';

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

import { IVisualDatasetValueRow } from '../core/data';
import { reactLog } from '../core/utils/reactLog';
import { DATASET_NAME } from '../constants';
import { logHasErrors } from '../features/debug-area';
import { getPowerBiTooltipHandler } from '../features/interactivity';
import { TSpecStatus } from '../features/specification';

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
) => {
    reactLog('[VisualRender]', 'prevProps', prevProps, 'nextProps', nextProps);
    const result =
        deepEqual(prevProps.specification, nextProps.specification) &&
        deepEqual(prevProps.config, nextProps.config) &&
        deepEqual(prevProps.data, nextProps.data) &&
        deepEqual(prevProps.provider, nextProps.provider) &&
        deepEqual(prevProps.enableTooltips, nextProps.enableTooltips) &&
        deepEqual(prevProps.renderMode, nextProps.renderMode);
    reactLog('[VisualRender] Vega Re-render', !result);
    return result;
};

const VisualRender: React.FC<IVisualRenderProps> = memo(
    ({ specification, config, data, provider, enableTooltips, renderMode }) => {
        const logLevel = useStoreVegaProp<number>('logLevel');
        const status = useStoreProp<TSpecStatus>('status', 'editorSpec');
        const visual4d3d3d = useStoreProp<boolean>('visual4d3d3d');
        const recordLogErrorMain =
            useStoreProp<(message: string) => void>('recordLogErrorMain');
        const { locale } = hostServices;
        const tooltipHandler = getPowerBiTooltipHandler(
            enableTooltips,
            hostServices.tooltipService
        );
        const loader = resolveLoaderLogic();
        const newView = (view: View) => {
            handleNewView(view);
        };
        const handleError = (error: Error) => {
            switch (error.message) {
                // This is crude, but still lets us use local values without using dataset
                case `Unrecognized data set: ${DATASET_NAME}`:
                    return;
                default: {
                    recordLogErrorMain(error.message);
                    return;
                }
            }
        };
        const formatLocale =
            locales.format[locale] || locales.format[locales.default];
        const timeFormatLocale =
            locales.timeFormat[locale] || locales.timeFormat[locales.default];
        reactLog('Rendering [VisualRender]');
        if (visual4d3d3d) return <FourD3D3D3 />;
        registerCustomExpressions();
        registerCustomSchemes();
        switch (true) {
            case logHasErrors(): {
                return <SpecificationError />;
            }
            case status === 'valid': {
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
                                logLevel={logLevel}
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
                                logLevel={logLevel}
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
