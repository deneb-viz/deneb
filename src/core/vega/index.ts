export * as vegaUtils from './vegaUtils';
export {
    IVegaViewDatum,
    TSpecProvider,
    TSpecRenderMode,
    determineProviderFromSpec,
    registerCustomExpressions,
    resolveLoaderLogic
};

import * as Vega from 'vega';
import * as vegaSchema from 'vega/build/vega-schema.json';
import expressionFunction = Vega.expressionFunction;
import Spec = Vega.Spec;
import * as VegaLite from 'vega-lite';
import * as vegaLiteSchema from 'vega-lite/build/vega-lite-schema.json';
import { TopLevelSpec } from 'vega-lite';

import { fillPatternServices } from '../services';
import { createFormatterFromString } from '../utils/formatting';
import { getSchemaValidator } from '../utils/json';

/**
 * Interface specifying a flexible key/value pair object, which is supplied from Vega's tooltip handler and usually casted as `any`.
 */
interface IVegaViewDatum {
    [key: string]: any;
}

/**
 * Valid providers for the visual.
 */
type TSpecProvider = 'vega' | 'vegaLite';

/**
 * Used to constrain Vega rendering to supported types.
 */
type TSpecRenderMode = 'svg' | 'canvas';

/**
 * For the supplied spec, parse it to determine which provider we should use when importing it (precedence is Vega-Lite), and will then
 * fall-back to Vega if VL is not valid.
 */
const determineProviderFromSpec = (
    spec: Spec | TopLevelSpec
): TSpecProvider => {
    const vegaLiteValidator = getSchemaValidator(vegaLiteSchema),
        vlValid = vegaLiteValidator(spec);
    if (vlValid) {
        return 'vegaLite';
    }
    const vegaValidator = getSchemaValidator(vegaSchema),
        vValid = vegaValidator(spec);
    if (vValid) {
        return 'vega';
    }
    return null;
};

/**
 * Apply any custom expressions that we have written (e.g. formatting) to the specification prior to rendering.
 */
const registerCustomExpressions = () => {
    expressionFunction('pbiFormat', (datum: any, params: string) =>
        createFormatterFromString(`${params}`).format(datum)
    );
    expressionFunction(
        'pbiPatternSVG',
        (id: string, fgColor: string, bgColor: string) => {
            return fillPatternServices.generateDynamicPattern(
                id,
                fgColor,
                bgColor
            );
        }
    );
};

/**
 * Create a custom Vega loader for the visual. The intention was to ensure that we could use this to disable loading of external
 * content. However, it worked for data but not for images. This is essentially a stub, but it's left here in case we can make it
 * work the correct way in future.
 */
const resolveLoaderLogic = () => Vega.loader();
