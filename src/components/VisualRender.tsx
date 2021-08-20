import * as React from 'react';
import { useSelector } from 'react-redux';
import { createClassFromSpec, VegaLite, SignalListeners } from 'react-vega';
import * as Vega from 'vega';

import Debugger from '../Debugger';
import { state } from '../store';
import SpecificationError from './status/SpecificationError';
import FourD3D3D3 from '../components/editor/FourD3D3D3';
import SplashNoSpec from './status/SplashNoSpec';
import { selectionHandlerService } from '../services';

import { getTooltipHandler } from '../core/interactivity/tooltip';
import { hostServices } from '../core/services';
import { locales } from '../core/ui/i18n';
import {
    getViewConfig,
    getViewDataset,
    getViewSpec,
    handleNewView,
    registerCustomExpressions
} from '../core/vega';
import { View } from 'vega';

const VisualRender = () => {
    Debugger.log('Rendering Component: [VisualRender]...');

    const { fourd3d3d, loader, settings, spec } = useSelector(state).visual,
        { vega } = settings,
        { locale } = hostServices,
        data = getViewDataset(),
        specification = getViewSpec(),
        config = getViewConfig(),
        tooltipHandler = getTooltipHandler(
            settings.vega.enableTooltips,
            hostServices.tooltipService
        ),
        renderMode = vega.renderMode as Vega.Renderers,
        signalListeners: SignalListeners = {
            __select__: selectionHandlerService.handleDataPoint
        },
        formatLocale =
            locales.format[locale] || locales.format[locales.default],
        timeFormatLocale =
            locales.timeFormat[locale] || locales.timeFormat[locales.default];
    if (fourd3d3d) return <FourD3D3D3 />;
    registerCustomExpressions();
    const newView = (view: View) => {
        handleNewView(view);
    };
    switch (spec?.status) {
        case 'error': {
            return <SpecificationError />;
        }
        case 'valid': {
            switch (vega.provider) {
                case 'vegaLite': {
                    return (
                        <VegaLite
                            spec={specification}
                            data={data}
                            renderer={renderMode}
                            actions={false}
                            tooltip={tooltipHandler}
                            config={config}
                            signalListeners={signalListeners}
                            formatLocale={formatLocale}
                            timeFormatLocale={timeFormatLocale}
                            loader={loader}
                            onNewView={newView}
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
                            renderer={renderMode}
                            actions={false}
                            tooltip={tooltipHandler}
                            config={config}
                            signalListeners={signalListeners}
                            formatLocale={formatLocale}
                            timeFormatLocale={timeFormatLocale}
                            loader={loader}
                            onNewView={newView}
                        />
                    );
                }
            }
        }
        default: {
            return <SplashNoSpec />;
        }
    }
};

export default VisualRender;
