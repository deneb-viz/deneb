export {
    createFromTemplate,
    fixAndFormat,
    getSpecFieldsInUse,
    hasLiveSpecChanged,
    isLegacySpec,
    parseActiveSpec,
    persist,
    remapSpecificationFields,
    stageEditorData,
    ICompiledSpec,
    IFixResult,
    IFixStatus
};

import * as Vega from 'vega';
import Spec = Vega.Spec;
import * as VegaLite from 'vega-lite';
import { TopLevelSpec } from 'vega-lite';
import jsonrepair from 'jsonrepair';

import forIn from 'lodash/forIn';
import reduce from 'lodash/reduce';

import { getConfig } from './config';
import {
    configEditorService,
    specEditorService,
    TEditorRole
} from '../services/JsonEditorServices';
import {
    getDenebVersionObject,
    getProviderVersionProperty,
    IPersistenceProperty,
    resolveObjectProperties,
    updateObjectProperties
} from './properties';
import { getState } from '../../store';
import {
    getExportFieldTokenPatterns,
    getFieldExpression,
    getInteractivityPropsFromTemplate,
    getReducedPlaceholdersForMetadata,
    getReplacedTemplate,
    getResequencedMetadata,
    getSpecWithFieldPlaceholders
} from '../template';
import { i18nValue } from '../ui/i18n';
import { cleanParse, getJsonAsIndentedString } from './json';
import { getPatchedVegaSpec } from '../vega/vegaUtils';
import { getPatchedVegaLiteSpec } from '../vega/vegaLiteUtils';
import { getVegaSettings, TSpecProvider } from '../vega';
import { ITemplateInteractivityOptions } from '../template/schema';
import { getLastVersionInfo } from './versioning';
import { IVisualDatasetFields } from '../data';
import {
    getDatasetFieldsInclusive,
    getDatasetTemplateFields
} from '../data/fields';

/**
 * For the supplied provider and specification template, add this to the visual and persist to properties, ready for
 * subsequent editing.
 */
const createFromTemplate = (
    provider: TSpecProvider,
    template: Spec | TopLevelSpec
) => {
    const jsonSpec = getReplacedTemplate(template);
    const jsonConfig = getJsonAsIndentedString(template.config);
    const interactivity = getInteractivityPropsFromTemplate(template);
    const specProvider: TSpecProvider =
        provider || template?.usermeta?.['deneb']?.['provider'];
    const { renewEditorFieldsInUse } = getState();
    updateObjectProperties(
        resolveObjectProperties([
            getDenebVersionObject(),
            {
                objectName: 'vega',
                properties: [
                    ...[
                        { name: 'provider', value: provider },
                        { name: 'jsonSpec', value: jsonSpec },
                        { name: 'jsonConfig', value: jsonConfig },
                        { name: 'isNewDialogOpen', value: false },
                        getProviderVersionProperty(specProvider)
                    ],
                    ...resolveInteractivityProps(interactivity)
                ]
            }
        ])
    );
    renewEditorFieldsInUse();
    specEditorService.setText(jsonSpec);
    configEditorService.setText(jsonConfig);
};

/**
 * For the specification and configuration in each editor, attempt to fix any simple issues that might prevent it from being valid
 * JSON. We'll also indent it if valid. If it doesn't work, we'll update the store with the error details so that we can inform the
 * user to take action.
 */
const fixAndFormat = () => {
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
        let result: IFixResult = {
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
        persist();
    } catch (e) {}
};

/**
 * Looks at the active specification and config in the visual editors and compares with persisted values in the visual properties. Used to set
 * the `isDirty` flag in the store.
 */
const hasLiveSpecChanged = () => {
    const { jsonSpec, jsonConfig } = getVegaSettings(),
        liveSpec = getCleanEditorJson('spec'),
        liveConfig = getCleanEditorJson('config');
    return liveSpec != jsonSpec || liveConfig != jsonConfig;
};

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
 * Determine if a visual's persisted spec pre-dates version 1.1.0.0 (when we started writing versions to properties).
 */
const isLegacySpec = () => !isNewSpec() && !isVersionedSpec();

const parseActiveSpec = () => {
    const { provider, jsonSpec } = getVegaSettings();
    try {
        if (!jsonSpec) {
            // Spec hasn't been edited yet
            dispatchSpec({
                status: 'new',
                spec: propertyDefaults.jsonSpec,
                rawSpec: propertyDefaults.jsonConfig
            });
            return;
        }
        const parsedSpec = cleanParse(jsonSpec);
        // Ensure that our spec (patched for any additional signals etc.) parses successfully and dispatch to store
        switch (provider) {
            case 'vegaLite': {
                const result = VegaLite.compile(<TopLevelSpec>{
                    ...getPatchedVegaLiteSpec(parsedSpec)
                });
                dispatchSpec({
                    status: 'valid',
                    spec: parsedSpec,
                    rawSpec: jsonSpec
                });
                break;
            }
            case 'vega': {
                const result = Vega.parse(<Spec>{
                    ...getPatchedVegaSpec(parsedSpec)
                });
                dispatchSpec({
                    status: 'valid',
                    spec: parsedSpec,
                    rawSpec: jsonSpec
                });
                break;
            }
        }
    } catch (e) {
        dispatchSpec({
            status: 'error',
            spec: null,
            rawSpec: jsonSpec,
            message: e.message
        });
    }
};

/**
 * Resolve the spec/config and use the `properties` API for persistence. Also resets the `isDirty` flag in the store.
 */
