import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';

import jsonrepair from 'jsonrepair';
import * as Vega from 'vega';
import Config = Vega.Config;
import Spec = Vega.Spec;
import expressionFunction = Vega.expressionFunction;
import * as VegaLite from 'vega-lite';
import { TopLevelSpec } from 'vega-lite';

import Debugger, { standardLog } from '../Debugger';
import {
    configEditorService,
    propertyService,
    selectionHandlerService,
    specEditorService,
    templateService
} from '.';
import { TooltipHandlerService } from '../services/TooltipHandlerService';
import store from '../store';
import { updateSpec, updateFixStatus } from '../store/visualReducer';
import {
    editorDefaults,
    vegaSettingsDefaults,
    visualFeatures
} from '../config';
import {
    IFixResult,
    IFixStatus,
    ISpecificationHandlerService,
    IVegaLiteTemplate,
    IVegaTemplate,
    TEditorOperation,
    TSpecProvider
} from '../types';

const owner = 'SpecificationService';

export class SpecificationService implements ISpecificationHandlerService {
    constructor() {
        Debugger.log(`Instantiating new ${owner}...`);
    }

    @standardLog()
    resolveLoaderLogic() {
        Debugger.log('Implementing loader logic...');
        return Vega.loader();
    }

    @standardLog({ profile: true, owner })
    parse() {
        Debugger.log('Attempting to parse JSON spec...');
        const { allowInteractions, settings } = store.getState().visual,
            {
                provider,
                jsonSpec,
                enableContextMenu,
                enableSelection
            } = settings.vega;
        try {
            if (!jsonSpec) {
                Debugger.log("Spec hasn't been edited yet.");
                store.dispatch(
                    updateSpec({
                        status: 'new',
                        spec: vegaSettingsDefaults.jsonSpec,
                        rawSpec: vegaSettingsDefaults.jsonConfig
                    })
                );
                return;
            }

            const parsedSpec = JSON.parse(this.resolveUrls(jsonSpec));
            Debugger.log('Spec', JSON.stringify(parsedSpec));

            switch (provider) {
                case 'vegaLite': {
                    // TODO: This should be done somewhere else, probably
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
                    Debugger.log('Attempting Vega-Lite...');
                    VegaLite.compile(<TopLevelSpec>parsedSpec);
                    Debugger.log('Vega-Lite spec parsed successfully :)');
                    break;
                }
                case 'vega': {
                    Debugger.log('Attempting Vega...');
                    Debugger.log(
                        'Patching data point and context menu selections...'
                    );
                    if (!parsedSpec.signals) {
                        parsedSpec.signals = [];
                    }
                    parsedSpec.signals.push({
                        name: '__context__',
                        on: [{ events: 'contextmenu', update: 'datum' }]
                    });
                    Vega.parse(<Spec>parsedSpec);
                    Debugger.log('Vega spec parsed successfully :)');
                    break;
                }
            }
            store.dispatch(
                updateSpec({
                    status: 'valid',
                    spec: parsedSpec,
                    rawSpec: jsonSpec
                })
            );
        } catch (e) {
            Debugger.log(`[ERROR] Spec contains errors!`, e.message);
            store.dispatch(
                updateSpec({
                    status: 'error',
                    spec: null,
                    rawSpec: jsonSpec,
                    message: e.message
                })
            );
        }
    }

    @standardLog({ profile: true, owner })
    persist() {
        Debugger.log('Updating component state and persisting properties...');
        const jsonSpec = this.cleanJsonInputForPersistence(
                'spec',
                specEditorService.getText()
            ),
            jsonConfig = this.cleanJsonInputForPersistence(
                'config',
                configEditorService.getText()
            );
        propertyService.updateObjectProperties(
            propertyService.resolveObjectProperties('vega', [
                { name: 'jsonSpec', value: jsonSpec },
                { name: 'jsonConfig', value: jsonConfig }
            ])
        );
        // EditorService.resolveDirtyStatus();
    }

    @standardLog()
    indentJson(json: object) {
        Debugger.log('Formatting JSON...');
        return JSON.stringify(json, null, editorDefaults.tabSize);
    }

    @standardLog()
    createFromTemplate(
        provider: TSpecProvider,
        template: IVegaLiteTemplate | IVegaTemplate
    ) {
        Debugger.log('Creating new spec from template...');

        const jsonSpec = templateService.getReplacedTemplate(template),
            jsonConfig = this.indentJson(template.config);
        propertyService.updateObjectProperties(
            propertyService.resolveObjectProperties('vega', [
                { name: 'provider', value: provider },
                { name: 'jsonSpec', value: jsonSpec },
                { name: 'jsonConfig', value: jsonConfig },
                { name: 'isNewDialogOpen', value: false }
            ])
        );
        specEditorService.setText(jsonSpec);
        configEditorService.setText(jsonConfig);
    }

    @standardLog()
    getTooltipHandler() {
        const { settings, tooltipService } = store.getState().visual,
            { vega } = settings;
        return (
            vega.enableTooltips &&
            new TooltipHandlerService(tooltipService).call
        );
    }

