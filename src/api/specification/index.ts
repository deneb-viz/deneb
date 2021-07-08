export {
    createFromTemplate,
    determineProviderFromSpec,
    fixAndFormat,
    getBaseValidator,
    getInitialConfig,
    getParsedConfigFromSettings,
    hasLiveSpecChanged,
    indentJson,
    parseActiveSpec,
    persist,
    registerCustomExpressions,
    resolveLoaderLogic,
    stageEditorData,
    ICompiledSpec,
    IFixPayload,
    IFixResult,
    IFixStatus,
    TSpecProvider,
    TSpecRenderMode
};

import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;

import * as Vega from 'vega';
import Config = Vega.Config;
import Spec = Vega.Spec;
import expressionFunction = Vega.expressionFunction;
import * as vegaSchema from 'vega/build/vega-schema.json';
import * as VegaLite from 'vega-lite';
import { TopLevelSpec } from 'vega-lite';
import * as vegaLiteSchema from 'vega-lite/build/vega-lite-schema.json';
import Ajv from 'ajv';
import * as draft06 from 'ajv/lib/refs/json-schema-draft-06.json';
import jsonrepair from 'jsonrepair';

import { getConfig } from '../config';
import { configEditorService, specEditorService, TEditorRole } from '../editor';
import { isFeatureEnabled } from '../features';
import { createFormatterFromString } from '../formatting';
import { getHostLM } from '../i18n';
import { resolveObjectProperties, updateObjectProperties } from '../properties';
import { getSidString } from '../selection';
import { getState, store } from '../store';
import { getReplacedTemplate } from '../template';
import {
    updateDirtyFlag,
    updateFixStatus,
    updateSpec,
    updateStagedSpecData,
    updateStagedConfigData
} from '../../store/visualReducer';

const createFromTemplate = (
    provider: TSpecProvider,
    template: Spec | TopLevelSpec
) => {
    const jsonSpec = getReplacedTemplate(template),
        jsonConfig = indentJson(template.config);
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

const getBaseValidator = () =>
    new Ajv({}).addFormat('color-hex', () => true).addMetaSchema(draft06);

const getInitialConfig = () => {
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

const getParsedConfigFromSettings = (): Config => {
    const { vega } = getState().visual.settings;
    try {
        return JSON.parse(resolveUrls(vega.jsonConfig));
    } catch (e) {
        return JSON.parse(propertyDefaults.jsonConfig);
    }
};

const hasLiveSpecChanged = () => {
    const liveSpec = getCleanEditorJson('spec'),
        persistedSpec = getState().visual.settings.vega.jsonSpec,
        liveConfig = getCleanEditorJson('config'),
        persistedConfig = getState().visual.settings.vega.jsonConfig;
    return liveSpec != persistedSpec || liveConfig != persistedConfig;
};

const indentJson = (json: object) =>
    JSON.stringify(json, null, getConfig().propertyDefaults.editor.tabSize);

const registerCustomExpressions = () =>
    expressionFunction('pbiFormat', (datum: any, params: string) =>
        createFormatterFromString(`${params}`).format(datum)
    );

const parseActiveSpec = () => {
    const { allowInteractions, settings } = getState().visual,
        {
            provider,
            jsonSpec,
            enableContextMenu,
            enableSelection
        } = settings.vega;
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
        const parsedSpec = JSON.parse(resolveUrls(jsonSpec));

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
                VegaLite.compile(<TopLevelSpec>parsedSpec);
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
                Vega.parse(<Spec>parsedSpec);
                break;
            }
        }
        dispatchSpec({
            status: 'valid',
            spec: parsedSpec,
            rawSpec: jsonSpec
        });
    } catch (e) {
        dispatchSpec({
            status: 'error',
            spec: null,
            rawSpec: jsonSpec,
            message: e.message
        });
    }
};

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

const resolveLoaderLogic = () => Vega.loader();

interface ICompiledSpec {
    status: 'valid' | 'error' | 'new';
    spec: object;
    rawSpec: string;
    message?: string;
}

interface IFixPayload {
    status: IFixStatus;
    rawSpec: string;
    rawConfig: string;
}

interface IFixResult {
    spec: IFixStatus;
    config: IFixStatus;
    success: boolean;
    dismissed: boolean;
    error?: string;
}

interface IFixStatus {
    success: boolean;
    text: string;
    error?: string;
}

type TSpecProvider = 'vega' | 'vegaLite';

type TSpecRenderMode = 'svg' | 'canvas';

const propertyDefaults = getConfig().propertyDefaults.vega;

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

const dispatchFixStatus = (result: IFixResult) => {
    store.dispatch(updateFixStatus(result));
};

const dispatchSpec = (compiledSpec: ICompiledSpec) => {
    store.dispatch(updateSpec(compiledSpec));
};

const getExistingSelectors = () => {
    const { dataset, selectionManager } = getState().visual;
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

const getCleanEditorJson = (role: TEditorRole) =>
    cleanJsonInputForPersistence(
        role,
        role === 'spec'
            ? specEditorService.getText()
            : configEditorService.getText()
    );

const getSchemaValidator = (schema: Object) =>
    getBaseValidator().compile(schema);

const resolveFixErrorMessage = (
    success: boolean,
    fixedRawSpec: IFixStatus,
    fixedRawConfig: IFixStatus
): string => {
    const i18n = getHostLM();
    return (
        (!success &&
            `${i18n.getDisplayName('Fix_Failed_Prefix')} ${
                fixedRawSpec.error || ''
            }${
                (!fixedRawSpec.success && !fixedRawConfig.success && ' & ') ||
                ''
            }${fixedRawConfig.error || ''}. ${i18n.getDisplayName(
                'Fix_Failed_Suffix'
            )}`) ||
        undefined
    );
};

const resolveUrls = (content: string) =>
    (!isFeatureEnabled('enableExternalUri') &&
        content.replace(
            /\b(?!data:)((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/g,
            ''
        )) ||
    content;

const tryFixAndFormat = (operation: TEditorRole, input: string): IFixStatus => {
    const lm = getHostLM();
    try {
        return {
            success: true,
            text: indentJson(JSON.parse(jsonrepair(input)))
        };
    } catch (e) {
        return {
            success: false,
            text: input,
            error: `${lm.getDisplayName(
                operation === 'spec' ? 'Editor_Role_Spec' : 'Editor_Role_Config'
            )} ${lm.getDisplayName('Fix_Failed_Item')}`
        };
    }
};