const persist = (stage = true) => {
    stage && stageEditorData('spec');
    stage && stageEditorData('config');
    const {
        editorStagedConfig,
        editorStagedSpec,
        renewEditorFieldsInUse,
        updateEditorDirtyStatus
    } = getState();
    const { provider } = getVegaSettings();
    updateEditorDirtyStatus(false);
    renewEditorFieldsInUse();
    updateObjectProperties(
        resolveObjectProperties([
            getDenebVersionObject(),
            {
                objectName: 'vega',
                properties: [
                    { name: 'jsonSpec', value: editorStagedSpec },
                    { name: 'jsonConfig', value: editorStagedConfig },
                    getProviderVersionProperty(<TSpecProvider>provider)
                ]
            }
        ])
    );
};

/**
 * If we have resolved interactivity props from the template, create appropriate persistence properties
 */
const resolveInteractivityProps = (
    interactivity: ITemplateInteractivityOptions
): IPersistenceProperty[] =>
    (interactivity && [
        { name: 'enableTooltips', value: interactivity.tooltip },
        { name: 'enableContextMenu', value: interactivity.contextMenu },
        { name: 'enableHighlight', value: interactivity.highlight || false },
        { name: 'enableSelection', value: interactivity.selection },
        { name: 'selectionMaxDataPoints', value: interactivity.dataPointLimit }
    ]) ||
    [];

/**
 * Add the specified editor's current text to the staging area in the store. This can then be used for persistence, or
 * application of changes if the creator exits the advanced editor and there are unapplied changes.
 */
const stageEditorData = (role: TEditorRole) => {
    switch (role) {
        case 'spec':
            getState().updateEditorStagedSpec(getCleanEditorJson('spec'));
            return;
        case 'config':
            getState().updateEditorStagedConfig(getCleanEditorJson('config'));
            return;
    }
};

/**
 * Values for a spec's parse status.
 */
export type TSpecStatus = 'valid' | 'error' | 'new';

/**
 * Represents a compiled specification, including any additional metadata needed to manage it downstream in the UI.
 */
interface ICompiledSpec {
    status: TSpecStatus;
    spec: object;
    rawSpec: string;
    message?: string;
}

/**
 * Represents the results of a fix and repair operation.
 */
interface IFixResult {
    spec: IFixStatus;
    config: IFixStatus;
    success: boolean;
    dismissed: boolean;
    error?: string;
}

/**
 * Represents the status and additional metadata of a fix and repair against an individual specification or config component.
 */
interface IFixStatus {
    success: boolean;
    text: string;
    error?: string;
}

const propertyDefaults = getConfig().propertyDefaults.vega;

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
                return propertyDefaults.jsonSpec;
            case 'config':
                return propertyDefaults.jsonConfig;
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
 * Dispatch a compiled specification to the store.
 */
export const dispatchSpec = (compiledSpec: ICompiledSpec) => {
    getState().updateEditorSpec(compiledSpec);
};

/**
 * Further abstracts the `cleanJsonInputForPersistence` workflow so that calling functions are easier to follow.
 */
const getCleanEditorJson = (role: TEditorRole) =>
    cleanJsonInputForPersistence(
        role,
        role === 'spec'
            ? specEditorService.getText()
            : configEditorService.getText()
    );

/**
 * Process the editor "fields in use" metadata to ensure that we either preserve fields that might have been removed
 * from our datase (and clear out their supplied object name for another attempt), or whether to start again.
 */
const getExistingSpecFieldsInUse = (
    metadata: IVisualDatasetFields,
    renew = false
): IVisualDatasetFields =>
    renew
        ? {}
        : reduce(
              metadata,
              (result, value, key) => {
                  delete value.templateMetadata.suppliedObjectName;
                  result[key] = value;
                  return result;
              },
              <IVisualDatasetFields>{}
          );

/**
 * Interrogate the current spec against the dataset metadata and existing list of fields in use from the store for
 * known field patterns and get an `IVisualValueMetadata` representation of any that have been identified since the
 * last execution. We can use this to compare to the current dataset to see if there are gaps.
 */
const getSpecFieldsInUse = (
    metadata: IVisualDatasetFields,
    editorFieldsInUse: IVisualDatasetFields,
    renew = false
): IVisualDatasetFields => {
    const { jsonSpec } = getVegaSettings();
    const spec = getCleanEditorJson('spec') || jsonSpec;
    let newFieldsInUse = getExistingSpecFieldsInUse(editorFieldsInUse, renew);
    forIn(getDatasetFieldsInclusive(metadata), (value, key) => {
        const found = doesSpecContainKeyForMetadata(key, spec, metadata);
        if (found) {
            value.templateMetadata.suppliedObjectName = key;
            newFieldsInUse[key] = value;
        } else {
            delete newFieldsInUse[key];
        }
    });
    return getResequencedMetadata(newFieldsInUse);
};

/**
 * For the given field key, check the spec for its occurrence using all established RegEx patterns.
 */
const doesSpecContainKeyForMetadata = (
    key: string,
    spec: string,
    metadata: IVisualDatasetFields
) =>
    reduce(
        getExportFieldTokenPatterns(key),
        (result, expr) => {
            return (
                (getFieldExpression(expr.match).test(spec) &&
                    key in metadata) ||
                result
            );
        },
        false
    );

/**
 * For a supplied template, substitute placeholder values and return a stringified representation of the object.
 */
const remapSpecificationFields = () => {
    const { updateEditorMapDialogVisible } = getState();
    const dataset = getDatasetTemplateFields(getState().editorFieldsInUse);
    const spec = getSpecWithFieldPlaceholders(
        specEditorService.getText(),
        dataset
    );
    const replaced = getReducedPlaceholdersForMetadata(dataset, spec);
    specEditorService.setText(replaced);
    updateEditorMapDialogVisible(false);
    persist();
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
