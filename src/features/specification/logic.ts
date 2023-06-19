import * as Vega from 'vega';
import * as VegaLite from 'vega-lite';
import jsonrepair from 'jsonrepair';
import merge from 'lodash/merge';

import { getConfig } from '../../core/utils/config';
import {
    configEditorService,
    specEditorService
} from '../../core/services/JsonEditorServices';
import { getState } from '../../store';
import { getVegaSettings, TSpecProvider } from '../../core/vega';
import {
    getDenebVersionObject,
    getProviderVersionProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../../core/utils/properties';
import { cleanParse, getJsonAsIndentedString } from '../../core/utils/json';
import { i18nValue } from '../../core/ui/i18n';
import {
    IFixResult,
    IFixStatus,
    ISpecification,
    ISpecificationParseOptions,
    TSpecStatus
} from './types';
import { getLastVersionInfo } from '../../core/utils/versioning';
import { TEditorRole } from '../json-editor';
import { LocalVegaLoggerService, logDebug, logError } from '../logging';
import { IVisualDatasetValueRow } from '../../core/data';
import { DATASET_NAME } from '../../constants';
import {
    getFriendlyValidationErrors,
    getProviderValidator
} from './schema-validation';

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
    options: ISpecificationParseOptions
): ISpecification => {
    const { config, logLevel, provider, spec, values } = options;
    const logger = new LocalVegaLoggerService();
    logger.level(logLevel);
    const patchedSpec = getPatchedSpec(spec, provider, values);
    const patchedConfig = getPatchedConfig(config);
    logDebug('getParsedSpec', {
        config,
        patchedConfig: JSON.stringify(patchedConfig)
    });
    const warns: string[] = [];
    const errors: string[] = [];
    let status: TSpecStatus = 'new';
    if (!patchedSpec) {
        errors.push(i18nValue('Text_Debug_Error_Spec_Parse'));
    }
    if (!patchedConfig) {
        errors.push(i18nValue('Text_Debug_Error_Config_Parse'));
    }
    let specToParse = patchedSpec
        ? merge({ config: patchedConfig ?? {} }, patchedSpec)
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
        }
        status = 'valid';
    } catch (e) {
        errors.push(getErrorLine(spec, e.message));
        status = 'error';
        specToParse = null;
    }
    warns.push(...logger.warns);
    logDebug('getParsedSpec', {
        config,
        patchedConfig,
        spec,
        patchedSpec,
        specToParse,
        status,
        warns
    });
    return {
        errors,
        spec: specToParse,
        status,
        warns
    };
};

/**
 * Apply the base config for Power BI and then patch the editor config on top.
 */
const getPatchedConfig = (
    content: string
): VegaLite.Config | Vega.Config | null => {
    try {
        const config = cleanParse(content);
        return merge(
            {
                background: 'transparent', // defer to Power BI background, if applied
                customFormatTypes: true
            },
            config
        );
    } catch (e) {
        return null;
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
): VegaLite.TopLevelSpec | Vega.Spec | null => {
    try {
        const spec = cleanParse(content);
        return provider === 'vegaLite'
            ? getPatchedVegaLiteSpec(<VegaLite.TopLevelSpec>spec, values)
            : getPatchedVegaSpec(<Vega.Spec>spec, values);
    } catch (e) {
        return null;
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
 * Get the options for parsing the specification and configuration from the
 * store.
 */
const getSpecificationParseOptions = (
    stage = true
): ISpecificationParseOptions => {
    const {
        dataset: { values },
        editor: { stagedConfig, stagedSpec },
        visualSettings: {
            vega: { logLevel, provider, jsonConfig, jsonSpec }
        }
    } = getState();
    const spec = (stage ? getCleanEditorJson('spec') : stagedSpec) ?? jsonSpec;
    const config =
        (stage ? getCleanEditorJson('config') : stagedConfig) ?? jsonConfig;
    return {
        config,
        logLevel,
        provider: <TSpecProvider>provider,
        spec,
        values
    };
};

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
 * Determine if a visual's persisted spec pre-dates version 1.1.0.0 (when we started writing versions to properties).
 */
export const isLegacySpec = () => !isNewSpec() && !isVersionedSpec();

/**
 * In order to determine if our current spec/config is the same as the default properties, indicating that
 */
const isNewSpec = () => {
    const defaults = getConfig().propertyDefaults.vega;
    const { jsonSpec, jsonConfig } = getVegaSettings();
    return jsonSpec === defaults.jsonSpec && jsonConfig === defaults.jsonConfig;
};

/**
 * Determine if a visual is 'versioned' based on persisted properties.
 */
const isVersionedSpec = () => {
    const { denebVersion, providerVersion } = getLastVersionInfo();
    return (denebVersion && providerVersion) || false;
};

/**
 * Resolve the spec/config and use the `properties` API for persistence. Also
 * resets the `isDirty` flag in the store.
 */
export const persistSpecification = (stage = true) => {
    const {
        editor: { updateChanges }
    } = getState();
    const isDirty = false;
    const spo = getSpecificationParseOptions(stage);
    const specification = getParsedSpec(spo);
    updateChanges({
        isDirty,
        specification,
        stagedSpec: spo.spec,
        stagedConfig: spo.config
    });
    const { renewEditorFieldsInUse } = getState();
    renewEditorFieldsInUse();
    updateObjectProperties(
        resolveObjectProperties([
            getDenebVersionObject(),
            {
                objectName: 'vega',
                properties: [
                    { name: 'jsonSpec', value: spo.spec },
                    { name: 'jsonConfig', value: spo.config },
                    getProviderVersionProperty(spo.provider)
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
            `${i18nValue('Fix_Failed_Prefix')} ${fixedRawSpec.error || ''}${
                (!fixedRawSpec.success && !fixedRawConfig.success && ' & ') ||
                ''
            }${fixedRawConfig.error || ''}. ${i18nValue(
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
            error: `${i18nValue(
                operation === 'spec' ? 'Editor_Role_Spec' : 'Editor_Role_Config'
            )} ${i18nValue('Fix_Failed_Item')}`
        };
    }
};
