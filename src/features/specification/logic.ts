import * as Vega from 'vega';
import * as VegaLite from 'vega-lite';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import merge from 'lodash/merge';
import omit from 'lodash/omit';

import { TStoreState, getState } from '../../store';
import { getVegaSettings, TSpecProvider } from '../../core/vega';
import {
    resolveObjectProperties,
    updateObjectProperties
} from '../../core/utils/properties';
import {
    getTextFormattedAsJsonC,
    parseAndValidateContentJson
} from '../json-processing';
import {
    IContentPatchResult,
    IFixStatus,
    ISpecification,
    ISpecificationComparisonOptions,
    ISpecificationParseOptions,
    TSpecStatus
} from './types';
import { TEditorRole } from '../json-editor';
import {
    LocalVegaLoggerService,
    logDebug,
    logError,
    logTimeEnd,
    logTimeStart
} from '../logging';
import { IVisualDatasetValueRow } from '../../core/data';
import { DATASET_NAME } from '../../constants';
import {
    getFriendlyValidationErrors,
    getProviderValidator
} from './schema-validation';
import { getI18nValue } from '../i18n';
import { getHashValue } from '../../utils';
import { PROPERTY_DEFAULTS, PROVIDER_RESOURCES } from '../../../config';
import { IAceEditor } from 'react-ace/lib/types';

/**
 * For a given operation and string input, ensure that it's trimmed and replaced with suitable defaults if empty.
 */
const cleanJsonInputForPersistence = (
    operation: TEditorRole,
    input: string
): string => {
    const clean = input?.trim() || '';
    if (clean === '') {
        switch (operation) {
            case 'Spec':
                return PROPERTY_DEFAULTS.vega.jsonSpec;
            case 'Config':
                return PROPERTY_DEFAULTS.vega.jsonConfig;
        }
    }
    return clean;
};

/**
 * For the specification and configuration in each editor, attempt to fix any simple issues that might prevent it from being valid
 * JSON. We'll also indent it if valid. If it doesn't work, we'll update the store with the error details so that we can inform the
 * user to take action.
 */
export const fixAndFormatSpecification = (
    specEditor: IAceEditor,
    configEditor: IAceEditor
) => {
    try {
        const fixedRawSpec = tryFixAndFormat('Spec', specEditor.getValue());
        const fixedRawConfig = tryFixAndFormat(
            'Config',
            configEditor.getValue()
        );
        if (fixedRawSpec.success) {
            specEditor.setValue(fixedRawSpec.text);
        }
        if (fixedRawConfig.success) {
            configEditor.setValue(fixedRawConfig.text);
        }
        persistSpecification(specEditor, configEditor);
    } catch (e) {
        logError('Format error', e);
    }
};

/**
 * Further abstracts the `cleanJsonInputForPersistence` workflow so that calling functions are easier to follow.
 */
export const getCleanEditorJson = (role: TEditorRole, editor: IAceEditor) =>
    cleanJsonInputForPersistence(role, editor?.getValue());

/**
 * Borrowed from vega-editor
 */
const getErrorLine = (code: string, error: string) => {
    const pattern = /(position\s)(\d+)/;
    let charPos: any = error.match(pattern);

    if (charPos !== null) {
        charPos = charPos[2];
        if (!isNaN(charPos)) {
            let line = 1;
            let cursorPos = 0;

            while (
                cursorPos < charPos &&
                code.indexOf('\n', cursorPos) < charPos &&
                code.indexOf('\n', cursorPos) > -1
            ) {
                const newlinePos = code.indexOf('\n', cursorPos);
                line = line + 1;
                cursorPos = newlinePos + 1;
            }

            return `${error} and line ${line}`;
        }
    } else {
        return error;
    }
};

/**
 * Handle parsing of the JSON from the spec editor.
 */
