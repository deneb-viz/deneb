export * as vegaUtils from './vegaUtils';
export {
    IVegaViewDatum,
    TSpecProvider,
    TSpecRenderMode,
    determineProviderFromSpec,
    getEditorSchema,
    getParsedConfigFromSettings,
    getViewConfig,
    getViewDataset,
    getViewSpec,
    handleNewView,
    registerCustomExpressions,
    resolveLoaderLogic
};

import cloneDeep from 'lodash/cloneDeep';
import * as Vega from 'vega';
import * as vegaSchema from 'vega/build/vega-schema.json';
import expressionFunction = Vega.expressionFunction;
import Config = Vega.Config;
import Spec = Vega.Spec;
import View = Vega.View;
import * as vegaLiteSchema from 'vega-lite/build/vega-lite-schema.json';
import { TopLevelSpec } from 'vega-lite';

import { fillPatternServices } from '../services';
import { createFormatterFromString } from '../utils/formatting';
import { cleanParse, getSchemaValidator } from '../utils/json';
import { TEditorRole } from '../services/JsonEditorServices';
import { getState } from '../../store';
import { getConfig } from '../utils/config';
import { getPatchedVegaSpec } from './vegaUtils';
import { getPatchedVegaLiteSpec } from './vegaLiteUtils';
import { bindInteractivityEvents } from '../interactivity/selection';
import { isFeatureEnabled } from '../utils/features';

/**
 * Defines a JSON schema by provider and role, so we can dynamically apply based on provider.
 */
interface IJSonSchema {
    provider: TSpecProvider;
    role: TEditorRole;
    schema: Object;
}

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
 * Schemas we wish to resolve when using the editor.
 */
const editorSchemas: IJSonSchema[] = [
    {
        provider: 'vega',
        role: 'spec',
        schema: vegaSchema
    },
    {
        provider: 'vegaLite',
        role: 'spec',
        schema: vegaLiteSchema
    }
];

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
 * Allows an editor to dynamically swap out schema based on provider & role.
 */
const getEditorSchema = (provider: TSpecProvider, role: TEditorRole) =>
    editorSchemas.find((s) => s.provider === provider && s.role === role)
        ?.schema || null;

/**
 * Create the `data` object for the Vega view specification. Ensures that the dataset applied to the visual is a cloned, mutable copy of the store version.
 */
const getViewDataset = () => {
    const { dataset } = getState().visual;
    return {
        dataset: cloneDeep(dataset.values)
    };
};

/**
 * Form the config that is applied to the Vega view. This will retrieve the config from our visual properties, and enrich it with anything we want
 * to abstract out from the end-user to make things as "at home" in Power BI as possible, without explicitly adding it to the editor or exported template.
 */
const getViewConfig = () => {
    const { themeColors } = getState().visual;
    return {
        ...{
            background: null, // so we can defer to the Power BI background, if applied
            customFormatTypes: true,
            range: {
                category: themeColors
            }
        },
        ...getParsedConfigFromSettings()
    };
};

/**
 * Form the specification that is applied to the Vega view. This will retrieve the specification from our visual properties, and enrich it with anything we want
 * to abstract out from the end-user to make things as "at home" in Power BI as possible, without explicitly adding it to the editor or exported template.
 */
const getViewSpec = () => {
    const { spec, settings } = getState().visual,
        { provider } = settings.vega,
        vSpec = cloneDeep(spec?.spec) || {};
    switch (<TSpecProvider>provider) {
        case 'vega':
            return getPatchedVegaSpec(vSpec);
        case 'vegaLite':
            return getPatchedVegaLiteSpec(vSpec);
        default:
            return vSpec;
    }
};

/**
 * Gets the `config` from our visual objects and parses it to JSON.
 */
const getParsedConfigFromSettings = (): Config => {
    const { vega } = getState().visual.settings;
    return cleanParse(vega.jsonConfig, propertyDefaults.jsonConfig);
};

/**
 * Any logic that we need to apply to a new Vega view.
 */
const handleNewView = (newView: View) => {
    bindInteractivityEvents(newView);
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
 * Create a custom Vega loader for the visual. We do a replace on URIs in the spec to prevent, but this doubly-ensures that nothing
 * can be loaded.
 */
const resolveLoaderLogic = () => {
    const loader = Vega.loader();
    if (!isFeatureEnabled('enableExternalUri')) {
        loader.load = (uri, options) => {
            const href = (isDataUri(uri) && uri) || '';
            return Promise.resolve(href);
        };
        loader.sanitize = (uri, options) => {
            const href = (isDataUri(uri) && uri) || blankImageBase64;
            return Promise.resolve({
                href
            });
        };
    }
    return loader;
};

/**
 * Test that supplied URI matches the data: protocol and should be whitelisted by the loader.
 */
const isDataUri = (uri: string) =>
    !!uri.match(
        /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i
    );

/**
 * Blank image data URI; used to return placeholder images when remote URIs are supplied
 */
const blankImageBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const propertyDefaults = getConfig().propertyDefaults.vega;