    @standardLog()
    fixAndFormat() {
        try {
            const { i18n } = store.getState().visual,
                fixedRawSpec = this.tryFixAndFormat(
                    'spec',
                    specEditorService.getText()
                ),
                fixedRawConfig = this.tryFixAndFormat(
                    'config',
                    configEditorService.getText()
                ),
                success = fixedRawSpec.success && fixedRawConfig.success;
            let result: IFixResult = {
                success: success,
                spec: fixedRawSpec,
                config: fixedRawConfig,
                dismissed: false,
                error:
                    (!success &&
                        `${i18n.getDisplayName('Fix_Failed_Prefix')} ${
                            fixedRawSpec.error || ''
                        }${
                            (!fixedRawSpec.success &&
                                !fixedRawConfig.success &&
                                ' & ') ||
                            ''
                        }${fixedRawConfig.error || ''}. ${i18n.getDisplayName(
                            'Fix_Failed_Suffix'
                        )}`) ||
                    undefined
            };
            if (fixedRawSpec.success) {
                specEditorService.setText(fixedRawSpec.text);
            }
            if (fixedRawConfig.success) {
                configEditorService.setText(fixedRawConfig.text);
            }
            store.dispatch(updateFixStatus(result));
            this.persist();
        } catch (e) {
            Debugger.log('Error', e);
        }
    }

    @standardLog()
    getInitialConfig() {
        Debugger.log('Getting initial config...');
        const { themeColors } = store.getState().visual;
        return {
            ...{
                background: null, // so we can defer to the Power BI background, if applied
                customFormatTypes: true,
                range: {
                    category: themeColors
                }
            },
            ...this.getParsedConfigFromSettings()
        };
    }

    @standardLog()
    registerCustomExpressions() {
        const { locale } = store.getState().visual;
        Debugger.log('Registering custom formatters...');
        expressionFunction('pbiFormat', (datum: any, params: string) => {
            Debugger.log(
                `Formatting value: ${datum} with format "${params}"...`
            );
            const fmt = valueFormatter.create({
                    format: `${params}`,
                    cultureSelector: locale
                }),
                value = fmt.format(datum);
            Debugger.log(`Formatted value: ${value}`);
            return value;
        });
    }

    /**
     * For the given string, attempt to resolve it as JSON by doing any necessary repairs for standard things
     * that could be mis-typed. Then beautify it. If this fails for any reason, we'll return the unmolested
     * input, along with any error details we could resolve from the process for the end-user.
     *
     * @param operation - whether we're working with the `spec` or the `config` editor input.
     * @param input - the entered input from our editor.
     */
    @standardLog()
    private tryFixAndFormat(
        operation: TEditorOperation,
        input: string
    ): IFixStatus {
        const { i18n } = store.getState().visual;
        try {
            Debugger.log('Attempting repair...', input);
            return {
                success: true,
                text: this.indentJson(JSON.parse(jsonrepair(input)))
            };
        } catch (e) {
            Debugger.log('Failed to repair JSON', e);
            return {
                success: false,
                text: input,
                error: `${i18n.getDisplayName(
                    operation === 'spec'
                        ? 'Editor_Role_Spec'
                        : 'Editor_Role_Config'
                )} ${i18n.getDisplayName('Fix_Failed_Item')}`
            };
        }
    }

    /**
     * For a given operation and string input, ensure that it's trimmed and replaced with
     * suitable defaults if empty.
     *
     * @param operation - whether we're working with the `spec` or the `config` editor input.
     * @param input - the entered input from our editor.
     */
    @standardLog()
    private cleanJsonInputForPersistence(
        operation: TEditorOperation,
        input: string
    ): string {
        input = input.trim();
        if (input === '') {
            Debugger.log('Cleaned input is empty. Applying defaults...');
            switch (operation) {
                case 'spec':
                    return vegaSettingsDefaults.jsonSpec;
                case 'config':
                    return vegaSettingsDefaults.jsonConfig;
            }
        }
        return input;
    }

    /**
     * Get any existing selections (e.g. through bookmarks) to ensure that they are restored into
     * the visual's current selection correctly and able to be passed into the specification's `init`
     * property for our selection.
     */
    @standardLog()
    private getExistingSelectors() {
        const { dataset, selectionManager } = store.getState().visual;
        Debugger.log('Getting selectors from manager...');
        Debugger.log('IDs to restore', selectionManager.getSelectionIds());
        return (
            (selectionManager.hasSelection() &&
                selectionManager
                    .getSelectionIds()
                    .map(
                        (id: ISelectionId) =>
                            dataset.values.find(
                                (v) =>
                                    selectionHandlerService.getSidString(
                                        v.__identity__
                                    ) ===
                                    selectionHandlerService.getSidString(id)
                            )?.__key__
                    )
                    .filter((k) => k !== undefined)
                    .map((k) => ({
                        __key__: k
                    }))) ||
            undefined
        );
    }

    /**
     * Gets the `config` from our visual objects and parses it to JSON.
     */
    @standardLog()
    private getParsedConfigFromSettings(): Config {
        const { vega } = store.getState().visual.settings;
        try {
            return JSON.parse(this.resolveUrls(vega.jsonConfig));
        } catch (e) {
            Debugger.log('Could not parse config. Returning empty object.');
            return JSON.parse(vegaSettingsDefaults.jsonConfig);
        }
    }

    /**
     * For a given body of text, replace anything that looks like a remote URI with blank text. If the
     * URI has a `data:` prefix then we'll allow it, so that the user can specify base64 content.
     *
     * @param content - text to search/process.
     */
    private resolveUrls(content: string) {
        if (!visualFeatures.enableExternalUri) {
            Debugger.log(
                'External URIs disabled in features Stripping URIs from content...'
            );
            content = content.replace(
                /\b(?!data:)((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/g,
                ''
            );
        }
        return content;
    }
}
