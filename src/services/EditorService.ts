import powerbi from 'powerbi-visuals-api';
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;

import * as ace from 'ace-builds';
import * as Ajv from 'ajv';
import * as draft06 from 'ajv/lib/refs/json-schema-draft-06.json';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';
import Ace = ace.Ace;
import Editor = Ace.Editor;
import Completer = Ace.Completer;
import 'jsoneditor/dist/jsoneditor.css';
import JSONEditor from 'jsoneditor/dist/jsoneditor-minimalist';
import * as vegaSchema from 'vega/build/vega-schema.json';
import * as vegaLiteSchema from 'vega-lite/build/vega-lite-schema.json';

import Debugger, { standardLog } from '../Debugger';
import { commandService, specificationService } from '.';
import { editorDefaults } from '../config';
import {
    IEditorService,
    ITableColumnMetadata,
    TEditorOperation
} from '../types';
import store from '../store';

const owner = 'EditorService';

export class EditorService implements IEditorService {
    private jsonEditor: JSONEditor;
    private ajv: Ajv.Ajv = new Ajv({});
    private role: TEditorOperation;

    constructor(role: TEditorOperation) {
        Debugger.log(`Instantiating new ${owner}...`);
        this.handleTextEntry = this.handleTextEntry.bind(this);
        this.role = role;
        this.ajv.addFormat('color-hex', () => true); // Handles schema issue w/vega & vega-lite
        this.ajv.addMetaSchema(draft06);
    }

    @standardLog()
    createEditor(container: HTMLDivElement) {
        Debugger.log('Creating editor instance...');
        this.jsonEditor = new JSONEditor(container, {
            modes: [],
            ace: ace,
            ajv: this.ajv,
            mode: 'code',
            mainMenuBar: false,
            theme: 'ace/theme/chrome',
            onChange: this.debounceInput(
                this.handleTextEntry,
                editorDefaults.debounceInterval
            )
        });
        this.setAceEditorOptions({
            useWorker: false,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true
        });
        this.setInitialText();
    }

    @standardLog()
    setProviderSchema() {
        Debugger.log('Setting provider schema for JSON editor...');
        const { settings } = store.getState().visual,
            { provider } = settings.vega;
        switch (true) {
            case this.role === 'spec' && provider == 'vegaLite': {
                this.jsonEditor.setSchema(vegaLiteSchema);
                Debugger.log('Provider = Vega-Lite');
                break;
            }
            case this.role === 'spec' && provider == 'vega': {
                this.jsonEditor.setSchema(vegaSchema);
                Debugger.log('Provider = Vega');
                break;
            }
            default: {
                this.jsonEditor.setSchema(null);
                Debugger.log('Provider = [none]');
            }
        }
    }

    @standardLog()
    resize() {
        Debugger.log('Handling resize of JSON editor...');
        this.getAceEditorInstance().resize(true);
    }

    @standardLog()
    focus() {
        Debugger.log('Setting focus to JSON editor...');
        this.jsonEditor.focus();
    }

    @standardLog()
    updateCompleters() {
        switch (this.role) {
            case 'spec': {
                Debugger.log(`Updating editor completers...`);
                let instance = this.getAceEditorInstance();
                if (!instance) {
                    Debugger.log(
                        'Currently no editor to update. Skipping over...'
                    );
                    return;
                }
                let completers = this.getAceEditorInstance().completers;
                // This is messy, but will remove the custom completer if it's already been added
                Debugger.log('Fixing existing completers...');
                if (completers.length > 2) {
                    completers.pop();
                }
                this.getAceEditorInstance().completers = completers.concat([
                    this.getCompleters()
                ]);
                break;
            }
            default: {
                Debugger.log('No need to update completers. Skipping over...');
            }
        }
    }

    @standardLog()
    getText() {
        Debugger.log('Getting JSON editor text...');
        return this.jsonEditor.getText();
    }

    @standardLog()
    setText(text: string) {
        Debugger.log('Getting JSON editor text...');
        const editor = this.getAceEditorInstance();
        editor.setValue(text);
        editor.clearSelection();
    }

    /**
     * Called upon instantiation, to ensure that the initial editor text is correctly set from
     * the Redux store/visual settings.
     */
    @standardLog()
    private setInitialText() {
        const { settings } = store.getState().visual,
            { jsonConfig, jsonSpec } = settings.vega;
        this.setText(this.role === 'spec' ? jsonSpec || '' : jsonConfig);
    }