export const getParsedSpec = (
    currentSpec: ISpecification,
    prevOptions: ISpecificationParseOptions,
    nextOptions: ISpecificationParseOptions
): ISpecification => {
    logTimeStart('getParsedSpec');
    logDebug('getParsedSpec starting', {
        currentSpec,
        prevOptions,
        nextOptions
    });
    const isVolatile = isSpecificationVolatile(prevOptions, nextOptions);
    if (!isVolatile) {
        logDebug('prev and next values match. No need to re-parse.');
        logTimeEnd('getParsedSpec');
        return currentSpec;
    }
    logDebug('prev and next values differ. Re-parsing...');
    const { config, logLevel, provider, spec } = nextOptions;
    const logger = new LocalVegaLoggerService();
    logger.level(logLevel);
    const patchedSpec = getPatchedSpec(spec, provider);
    const patchedConfig = getPatchedConfig(config);
    const warns: string[] = [];
    const errors: string[] = [];
    let status: TSpecStatus = 'new';
    const specHasErrors = patchedSpec.errors.length > 0;
    const configHasErrors = patchedConfig.errors.length > 0;
    if (specHasErrors) {
        errors.push(getI18nValue('Text_Debug_Error_Spec_Parse'));
        errors.push(...patchedSpec.errors);
    }
    if (configHasErrors) {
        errors.push(getI18nValue('Text_Debug_Error_Config_Parse'));
        errors.push(...patchedConfig.errors);
    }
    let specToParse: Vega.Spec | VegaLite.TopLevelSpec | null = null;
    if (!specHasErrors && !configHasErrors) {
        logDebug('Spec and config are valid. Attempting to parse...', {
            patchedSpec,
            patchedConfig
        });
        specToParse = patchedSpec
            ? merge({ config: patchedConfig.result ?? {} }, patchedSpec.result)
            : null;
        logDebug('Spec size: ', JSON.stringify(specToParse).length);
        try {
            if (nextOptions.visualMode === 'Editor') {
                logTimeStart('schema validation');
                const validator = getProviderValidator({ provider });
                const valid = validator(specToParse);
                logTimeEnd('schema validation');
                if (!valid && validator.errors) {
                    getFriendlyValidationErrors(validator.errors).forEach(
                        (error) => logger.warn(`Validation: ${error}`)
                    );
                }
            }
            logTimeStart('vega/vega-lite compile');
            if (provider === 'vegaLite') {
                VegaLite.compile(<VegaLite.TopLevelSpec>specToParse);
            } else {
                Vega.parse(<Vega.Spec>specToParse);
            }
            logTimeEnd('vega/vega-lite compile');
            specToParse;
            status = 'valid';
        } catch (e) {
            errors.push(getErrorLine(spec, getRedactedError(e.message)));
            status = 'error';
            specToParse = null;
        }
        warns.push(...logger.warns);
    }
    const hashValue = getHashValue(specToParse);
    logDebug('getParsedSpec results', {
        config,
        patchedConfig,
        spec,
        patchedSpec,
        specToParse,
        status,
        warns
    });
    const specification = {
        errors,
        hashValue,
        spec: specToParse,
        status,
        warns
    };
    logTimeEnd('getParsedSpec');
    return specification;
};

/**
 * Apply the base config for Power BI and then patch the editor config on top.
 */
const getPatchedConfig = (content: string): IContentPatchResult => {
    try {
        const parsedConfig = parseAndValidateContentJson(content);
        if (parsedConfig.errors.length > 0) return parsedConfig;
        return {
            result: merge(
                {
                    background: 'transparent', // defer to Power BI background, if applied
                    customFormatTypes: true
                },
                parsedConfig.result
            ),
            errors: []
        };
    } catch (e) {
        return { result: null, errors: [e.message] };
    }
};

/**
 * Patch the data array in a spec to ensure that values from the visual
 * dataset are in the correct place.
 */
const getPatchedData = (spec: Vega.Spec, values: IVisualDatasetValueRow[]) => {
    const name = DATASET_NAME;
    logDebug('getPatchedData', { spec, values });
    try {
        const newSpec = typeof spec === 'undefined' ? {} : spec;
        const data = newSpec?.data ?? [];
        const index = data.findIndex((ds) => ds.name == name);
        return index >= 0
            ? [
                  ...newSpec.data.slice(0, index),
                  ...[
                      {
                          ...newSpec.data[index],
                          values
                      }
                  ],
                  ...newSpec.data.slice(index + 1)
              ]
            : [
                  ...(newSpec.data ?? []),
                  ...[
                      {
                          name,
                          values
                      }
                  ]
              ];
    } catch (e) {
        return [{ name, values }];
    }
};

/**
 * For the spec and dataset values, attempt to parse the JSON and apply any
 * patches that we need to ensure that the visual functions as expected.
 */
const getPatchedSpec = (
    content: string,
    provider: TSpecProvider
): IContentPatchResult => {
    try {
        const parsedSpec = parseAndValidateContentJson(content);
        if (parsedSpec.errors.length > 0) return parsedSpec;
        return {
            result:
                provider === 'vegaLite'
                    ? getPatchedVegaLiteSpec(
                          <VegaLite.TopLevelSpec>parsedSpec.result
                      )
                    : getPatchedVegaSpec(<Vega.Spec>parsedSpec.result),
            errors: []
        };
    } catch (e) {
        return { result: null, errors: [e.message] };
    }
};

