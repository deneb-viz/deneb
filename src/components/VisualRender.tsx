import * as React from 'react';
import { useSelector } from 'react-redux';
import { createClassFromSpec, VegaLite, SignalListeners } from 'react-vega';
import * as Vega from 'vega';
import cloneDeep from 'lodash/cloneDeep';

import Debugger from '../Debugger';
import { state } from '../store';
import SpecificationError from './status/SpecificationError';
import FourD3D3D3 from '../components/editor/FourD3D3D3';
import SplashNospec from './status/SplashNoSpec';
import { selectionHandlerService } from '../services';

import { locales } from '../api/i18n';
import {
    getInitialConfig,
    registerCustomExpressions
} from '../api/specification';
import { getTooltipHandler } from '../api/tooltip';

const VisualRender = () => {
    Debugger.log('Rendering Component: [VisualRender]...');

    const {
            dataset,
            fourd3d3d,
            loader,
            locale,
            settings,
            spec,
            tooltipService,
            vegaViewport
        } = useSelector(state).visual,
        { vega } = settings,
        { height, width } = vegaViewport,
        data = { dataset: cloneDeep(dataset.values) },
        specification = cloneDeep(spec.spec),
        config = getInitialConfig(),
        tooltipHandler = getTooltipHandler(
            settings.vega.enableTooltips,
            tooltipService
        ),
        renderMode = vega.renderMode as Vega.Renderers,
        signalListeners: SignalListeners = {
            __select__: selectionHandlerService.handleDataPoint,
            __context__: selectionHandlerService.handleContextMenu
        },
        formatLocale =
            locales.format[locale] || locales.format[locales.default],
        timeFormatLocale =
            locales.timeFormat[locale] || locales.timeFormat[locales.default];
    if (fourd3d3d) return <FourD3D3D3 />;
    registerCustomExpressions();

    switch (spec?.status) {
        case 'error': {
            return <SpecificationError />;
        }
        case 'valid': {
            switch (vega.provider) {
                case 'vegaLite': {
                    Debugger.log(
                        'Rendering Vega Lite spec...',
                        spec,
                        data,
                        config
                    );
                    return (
                        <VegaLite
                            spec={specification}
                            data={data}
                            renderer={renderMode}
                            actions={false}
                            width={width}
                            height={height}
                            tooltip={tooltipHandler}
                            config={config}
                            signalListeners={signalListeners}
                            formatLocale={formatLocale}
                            timeFormatLocale={timeFormatLocale}
                            loader={loader}
                        />
                    );
                }
                case 'vega': {
                    const VegaChart = createClassFromSpec({
                        spec: specification
                    });
                    Debugger.log('Rendering Vega spec...', spec, data, config);
                    return (
                        <VegaChart
                            data={data}
                            renderer={renderMode}
                            actions={false}
                            width={width}
                            height={height}
                            tooltip={tooltipHandler}
                            config={config}
                            signalListeners={signalListeners}
                            formatLocale={formatLocale}
                            timeFormatLocale={timeFormatLocale}
                            loader={loader}
                        />
                    );
                }
            }
        }
        default: {
            return <SplashNospec />;
        }
    }
};

export default VisualRender;
