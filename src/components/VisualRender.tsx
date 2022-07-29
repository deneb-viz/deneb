import React, { memo } from 'react';
import { createClassFromSpec, VegaLite } from 'react-vega';
import * as Vega from 'vega';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';

import { useStoreProp, useStoreVegaProp } from '../store';
import SpecificationError from './status/SpecificationError';
import { FourD3D3D3 } from '../features/preview-area';
import SplashNoSpec from './status/SplashNoSpec';

import { hostServices } from '../core/services';
import { locales } from '../core/ui/i18n';
import { handleNewView, TSpecProvider, TSpecRenderMode } from '../core/vega';
import { View } from 'vega';

import { IVisualDatasetValueRow } from '../core/data';
import { reactLog } from '../core/utils/reactLog';
import { DATASET_NAME } from '../constants';
import { logHasErrors } from '../features/debug-area';
import { getPowerBiTooltipHandler } from '../features/interactivity';
import { TSpecStatus } from '../features/specification';
import {
    getPowerBiVegaLoader,
    registerPowerBiCustomExpressions,
    registerPowerBiCustomSchemes
} from '../features/powerbi-vega-extensibility';

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
    const specificationMatch = isEqual(
        prevProps.specification,
        nextProps.specification
    );

    reactLog(
        '[VisualRender] Specification match',
        specificationMatch,
        JSON.stringify(prevProps.specification),
        '  |  ',
        JSON.stringify(nextProps.specification)
    );
    const configMatch = isEqual(prevProps.config, nextProps.config);

    reactLog('[VisualRender] Config match', configMatch);
    const dataMatch = isEqual(prevProps.data, nextProps.data);

    reactLog(
        '[VisualRender] Data match',
        dataMatch,
        JSON.stringify(prevProps.data),
        '  |  ',
        JSON.stringify(nextProps.data)
    );
    const providerMatch = isEqual(prevProps.provider, nextProps.provider);

    reactLog('[VisualRender] Provider match', providerMatch);
    const enableTooltipsMatch = isEqual(
        prevProps.enableTooltips,
        nextProps.enableTooltips
    );

    reactLog('[VisualRender] Enable tooltips match', enableTooltipsMatch);
    const renderModeMatch = isEqual(prevProps.renderMode, nextProps.renderMode);

    reactLog('[VisualRender] Render mode match', renderModeMatch);
    const result =
        specificationMatch &&
        configMatch &&
        dataMatch &&
        providerMatch &&
        enableTooltipsMatch &&
        renderModeMatch;

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
        const loader = getPowerBiVegaLoader();
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

        // #248: the raw props get mutated by react-vega, so we need this to
        // ensure that we don't get stuck in an infinite loop when memoizing
        const renderSpecification = cloneDeep(specification);
        const renderConfig = cloneDeep(config);
        const renderData = cloneDeep(data);

        reactLog('Rendering [VisualRender]');
        if (visual4d3d3d) return <FourD3D3D3 />;
        registerPowerBiCustomExpressions();
        registerPowerBiCustomSchemes();
        switch (true) {
            case logHasErrors(): {
                return <SpecificationError />;
            }
            case status === 'valid': {
                switch (provider) {
                    case 'vegaLite': {
                        return (
                            <VegaLite
                                spec={renderSpecification}
                                data={renderData}
                                renderer={renderMode}
                                actions={false}
                                tooltip={tooltipHandler}
                                config={renderConfig}
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
                            spec: renderSpecification
                        });
                        return (
                            <VegaChart
                                data={renderData}
                                renderer={renderMode as Vega.Renderers}
                                actions={false}
                                tooltip={tooltipHandler}
                                config={renderConfig}
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