/**
 * Apply specific patching operations to a supplied spec. This applies any
 * specific signals that we don't necessarily want the creator to worry about,
 * but will ensure that the visual functions as expected.
 */
const getPatchedVegaSpec = (spec: Vega.Spec): Vega.Spec => {
    return merge(spec, {
        height: spec['height'] ?? { signal: 'pbiContainerHeight' },
        width: spec['width'] ?? { signal: 'pbiContainerWidth' },
        signals: [
            ...(spec['signals'] || []),
            ...(PROVIDER_RESOURCES?.vega?.patch?.signals || [])
        ]
    });
};

/**
 * Merge the Vega spec and dataset values together.
 * @privateRemarks We've found some issues with react-vega, where if we supply
 * the dataset separately, we have a number of errors that don't take place if
 * we include the data directly (like we might normally do in a tool like Vega
 * Editor), so we do this here. We don;t do this in `getPatchedVegaSpec`, as
 * this creates too much overhead when parsing the spec.
 */
const getPatchedVegaSpecWithData = (
    spec: Vega.Spec,
    values: IVisualDatasetValueRow[]
) => {
    logTimeStart('getPatchedVegaSpecWithData');
    logDebug('getPatchedVegaSpecWithData', { spec, values });
    const merged = Object.assign(spec || {}, {
        data: getPatchedData(spec, values)
    });
    logTimeEnd('getPatchedVegaSpecWithData');
    return merged;
};

/**
 * Apply specific patching operations to a supplied Vega-Lite spec. This
 * applies any specific signals that we don't necessarily want the creator to
 * worry about, but will ensure that the visual functions as expected.
 */
const getPatchedVegaLiteSpec = (spec: VegaLite.TopLevelSpec) => {
    const isNsl = isVegaLiteSpecNonStandardLayout(spec);
    return merge(
        spec,
        isNsl
            ? {}
            : {
                  height: spec['height'] ?? 'container',
                  width: spec['width'] ?? 'container'
              }
    );
};

/**
 * Merge the Vega-Lite spec and dataset values together.
 * @privateRemarks We've found some issues with react-vega, where if we supply
 * the dataset separately, we have a number of errors that don't take place if
 * we include the data directly (like we might normally do in a tool like Vega
 * Editor), so we do this here. We don't do this in `getPatchedVegaLiteSpec`,
 * as this creates too much overhead when parsing the spec.
 */
const getPatchedVegaLiteSpecWithData = (
    spec: VegaLite.TopLevelSpec,
    values: IVisualDatasetValueRow[]
) => {
    logTimeStart('getPatchedVegaLiteSpecWithData');
    const merged = Object.assign(spec || {}, {
        datasets: {
            ...(spec?.datasets ?? {}),
            [`${DATASET_NAME}`]: values
        }
    });
    logTimeEnd('getPatchedVegaLiteSpecWithData');
    return merged;
};

/**
 * Due to spec patching, we get quite verbose error messages if the spec is
 * invalid. This will contain the raw dataset and other things we add, so to
 * prevent confusing the user, we'll just redact the JSON from the message.
 */
const getRedactedError = (message: string) => {
    return message.replace(/(Invalid specification) (\{.*\})/g, '$1');
};

export const getSpecificationForVisual = () => {
    const {
        dataset: { values },
        specification: { spec },
        visualSettings: {
            vega: { provider }
        }
    } = getState();
    /**
     * #369: if we don't clone values to a unique object, they get mutated in
     * the store and this breaks the dataset until we re-initialize.
     */
    const specValues = cloneDeep(values);
    switch (provider) {
        case 'vega':
            return <Vega.Spec>(
                getPatchedVegaSpecWithData(<Vega.Spec>spec, specValues)
            );
        case 'vegaLite':
            return <VegaLite.TopLevelSpec>(
                getPatchedVegaLiteSpecWithData(
                    <VegaLite.TopLevelSpec>spec,
                    specValues
                )
            );
    }
};

/**
 * Get the options for parsing the specification and configuration from the
 * store.
 */
export const getSpecificationParseOptions = (
    state: TStoreState
): ISpecificationParseOptions => ({
    config: state.visualSettings.vega.jsonConfig,
    datasetHash: state.dataset.hashValue,
    logLevel: state.visualSettings.vega.logLevel,
    provider: <TSpecProvider>state.visualSettings.vega.provider,
    spec: state.visualSettings.vega.jsonSpec,
    viewportHeight: state.visualViewportReport.height,
    viewportWidth: state.visualViewportReport.width,
    visualMode: state.interface.mode
});

