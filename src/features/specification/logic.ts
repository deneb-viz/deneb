import * as Vega from 'vega';
import * as VegaLite from 'vega-lite';
import jsonrepair from 'jsonrepair';
import isEqual from 'lodash/isEqual';
import merge from 'lodash/merge';
import { digest } from 'jsum';

import { getConfig } from '../../core/utils/config';
import {
    configEditorService,
    specEditorService
} from '../../core/services/JsonEditorServices';
import { TStoreState, getState } from '../../store';
import { getVegaSettings, TSpecProvider } from '../../core/vega';
import {
    resolveObjectProperties,
    updateObjectProperties
} from '../../core/utils/properties';
import {
    parseAndValidateContentJson,
    getJsonAsIndentedString
} from '../../core/utils/json';
import {
    IContentPatchResult,
    IFixResult,
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

const PROPERTY_DEFAULTS = getConfig().propertyDefaults.vega;

/**
 * For a given operation and string input, ensure that it's trimmed and replaced with suitable defaults if empty.
 */
const cleanJsonInputForPersistence = (
    operation: TEditorRole,
    input: string
): string => {
    const clean = input.trim();
    if (clean === '') {
        switch (operation) {
            case 'spec':
                return PROPERTY_DEFAULTS.jsonSpec;
            case 'config':
                return PROPERTY_DEFAULTS.jsonConfig;
        }
    }
    return clean;
};

/**
 * Dispatch the results of a fix and repair operation to the store.
 */
const dispatchFixStatus = (result: IFixResult) => {
    getState().updateEditorFixStatus(result);
};

/**
 * For the specification and configuration in each editor, attempt to fix any simple issues that might prevent it from being valid
 * JSON. We'll also indent it if valid. If it doesn't work, we'll update the store with the error details so that we can inform the
 * user to take action.
 */
export const fixAndFormatSpecification = () => {
    try {
        const fixedRawSpec = tryFixAndFormat(
                'spec',
                specEditorService.getText()
            ),
            fixedRawConfig = tryFixAndFormat(
                'config',
                configEditorService.getText()
            ),
            success = fixedRawSpec.success && fixedRawConfig.success;
        const result: IFixResult = {
            success: success,
            spec: fixedRawSpec,
            config: fixedRawConfig,
            dismissed: false,
            error: resolveFixErrorMessage(success, fixedRawSpec, fixedRawConfig)
        };
        if (fixedRawSpec.success) {
            specEditorService.setText(fixedRawSpec.text);
        }
        if (fixedRawConfig.success) {
            configEditorService.setText(fixedRawConfig.text);
        }
        dispatchFixStatus(result);
        persistSpecification();
    } catch (e) {
        logError('Format error', e);
    }
};

/**
 * Further abstracts the `cleanJsonInputForPersistence` workflow so that calling functions are easier to follow.
 */
export const getCleanEditorJson = (role: TEditorRole) =>
    cleanJsonInputForPersistence(
        role,
        role === 'spec'
            ? specEditorService.getText()
            : configEditorService.getText()
    );

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
    const { config, logLevel, provider, spec, values } = nextOptions;
    const logger = new LocalVegaLoggerService();
    logger.level(logLevel);
    const patchedSpec = getPatchedSpec(spec, provider, values);
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
        try {
            const validator = getProviderValidator({ provider });
            const valid = validator(specToParse);
            if (!valid && validator.errors) {
                getFriendlyValidationErrors(validator.errors).forEach((error) =>
                    logger.warn(`Validation: ${error}`)
                );
            }
            if (provider === 'vegaLite') {
                VegaLite.compile(<VegaLite.TopLevelSpec>specToParse);
            } else {
                Vega.parse(<Vega.Spec>specToParse);
            }
            specToParse;
            status = 'valid';
        } catch (e) {
            errors.push(getErrorLine(spec, getRedactedError(e.message)));
            status = 'error';
            specToParse = null;
        }
        warns.push(...logger.warns);
    }
    const hashValue = digest(specToParse, 'SHA256', 'hex');
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
    provider: TSpecProvider,
    values: IVisualDatasetValueRow[]
): IContentPatchResult => {
    try {
        const parsedSpec = parseAndValidateContentJson(content);
        if (parsedSpec.errors.length > 0) return parsedSpec;
        return {
            result:
                provider === 'vegaLite'
                    ? getPatchedVegaLiteSpec(
                          <VegaLite.TopLevelSpec>parsedSpec.result,
                          values
                      )
                    : getPatchedVegaSpec(<Vega.Spec>parsedSpec.result, values),
            errors: []
        };
    } catch (e) {
        return { result: null, errors: [e.message] };
    }
};

