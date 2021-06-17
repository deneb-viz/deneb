import * as Vega from 'vega';
import Config = Vega.Config;
import Spec = Vega.Spec;
import expressionFunction = Vega.expressionFunction;
import * as vegaSchema from 'vega/build/vega-schema.json';
import * as VegaLite from 'vega-lite';
import { TopLevelSpec } from 'vega-lite';
import * as vegaLiteSchema from 'vega-lite/build/vega-lite-schema.json';

import { vegaSettingsDefaults } from '../../config';
import { configEditorService, specEditorService } from '../../services'; // TODO: dependencies on class instances

import { getConfig } from '../config/public';
import { createFormatterFromString } from '../formatting/public';
import {
    resolveObjectProperties,
    updateObjectProperties
} from '../properties/public';
import { getState } from '../store/public';
import { getReplacedTemplate } from '../template/public';
import {
    cleanJsonInputForPersistence,
    dispatchFixStatus,
    dispatchSpec,
    getSchemaValidator,
    tryFixAndFormat,
    resolveFixErrorMessage,
    resolveUrls
} from './private';

export const createFromTemplate = (
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

export const determineProviderFromSpec = (
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

export const fixAndFormat = () => {
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

export const getInitialConfig = () => {
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

export const getParsedConfigFromSettings = (): Config => {
    const { vega } = getState().visual.settings;
    try {
        return JSON.parse(resolveUrls(vega.jsonConfig));
    } catch (e) {
        return JSON.parse(vegaSettingsDefaults.jsonConfig);
    }
};

export const indentJson = (json: object) =>
    JSON.stringify(json, null, getConfig().editorDefaults.tabSize);

export const registerCustomExpressions = () =>
    expressionFunction('pbiFormat', (datum: any, params: string) =>
        createFormatterFromString(`${params}`).format(datum)
    );

export const parseActiveSpec = () => {
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
                spec: vegaSettingsDefaults.jsonSpec,
                rawSpec: vegaSettingsDefaults.jsonConfig
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

export const persist = () => {
    const jsonSpec = cleanJsonInputForPersistence(
            'spec',
            specEditorService.getText()
        ),
        jsonConfig = cleanJsonInputForPersistence(
            'config',
            configEditorService.getText()
        );
    updateObjectProperties(
        resolveObjectProperties('vega', [
            { name: 'jsonSpec', value: jsonSpec },
            { name: 'jsonConfig', value: jsonConfig }
        ])
    );
    // EditorService.resolveDirtyStatus();
};

export const resolveLoaderLogic = () => Vega.loader();

export interface ICompiledSpec {
    status: 'valid' | 'error' | 'new';
    spec: object;
    rawSpec: string;
    message?: string;
}

export interface IFixPayload {
    status: IFixStatus;
    rawSpec: string;
    rawConfig: string;
}

export interface IFixResult {
    spec: IFixStatus;
    config: IFixStatus;
    success: boolean;
    dismissed: boolean;
    error?: string;
}

export interface IFixStatus {
    success: boolean;
    text: string;
    error?: string;
}

export type TSpecProvider = 'vega' | 'vegaLite';

export type TSpecRenderMode = 'svg' | 'canvas';