/**
 * Looks at the active specification and config in the visual editors and
 * compares with persisted values in the visual properties. Used to set
 * the `isDirty` flag in the store.
 */
export const hasLiveSpecChanged = (
    specEditor: IAceEditor,
    configEditor: IAceEditor
) => {
    const { jsonSpec, jsonConfig } = getVegaSettings(),
        liveSpec = getCleanEditorJson('Spec', specEditor),
        liveConfig = getCleanEditorJson('Config', configEditor);
    return liveSpec != jsonSpec || liveConfig != jsonConfig;
};

/**
 * If the Vega-Lite spec uses facet, vconcat or hconcat, we need to ensure that
 * we don't patch the spec with the viewport dimensions. This is because the
 * spec is not the top-level spec, but a child of the facet/vconcat/hconcat
 * spec. We'll need to look at the spec and determine if it's a non-standard
 * layout.
 */
const isVegaLiteSpecNonStandardLayout = (spec: VegaLite.TopLevelSpec) =>
    'facet' in spec || 'hconcat' in spec || 'vconcat' in spec;

/**
 * Determine if the current spec is 'unversioned', meaning that it's the same
 * as the default properties.
 */
export const isUnversionedSpec = () => !isNewSpec() && !isVersionedSpec();

/**
 * In order to determine if our current spec/config is the same as the default properties, indicating that
 */
const isNewSpec = () => {
    const defaults = PROPERTY_DEFAULTS.vega;
    const { jsonSpec, jsonConfig } = getVegaSettings();
    return jsonSpec === defaults.jsonSpec && jsonConfig === defaults.jsonConfig;
};

/**
 * We only need to parse a specification if key information changes between
 * events. This is a simple equality check against that key information.
 *
 * @privateRemarks current events where a spec may need to be checked and re-
 * parsed if necessary are:
 *  - dataset updated (in dataset slice)
 *  - dataset selectors updated (in dataset slice)
 *  - visual properties change during update (spec, config, provider, viewport)
 *      and dataset has been processed
 */
export const isSpecificationVolatile = (
    prev: ISpecificationComparisonOptions,
    next: ISpecificationComparisonOptions
) => {
    const omitList = ['datasetHash', 'values'];
    const newPrev = omit(prev, omitList);
    const newNext = omit(next, omitList);
    logDebug('isSpecificationVolatile', { newPrev, newNext });
    return !isEqual(newPrev, newNext);
};

/**
 * Determine if a visual is 'versioned' based on persisted properties.
 */
const isVersionedSpec = () => {
    const {
        visualSettings: {
            developer: { version: denebVersion },
            vega: { version: providerVersion }
        }
    } = getState();
    return (denebVersion && providerVersion) || false;
};

/**
 * Resolve the spec/config and use the `properties` API for persistence. Also
 * resets the `isDirty` flag in the store.
 */
export const persistSpecification = (
    specEditor: IAceEditor,
    configEditor: IAceEditor,
    stage = true
) => {
    const {
        editor: { stagedConfig, stagedSpec, updateChanges },
        visualSettings: {
            vega: { jsonConfig, jsonSpec }
        }
    } = getState();
    const spec =
        (stage ? getCleanEditorJson('Spec', specEditor) : stagedSpec) ??
        jsonSpec;
    const config =
        (stage ? getCleanEditorJson('Config', configEditor) : stagedConfig) ??
        jsonConfig;
    updateChanges({ role: 'Spec', text: spec });
    updateChanges({ role: 'Config', text: config });
    const { renewEditorFieldsInUse } = getState();
    renewEditorFieldsInUse(specEditor);
    updateObjectProperties(
        resolveObjectProperties([
            {
                objectName: 'vega',
                properties: [
                    { name: 'jsonSpec', value: spec },
                    { name: 'jsonConfig', value: config }
                ]
            }
        ])
    );
};

const tryFixAndFormat = (operation: TEditorRole, input: string): IFixStatus => {
    try {
        return {
            success: true,
            text: getTextFormattedAsJsonC(
                input,
                PROPERTY_DEFAULTS.editor.tabSize
            )
        };
    } catch (e) {
        return {
            success: false,
            text: input,
            error: `${getI18nValue(
                operation === 'Spec' ? 'Editor_Role_Spec' : 'Editor_Role_Config'
            )} ${getI18nValue('Fix_Failed_Item')}`
        };
    }
};
