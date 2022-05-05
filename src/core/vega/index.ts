export * as vegaUtils from './vegaUtils';
export * as vegaLiteUtils from './vegaLiteUtils';
export {
    IVegaViewDatum,
    TSpecProvider,
    TSpecRenderMode,
    determineProviderFromSpec,
    editorConfigOverLoad,
    getEditorSchema,
    getParsedConfigFromSettings,
    getVegaProvider,
    getVegaProvideri18n,
    getVegaSettings,
    getVegaVersion,
    getViewConfig,
    getViewDataset,
    getViewSpec,
    handleNewView,
    registerCustomExpressions,
    registerCustomSchemes,
    resolveLoaderLogic
};

import cloneDeep from 'lodash/cloneDeep';
import * as Vega from 'vega';
import expressionFunction = Vega.expressionFunction;
import scheme = Vega.scheme;
import Config = Vega.Config;
import Spec = Vega.Spec;
import View = Vega.View;
import { TopLevelSpec } from 'vega-lite';

import { fillPatternServices, hostServices, loggerServices } from '../services';
import { createFormatterFromString } from '../utils/formatting';
import { cleanParse } from '../utils/json';
import { vegaLiteValidator, vegaValidator } from './validation';
import { TEditorRole } from '../services/JsonEditorServices';
import {
    getState,
    useStoreDataset,
    useStoreProp,
    useStoreVegaProp
} from '../../store';
import { getConfig, providerVersions } from '../utils/config';
import { getPatchedVegaSpec } from './vegaUtils';
import { getPatchedVegaLiteSpec } from './vegaLiteUtils';

import { isFeatureEnabled } from '../utils/features';

import { divergentPalette, divergentPaletteMed, ordinalPalette } from './theme';
import { resolveSvgFilter } from '../ui/svgFilter';
import { i18nValue } from '../ui/i18n';
import {
    bindContextMenuEvents,
    bindCrossFilterEvents
} from '../../features/interactivity';
import { BASE64_BLANK_IMAGE } from '../../features/template';

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
        schema: vegaValidator.schema
    },
    {
        provider: 'vegaLite',
        role: 'spec',
        schema: vegaLiteValidator.schema
    }
];

const editorConfigOverLoad = {
    background: null, // so we can defer to the Power BI background, if applied
    customFormatTypes: true
};

/**
 * For the supplied spec, parse it to determine which provider we should use when importing it (precedence is Vega-Lite), and will then
 * fall-back to Vega if VL is not valid.
 */
const determineProviderFromSpec = (
    spec: Spec | TopLevelSpec
): TSpecProvider => {
    const vlValid = vegaLiteValidator(spec);
    if (vlValid) {
        return 'vegaLite';
    }
    const vValid = vegaValidator(spec);
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
 * Convenience function to get current Vega provider from persisted properties.
 */
const getVegaProvider = () => <TSpecProvider>getVegaSettings().provider;

/**
 * Get the Vega provider, resolved for i18n.
 */
const getVegaProvideri18n = () =>
    i18nValue(
        getVegaProvider() === 'vegaLite' ? 'Provider_VegaLite' : 'Provider_Vega'
    );

/**
 * For the current provider, get the version from our package configuration.
 */
const getVegaVersion = () => providerVersions[getVegaProvider()];

/**
 * Convenience function to get current Vega/Spec settings from the visual objects (as we use this a lot).
 */
const getVegaSettings = () => getState().visualSettings.vega;

/**
 * Create the `data` object for the Vega view specification. Ensures that the dataset applied to the visual is a cloned, mutable copy of the store version.
 */
const getViewDataset = () => ({
    dataset: cloneDeep(useStoreDataset()?.values)
});

/**
 * Form the config that is applied to the Vega view. This will retrieve the config from our visual properties, and enrich it with anything we want
 * to abstract out from the end-user to make things as "at home" in Power BI as possible, without explicitly adding it to the editor or exported template.
 */
const getViewConfig = (config = getParsedConfigFromSettings()): Config => {
    return {
        ...editorConfigOverLoad,
        ...config
    };
};

/**
 * Form the specification that is applied to the Vega view. This will retrieve the specification from our visual properties, and enrich it with anything we want
 * to abstract out from the end-user to make things as "at home" in Power BI as possible, without explicitly adding it to the editor or exported template.
 */
const getViewSpec = () => {
    const eSpec = useStoreProp<object>('spec', 'editorSpec');
    const provider = useStoreVegaProp<TSpecProvider>('provider');
    const vSpec = cloneDeep(eSpec) || {};
    switch (provider) {
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
    const jsonConfig = useStoreVegaProp<string>('jsonConfig');
    return cleanParse(jsonConfig, propertyDefaults.jsonConfig);
};

/**
 * Any logic that we need to apply to a new Vega view.
 */
const handleNewView = (newView: View) => {
    newView.logger(loggerServices);
    newView.runAsync().then((view) => {
        resolveSvgFilter();
        bindContextMenuEvents(view);
        bindCrossFilterEvents(view);
        getState().updateEditorView(view);
        hostServices.renderingFinished();
    });
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
 * Bind custom schemes to the view that sync to the report theme.
 */
const registerCustomSchemes = () => {
    scheme('pbiColorNominal', hostServices.getThemeColors());
    scheme('pbiColorOrdinal', ordinalPalette());
    scheme('pbiColorLinear', divergentPalette());
    scheme('pbiColorDivergent', divergentPaletteMed());
};

/**
 * Create a custom Vega loader for the visual. We do a replace on URIs in the
 * spec to prevent, but this doubly-ensures that nothing can be loaded.
 */
const resolveLoaderLogic = () => {
    const loader = Vega.loader();
    if (!isFeatureEnabled('enableExternalUri')) {
        loader.load = (uri, options) => {
            const href = (isDataUri(uri) && uri) || '';
            return Promise.resolve(href);
        };
        loader.sanitize = (uri, options) => {
            const href = (isDataUri(uri) && uri) || BASE64_BLANK_IMAGE;
            return Promise.resolve({
                href
            });
        };
    }
    return loader;
};

/**
 * Test that supplied URI matches the data: protocol and should be whitelisted
 * by the loader.
 */
const isDataUri = (uri: string) =>
    !!uri.match(
        /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i
    );

const propertyDefaults = getConfig().propertyDefaults.vega;
