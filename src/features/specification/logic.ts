import * as VegaLite from 'vega-lite';
import { TopLevelSpec } from 'vega-lite';
import jsonrepair from 'jsonrepair';

import { getConfig } from '../../core/utils/config';
import {
    configEditorService,
    specEditorService
} from '../../core/services/JsonEditorServices';
import { getState } from '../../store';
import { getVegaSettings, getViewConfig, TSpecProvider } from '../../core/vega';
import {
    getDenebVersionObject,
    getProviderVersionProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../../core/utils/properties';
import { IEditorSpecUpdatePayload } from '../../store/editor';
import { cleanParse, getJsonAsIndentedString } from '../../core/utils/json';
import { validateVega, validateVegaLite } from '../../core/vega/validation';
import { i18nValue } from '../../core/ui/i18n';
import { IFixResult, IFixStatus } from './types';
import { getLastVersionInfo } from '../../core/utils/versioning';
import { TEditorRole } from '../json-editor';
import { LocalVegaLoggerService, logError } from '../logging';

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
 * Dispatch a compiled specification to the store.
 */
const dispatchSpec = (payload: IEditorSpecUpdatePayload) => {
    getState().updateEditorSpec(payload);
};

/**
 * Borrowed from vega-editor
 */
const errorLine = (code: string, error: string) => {
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

export const parseActiveSpecification = () => {
    const {
        provider,
        jsonSpec: rawSpec,
        jsonConfig,
        logLevel
    } = getVegaSettings();
    const logger = new LocalVegaLoggerService();
    logger.level(logLevel);
    let payload: IEditorSpecUpdatePayload;
    // Spec hasn't been edited yet
    if (!rawSpec) {
        dispatchSpec({
            spec: {
                status: 'new',
                spec: PROPERTY_DEFAULTS.jsonSpec,
                rawSpec: PROPERTY_DEFAULTS.jsonConfig
            },
            error: null,
            warns: []
        });
        return;
    }
    try {
        const spec = cleanParse(rawSpec);
        switch (provider) {
            case 'vega': {
                validateVega(spec, logger);
                break;
            }
            case 'vegaLite': {
                const config = <VegaLite.Config>(
                    getViewConfig(cleanParse(jsonConfig))
                );
                const options = { config, logger };
                validateVegaLite(spec, logger);
                VegaLite.compile(<TopLevelSpec>spec, options);
                break;
            }
        }
        payload = {
            spec: { status: 'valid', spec, rawSpec },
            warns: logger.warns,
            error: null
        };
    } catch (e) {
        const error = errorLine(rawSpec, e.message);
        payload = {
            spec: { status: 'error', spec: null, rawSpec },
            warns: logger.warns,
            error
        };
    }
    dispatchSpec(payload);
};

/**
 * Resolve the spec/config and use the `properties` API for persistence. Also resets the `isDirty` flag in the store.
 */
export const persistSpecification = (stage = true) => {
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

/**
 * Add the specified editor's current text to the staging area in the store. This can then be used for persistence, or
 * application of changes if the creator exits the advanced editor and there are unapplied changes.
 */
export const stageEditorData = (role: TEditorRole) => {
    switch (role) {
        case 'spec':
            getState().updateEditorStagedSpec(getCleanEditorJson('spec'));
            return;
        case 'config':
            getState().updateEditorStagedConfig(getCleanEditorJson('config'));
            return;
    }
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
