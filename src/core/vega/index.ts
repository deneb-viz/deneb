export * as vegaUtils from './vegaUtils';
export {
    IVegaViewDatum,
    TSpecProvider,
    TSpecRenderMode,
    determineProviderFromSpec,
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
import * as vegaSchema from 'vega/build/vega-schema.json';
import expressionFunction = Vega.expressionFunction;
import scheme = Vega.scheme;
import Config = Vega.Config;
import Spec = Vega.Spec;
import View = Vega.View;
import * as vegaLiteSchema from 'vega-lite/build/vega-lite-schema.json';
import { TopLevelSpec } from 'vega-lite';

import forEach from 'lodash/forEach';
import isEqual from 'lodash/isEqual';
import keys from 'lodash/keys';
import matches from 'lodash/matches';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import reduce from 'lodash/reduce';

import { fillPatternServices, hostServices, viewServices } from '../services';
import { createFormatterFromString } from '../utils/formatting';
import { cleanParse, getSchemaValidator } from '../utils/json';
import { TEditorRole } from '../services/JsonEditorServices';
import {
    getState,
    useStoreDataset,
    useStoreEditorSpec,
    useStoreVisualSettings
} from '../../store';
import { getConfig, providerVersions } from '../utils/config';
import { getPatchedVegaSpec } from './vegaUtils';
import { getPatchedVegaLiteSpec } from './vegaLiteUtils';
import { bindInteractivityEvents } from '../interactivity/selection';
import { isFeatureEnabled } from '../utils/features';
import { blankImageBase64 } from '../ui/dom';
import { getDataset } from '../data/dataset';
import { divergentPalette, divergentPaletteMed, ordinalPalette } from './theme';
import { resolveSvgFilter } from '../ui/svgFilter';
import { i18nValue } from '../ui/i18n';
import {
    IVisualDatasetField,
    IVisualDatasetFields,
    IVisualDatasetValueRow
} from '../data';

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
const getViewConfig = () => {
    return {
        ...{
            background: null, // so we can defer to the Power BI background, if applied
            customFormatTypes: true
        },
        ...getParsedConfigFromSettings()
    };
};

/**
 * Form the specification that is applied to the Vega view. This will retrieve the specification from our visual properties, and enrich it with anything we want
 * to abstract out from the end-user to make things as "at home" in Power BI as possible, without explicitly adding it to the editor or exported template.
 */
const getViewSpec = () => {
    const editorSpec = useStoreEditorSpec();
    const provider = useStoreVisualSettings()?.vega?.provider;
    const vSpec = cloneDeep(editorSpec?.spec) || {};
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
    const jsonConfig = useStoreVisualSettings()?.vega?.jsonConfig;
    return cleanParse(jsonConfig, propertyDefaults.jsonConfig);
};

/**
 * Any logic that we need to apply to a new Vega view.
 */
const handleNewView = (newView: View) => {
    newView.runAsync().then(() => {
        viewServices.bindView(newView);
        resolveSvgFilter();
        bindInteractivityEvents(newView);
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
 * For a given (subset of) `fields` and `datum`, create an `IVisualDatasetValueRow`
 * that can be used to search for matching values in the visual's dataset.
 */
export const resolveDatumForFields = (
    fields: IVisualDatasetFields,
    datum: IVegaViewDatum
) => {
    const reducedDatum =
        <IVisualDatasetValueRow>pick(datum, keys(fields)) || null;
    return reduce(
        reducedDatum,
        (result, value, key) => {
            result[key] = resolveValueForField(fields[key], value);
            return result;
        },
        <IVisualDatasetValueRow>{}
    );
};

/**
 * Because Vega's tooltip channel supplies datum field values as strings, for a
 * supplied metadata `field` and `datum`, attempt to resolve it to a pure type,
 * so that we can try to use its value to reconcile against the visual's dataset
 * in order to resolve selection IDs.
 */
const resolveValueForField = (field: IVisualDatasetField, value: any) => {
    switch (true) {
        case field.type.dateTime: {
            return new Date(value);
        }
        case field.type.numeric:
        case field.type.integer: {
            return Number.parseFloat(value);
        }
        default:
            return value;
    }
};

/**
 * Take an item from a Vega event and attempt to resolve .
 */
export const resolveDataFromItem = (item: any): IVegaViewDatum[] => {
    switch (true) {
        case item === undefined:
            return null;
        case item?.context?.data?.facet?.values?.value:
            return item?.context?.data?.facet?.values?.value?.slice();
        default:
            return [{ ...item?.datum }];
    }
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
            const href = (isDataUri(uri) && uri) || blankImageBase64;
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