    /**
     * As text is entered into the editor, we need to persist it back to the store if we have Auto-Apply enabled.
     */
    @standardLog()
    private handleTextEntry() {
        Debugger.log('Handling text entry...');
        const { autoApply } = store.getState().visual;
        if (autoApply) {
            specificationService.persist();
        }
        // resolve dirty flag
    }

    /**
     * Helps with making the editor less chatty on change.
     * Courtesy of https://gist.github.com/ca0v/73a31f57b397606c9813472f7493a940#gistcomment-3062135
     */
    private debounceInput = <F extends (...args: any[]) => any>(
        func: F,
        waitFor: number
    ) => {
        let timeout: number;
        return (...args: Parameters<F>): Promise<ReturnType<F>> =>
            new Promise((resolve) => {
                if (timeout) {
                    clearTimeout(timeout);
                }

                timeout = setTimeout(() => resolve(func(...args)), waitFor);
            });
    };

    // @standardLog()
    // resolveDirtyStatus(text?: string) {
    //     Debugger.log('Resolving editor dirty status...');
    //     this.isDirty = this.getText() !== (text || this.getText());
    // }

    /**
     * Applies options to the embedded Ace editor.
     *
     * @param optList - all options to apply.
     */
    @standardLog()
    private setAceEditorOptions(optList: { [key: string]: any }) {
        Debugger.log('Setting JSON editor options for Ace...');
        this.getAceEditorInstance().setOptions(optList);
    }

    /**
     * Convenience method for ensureing we get the embedded Ace editor instance, rather than JSONEditor.
     */
    @standardLog()
    private getAceEditorInstance(): Editor {
        Debugger.log('Getting Ace editor instance from JSON editor...');
        return (<any>this.jsonEditor)?.aceEditor;
    }

    /**
     * For an editor, we need to populate the completers for the end-user. This traverses the metadata for
     * all columns and measures added to the Values data role and returns them as a valid Ace `Completer`.
     */
    @standardLog()
    private getCompleters(): Completer {
        Debugger.log('Getting completers for editor...');
        const { dataset, i18n } = store.getState().visual,
            { metadata } = dataset;
        let tokens = [];
        // Tokens for columns and measures
        Debugger.log('Adding completers for dataset...');
        Object.entries(metadata).forEach(([key, value], i) => {
            Debugger.log(`[${key}]`);
            tokens.push({
                name: `${key}`,
                value: `${key}`,
                caption: `${key}`,
                meta: this.resolveCompleterMeta(metadata[`${key}`], i18n),
                score: this.resolveCompleterScore(metadata[`${key}`], i)
            });
        });
        Debugger.log('All completers added!');
        return {
            getCompletions: (editor, session, pos, prefix, callback) => {
                callback(null, tokens);
            }
        };
    }

    /**
     * For any data-based completers in the editor, provide a qualifier denoting whether it's a column,
     * measure or something else.
     *
     * @param column    - column to evaluate
     */
    private resolveCompleterMeta(
        column: ITableColumnMetadata,
        localisationManager: ILocalizationManager
    ) {
        Debugger.log('EditorService.resolveCompleterMeta()');
        Debugger.log(
            `Resolving completer metadata for [${column.displayName}]...`
        );
        switch (true) {
            case column.isRaw && column.isMeasure: {
                Debugger.log('Type: raw value (measure)');
                return `${localisationManager.getDisplayName(
                    'Completer_Cap_Measure'
                )} ${localisationManager.getDisplayName('Completer_Cap_Raw')}`;
            }
            case column.isRaw: {
                Debugger.log('Type: raw value (column)');
                return `${localisationManager.getDisplayName(
                    'Completer_Cap_Column'
                )} ${localisationManager.getDisplayName('Completer_Cap_Raw')}`;
            }
            case column.isMeasure: {
                Debugger.log('Type: measure');
                return localisationManager.getDisplayName(
                    'Completer_Cap_Measure'
                );
            }
            default: {
                Debugger.log('Type: column');
                return localisationManager.getDisplayName(
                    'Completer_Cap_Column'
                );
            }
        }
    }

    /**
     * Applies an order of precedence for an object in the editor's auto-completion.
     *
     * @param column    - column to evaluate
     * @param index     - sequential order from calling iterator
     */
    private resolveCompleterScore(column: ITableColumnMetadata, index: number) {
        Debugger.log('EditorService.resolveCompleterScore()');
        Debugger.log(
            `Resolving completer score for [${column.displayName}]...`
        );
        switch (true) {
            case column.isRaw: {
                return 1000 + index;
            }
            case column.isMeasure:
            case column.isColumn: {
                return 2000 + index;
            }
        }
    }
}
