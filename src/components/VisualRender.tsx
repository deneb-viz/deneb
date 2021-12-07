import * as React from 'react';
import { createClassFromSpec, VegaLite, SignalListeners } from 'react-vega';
import * as Vega from 'vega';

import Debugger from '../Debugger';
import store from '../store';
import SpecificationError from './status/SpecificationError';
import FourD3D3D3 from '../components/editor/preview/FourD3D3D3';
import SplashNoSpec from './status/SplashNoSpec';

import { getTooltipHandler } from '../core/interactivity/tooltip';
import { hostServices } from '../core/services';
import { locales } from '../core/ui/i18n';
import {
    getViewConfig,
    getViewDataset,
    getViewSpec,
    handleNewView,
    registerCustomExpressions,
    registerCustomSchemes,
    resolveLoaderLogic
} from '../core/vega';
import { View } from 'vega';

const VisualRender = () => {
    Debugger.log('Rendering Component: [VisualRender]...');

    const { editorSpec, visual4d3d3d, visualSettings } = store(
            (state) => state
        ),
        { vega } = visualSettings,
        { locale } = hostServices,
        data = getViewDataset(),
        specification = getViewSpec(),
        config = getViewConfig(),
        tooltipHandler = getTooltipHandler(
            vega.enableTooltips,
            hostServices.tooltipService
        ),
        renderMode = vega.renderMode as Vega.Renderers,
        loader = resolveLoaderLogic(),
        newView = (view: View) => {
            handleNewView(view);
        },
        formatLocale =
            locales.format[locale] || locales.format[locales.default],
        timeFormatLocale =
            locales.timeFormat[locale] || locales.timeFormat[locales.default];
    if (visual4d3d3d) return <FourD3D3D3 />;
    registerCustomExpressions();
    registerCustomSchemes();
    switch (editorSpec?.status) {
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