/**
 * Apply specific patching operations to a supplied spec. This applies any
 * specific signals that we don't necessarily want the creator to worry about,
 * but will ensure that the visual functions as expected. We also patch in the
 * dataset, because we've found that binding this via react-vega causes some
 * issues with the data being available for certain calculations. This
 * essentially ensures that the data is processed in-line with the spec.
 */
const getPatchedVegaSpec = (
    spec: Vega.Spec,
    values: IVisualDatasetValueRow[]
): Vega.Spec => {
    return merge(spec, {
        height: spec['height'] ?? { signal: 'pbiContainerHeight' },
        width: spec['width'] ?? { signal: 'pbiContainerWidth' },
        data: getPatchedData(spec, values),
        signals: [
            ...(spec['signals'] || []),
            ...(getConfig()?.providerResources?.vega?.patch?.signals || [])
        ]
    });
};

/**
 * Apply specific patching operations to a supplied Vega-Lite spec. This
 * applies any specific signals that we don't necessarily want the creator to
 * worry about, but will ensure that the visual functions as expected. We also
 * patch in the dataset, because we've found that binding this via react-vega
 * causes some issues with the data being available for certain calculations.
 * This essentially ensures that the data is processed in-line with the spec.
 */
const getPatchedVegaLiteSpec = (
    spec: VegaLite.TopLevelSpec,
    values: IVisualDatasetValueRow[]
) => {
    return merge(spec, {
        height: spec['height'] ?? 'container',
        width: spec['width'] ?? 'container',
        datasets: {
            ...(spec.datasets ?? {}),
            [`${DATASET_NAME}`]: values
        }
    });
};

/**
 * Due to spec patching, we get quite verbose error messages if the spec is
 * invalid. This will contain the raw dataset and other things we add, so to
 * prevent confusing the user, we'll just redact the JSON from the message.
 */
const getRedactedError = (message: string) => {
    return message.replace(/(Invalid specification) (\{.*\})/g, '$1');
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
    values: state.dataset.values,
    viewportHeight: state.visualViewportReport.height,
    viewportWidth: state.visualViewportReport.width,
    visualMode: state.interface.mode
});

/**
 * Looks at the active specification and config in the visual editors and compares with persisted values in the visual properties. Used to set
 * the `isDirty` flag in the store.
 */
export const hasLiveSpecChanged = () => {
    const { jsonSpec, jsonConfig } = getVegaSettings(),
        liveSpec = getCleanEditorJson('spec'),
        liveConfig = getCleanEditorJson('config');
    return liveSpec != jsonSpec || liveConfig != jsonConfig;
};

/**
 * Determine if the current spec is 'unversioned', meaning that it's the same
 * as the default properties.
 */
export const isUnversionedSpec = () => !isNewSpec() && !isVersionedSpec();

/**
 * In order to determine if our current spec/config is the same as the default properties, indicating that
 */
const isNewSpec = () => {
    const defaults = getConfig().propertyDefaults.vega;
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
) => !isEqual(prev, next);

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
export const persistSpecification = (stage = true) => {
    const {
        editor: { stagedConfig, stagedSpec, updateChanges },
        visualSettings: {
            vega: { jsonConfig, jsonSpec }
        }
    } = getState();
    const isDirty = false;
    const spec = (stage ? getCleanEditorJson('spec') : stagedSpec) ?? jsonSpec;
    const config =
        (stage ? getCleanEditorJson('config') : stagedConfig) ?? jsonConfig;
    updateChanges({
        isDirty,
        stagedSpec: spec,
        stagedConfig: config
    });
    const { renewEditorFieldsInUse } = getState();
    renewEditorFieldsInUse();
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

/**
 * For the results of a fix and repair operation, resolve the error message for the end-user (if applicable).
 */
const resolveFixErrorMessage = (
    success: boolean,
    fixedRawSpec: IFixStatus,
    fixedRawConfig: IFixStatus
): string => {
    return (
        (!success &&
            `${getI18nValue('Fix_Failed_Prefix')} ${fixedRawSpec.error || ''}${
                (!fixedRawSpec.success && !fixedRawConfig.success && ' & ') ||
                ''
            }${fixedRawConfig.error || ''}. ${getI18nValue(
                'Fix_Failed_Suffix'
            )}`) ||
        undefined
    );
};

const tryFixAndFormat = (operation: TEditorRole, input: string): IFixStatus => {
    try {
        return {
            success: true,
            text: getJsonAsIndentedString(JSON.parse(jsonrepair(input)))
        };
    } catch (e) {
        return {
            success: false,
            text: input,
            error: `${getI18nValue(
                operation === 'spec' ? 'Editor_Role_Spec' : 'Editor_Role_Config'
            )} ${getI18nValue('Fix_Failed_Item')}`
        };
    }
};
