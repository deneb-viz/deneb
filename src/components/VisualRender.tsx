import * as React from 'react';
import { useSelector } from 'react-redux';
import { createClassFromSpec, VegaLite, SignalListeners } from 'react-vega';
import * as Vega from 'vega';
import copy from 'fast-copy';

import Debugger from '../Debugger';
import { locales, visualFeatures } from '../config';
import { state } from '../store';
import SpecificationError from './status/SpecificationError';
import FourD3D3D3 from '../components/editor/FourD3D3D3';
import NewVisualPlaceholder from './create/NewVisualPlaceholder';
import { selectionHandlerService, specificationService } from '../services';

const VisualRender = () => {
    Debugger.log('Rendering Component: [VisualRender]...');

    const {
            dataset,
            fourd3d3d,
            i18n,
            loader,
            locale,
            settings,
            spec,
            vegaViewport
        } = useSelector(state).visual,
        { vega } = settings,
        { height, width } = vegaViewport,
        data = { dataset: copy(dataset.values) },
        config = specificationService.getInitialConfig(),
        tooltip =
            visualFeatures.tooltipHandler &&
            specificationService.getTooltipHandler(),
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
    specificationService.registerCustomExpressions();

    switch (spec?.status) {
        case 'error': {
            return <SpecificationError i18n={i18n} error={spec.message} />;
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
                            spec={spec.spec}
                            data={data}
                            renderer={renderMode}
                            actions={false}
                            width={width}
                            height={height}
                            tooltip={tooltip}
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
                        spec: spec.spec
                    });
                    Debugger.log('Rendering Vega spec...', spec, data, config);
                    return (
                        <VegaChart
                            data={data}
                            renderer={renderMode}
                            actions={false}
                            width={width}
                            height={height}
                            tooltip={tooltip}
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
            return <NewVisualPlaceholder />;
        }
    }
};

export default VisualRender;
