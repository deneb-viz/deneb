export {
    createFromTemplate,
    fixAndFormat,
    hasLiveSpecChanged,
    parseActiveSpec,
    persist,
    stageEditorData,
    ICompiledSpec,
    IFixResult,
    IFixStatus
};

import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;

import * as Vega from 'vega';
import Spec = Vega.Spec;
import * as VegaLite from 'vega-lite';
import { TopLevelSpec } from 'vega-lite';
import jsonrepair from 'jsonrepair';

import { getConfig } from './config';
import {
    configEditorService,
    specEditorService,
    TEditorRole
} from '../services/JsonEditorServices';
import { resolveObjectProperties, updateObjectProperties } from './properties';
import { getSidString } from '../interactivity/selection';
import { getState, store } from '../../store';
import { getReplacedTemplate } from '../template';
import {
    updateDirtyFlag,
    updateFixStatus,
    updateSpec,
    updateStagedSpecData,
    updateStagedConfigData
} from '../../store/visual';
import { hostServices } from '../services';
import { i18nValue } from '../ui/i18n';
import { cleanParse, getJsonAsIndentedString } from './json';
import { getPatchedVegaSpec } from '../vega/vegaUtils';
import { getPatchedVegaLiteSpec } from '../vega/vegaLiteUtils';
import { TSpecProvider } from '../vega';

/**
 * For the supplied provider and specification template, add this to the visual and persist to properties, ready for
 * subsequent editing.
 */
const createFromTemplate = (
    provider: TSpecProvider,
    template: Spec | TopLevelSpec
) => {
    const jsonSpec = getReplacedTemplate(template),
        jsonConfig = getJsonAsIndentedString(template.config);
    updateObjectProperties(
        resolveObjectProperties('vega', [
            { name: 'provider', value: provider },
            { name: 'jsonSpec', value: jsonSpec },
            { name: 'jsonConfig', value: jsonConfig },
            { name: 'isNewDialogOpen', value: false }
        ])
    );
    // TODO: Side-effecting code?
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
        // TODO: Side-effecting code?
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
 * the `isDirty` flag in the Redux store.
 */
const hasLiveSpecChanged = () => {
    const liveSpec = getCleanEditorJson('spec'),
        persistedSpec = getState().visual.settings.vega.jsonSpec,
        liveConfig = getCleanEditorJson('config'),
        persistedConfig = getState().visual.settings.vega.jsonConfig;
    return liveSpec != persistedSpec || liveConfig != persistedConfig;
};

const parseActiveSpec = () => {
    const { allowInteractions, settings } = getState().visual,
        { provider, jsonSpec, enableContextMenu, enableSelection } =
            settings.vega;
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

        /** TODO: Previous attempt at patching interactivity. Kept for posterity but should be managed a different way.
         * Will likely re-attempt in v0.5/0.6 */
        switch (provider) {
            case 'vegaLite': {
                /**TODO: This should be done somewhere else, probably
                    Debugger.log(
                        'Patching data point and context menu selections...'
                    );
                    parsedSpec.params = [...(parsedSpec.params || [])];
                    if (
                        visualFeatures.selectionContextMenu &&
                        enableContextMenu
                    ) {
                        parsedSpec.params.push({
                            name: '__context__',
                            select: {
                                type: 'point',
                                fields:
                                    (allowInteractions && ['__identity__']) ||
                                    [],
                                on: 'contextmenu'
                            }
                        });
                    }
                    if (visualFeatures.selectionDataPoint && enableSelection) {
                        parsedSpec.params.push({
                            name: '__select__',
                            select: {
                                type: 'point',
                                fields: (allowInteractions && ['__key__']) || []
                            },
                            value: this.getExistingSelectors()
                        });
                    }
                    */
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
                /**
                    Debugger.log(
                        'Patching data point and context menu selections...'
                    );
                    if (!parsedSpec.signals) {
                        parsedSpec.signals = [];
                    }
                    parsedSpec.signals.push({
                        name: '__context__',
                        on: [{ events: 'contextmenu', update: 'datum' }]
                    });*/
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
 * Resolve the spec/config and use the `properties` API for persistence. Also resets the `isDirty` flag in the Redux store.
 */
const persist = (stage = true) => {
    stage && stageEditorData('spec');
    stage && stageEditorData('config');
    store.dispatch(updateDirtyFlag(false));
    updateObjectProperties(
        resolveObjectProperties('vega', [
            { name: 'jsonSpec', value: getState().visual.stagedSpec },
            { name: 'jsonConfig', value: getState().visual.stagedConfig }
        ])
    );
};

/**
 * Add the specified editor's current text to the staging area in the Redux store. This can then be used for persistence, or
 * application of changes if the creator exits the advanced editor and there are unapplied changes.
 */
const stageEditorData = (role: TEditorRole) => {
    switch (role) {
        case 'spec':
            store.dispatch(updateStagedSpecData(getCleanEditorJson('spec')));
            return;
        case 'config':
            store.dispatch(
                updateStagedConfigData(getCleanEditorJson('config'))
            );
            return;
    }
};

/**
 * Represents a compiled specification, including any additional metadata needed to manage it downstream in the UI.
 */
interface ICompiledSpec {
    status: 'valid' | 'error' | 'new';
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
 * Dispatch the results of a fix and repair operation to the Redux store.
 */
const dispatchFixStatus = (result: IFixResult) => {
    store.dispatch(updateFixStatus(result));
};

/**
 * Dispatch a compiled specification to the Redux store.
 */
const dispatchSpec = (compiledSpec: ICompiledSpec) => {
    store.dispatch(updateSpec(compiledSpec));
};

/**
 * Get any existing selections (e.g. through bookmarks) to ensure that they are restored into the visual's current selection
 * correctly and able to be passed into the specification's `init` property for our selection.
 * TODO: this needs review when we revisit interactivity in a later build.
 */
const getExistingSelectors = () => {
    const { dataset } = getState().visual,
        { selectionManager } = hostServices;
    return (
        (selectionManager.hasSelection() &&
            selectionManager
                .getSelectionIds()
                .map(
                    (id: ISelectionId) =>
                        dataset.values.find(
                            (v) =>
                                getSidString(v.__identity__) ===
                                getSidString(id)
                        )?.__key__
                )
                .filter((k) => k !== undefined)
                .map((k) => ({
                    __key__: k
                }))) ||
        undefined
    );
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
