import debounce from 'lodash/debounce';
import JSONEditor from 'jsoneditor/dist/jsoneditor-minimalist';
import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Completer = Ace.Completer;
import Editor = Ace.Editor;

import {
    configEditorService,
    specEditorService
} from '../../core/services/JsonEditorServices';
import { getConfig } from '../../core/utils/config';
import { getState } from '../../store';
import { hasLiveSpecChanged, persistSpecification } from '../specification';
import { TEditorRole } from './types';
import { getVegaSettings, TSpecProvider } from '../../core/vega';
import { getEditorInitialText, getEditorSchema } from './utils';
import { baseValidator } from '../../core/vega/validation';
import { isDialogOpen } from '../modal-dialog';
import { getDataset } from '../../core/data/dataset';
import { i18nValue } from '../../core/ui/i18n';
import { IVisualDatasetField } from '../../core/data';

/**
 * Ensures that when auto-apply is enabled, the store is updated at a sensible interval after input has finished, rather than applying
 * changes for every keystroke.
 */
const debounceEditorInput = () =>
    debounce(
        handleTextEntry,
        getConfig().propertyDefaults.editor.debounceInterval
    );

/**
 * Gets the Ace editor instance from the supplied `jsonEditor`.
 */
export const getAceEditor = (jsonEditor: JSONEditor): Editor =>
    (<any>jsonEditor)?.aceEditor;

/**
 * For the supplied role, get the correct instance of `VisualEditor`.
 */
export const getAssignedJsonEditor = (role: TEditorRole) => {
    switch (role) {
        case 'spec': {
            return specEditorService;
        }
        case 'config': {
            return configEditorService;
        }
    }
};

/**
 * For an editor, we need to populate the completers for the end-user. This traverses the metadata for all columns and measures added to the
 * Values data role and returns them as a valid Ace `Completer`.
 */
const getCompleters = (): Completer => {
    const { fields } = getDataset();
    let tokens = [];
    // Tokens for columns and measures
    Object.entries(fields).forEach(([key, value], i) => {
        tokens.push({
            name: `${key}`,
            value: `${key}`,
            caption: `${key}`,
            meta: resolveCompleterMeta(fields[`${key}`]),
            score: resolveCompleterScore(fields[`${key}`], i)
        });
    });
    return {
        getCompletions: (editor, session, pos, prefix, callback) => {
            callback(null, tokens);
        }
    };
};

/**
 * Consolidates any options that should be set/updated on editor create/update
 */
export const getDynamicAceEditorOptions = (): {
    [key: string]: any;
} => ({
    fontSize: `${getEditorPropFromStore('fontSize')}pt`,
    wrap: <boolean>getEditorPropFromStore('wordWrap'),
    showGutter: <boolean>getEditorPropFromStore('showGutter'),
    showLineNumbers: <boolean>getEditorPropFromStore('showLineNumbers')
});

/**
 * Retrieve the specific property from the store.
 */
const getEditorPropFromStore = (prop: string) =>
    getState().visualSettings?.editor?.[prop];

/**
 * Creates a new JSONEditor object in the supplied DOM element and binds configuration and behavior.
 */
export const getNewJsonEditor = (container: HTMLDivElement) =>
    new JSONEditor(container, {
        modes: [],
        ace: ace,
        ajv: baseValidator,
        mode: 'code',
        mainMenuBar: false,
        theme: 'ace/theme/chrome',
        onChange: debounceEditorInput()
    });

/**
 * Logic to manage updates in the main React component.
 */
export const handleComponentUpdate = (
    jsonEditor: JSONEditor,
    role: TEditorRole
) => {
    setProviderSchema(jsonEditor, role);
    getAceEditor(jsonEditor)?.resize(true);
    setAceOptions(jsonEditor, getDynamicAceEditorOptions());
    if (!isDialogOpen()) {
        jsonEditor.focus();
        updateCompleters(jsonEditor, role);
    }
};

/**
 * Logic used to handle changes in the editor (such as auto-apply, if enabled). Will also request `specification` API
 * checks/handles the `isDirty` state.
 */
const handleTextEntry = () => {
    const { editorAutoApply, updateEditorDirtyStatus } = getState();
    if (editorAutoApply) {
        persistSpecification();
    } else {
        updateEditorDirtyStatus(hasLiveSpecChanged());
    }
};

/**
 * For any data-based completers in the editor, provide a qualifier denoting whether it's a column, measure or something else.
 */
const resolveCompleterMeta = (field: IVisualDatasetField) => {
    switch (true) {
        case field.isMeasure: {
            return i18nValue('Completer_Cap_Measure');
        }
        default: {
            return i18nValue('Completer_Cap_Column');
        }
    }
};

/**
 * Applies an order of precedence for an object in the editor's auto-completion.
 */
const resolveCompleterScore = (field: IVisualDatasetField, index: number) => {
    switch (true) {
        case field.isMeasure:
        case field.isColumn: {
            return 2000 + index;
        }
    }
};

/**
 * Applies options to the JSON editor.
 */
export const setAceOptions = (
    jsonEditor: JSONEditor,
    options: { [key: string]: any }
) => getAceEditor(jsonEditor)?.setOptions(options);

/**
 * Sets the initial text for the editor when constructed.
 */
export const setInitialText = (jsonEditor: JSONEditor, role: TEditorRole) => {
    setText(jsonEditor, getEditorInitialText(role));
};

/**
 * Ensures that the correct JSON schema is applied to the JSON editor for validation, based on the specified role.
 */
const setProviderSchema = (jsonEditor: JSONEditor, role: TEditorRole) => {
    const { provider } = getVegaSettings();
    jsonEditor?.setSchema(getEditorSchema(<TSpecProvider>provider, role));
};

/**
 * Sets the embedded Ace editor text within JSONEditor (using the JSONEditor method removes undo from the embedded editor, so we want to ensure
 * we have sensible encapsulation to prevent this as much as possible).
 */
const setText = (jsonEditor: JSONEditor, text: string) => {
    const editor = getAceEditor(jsonEditor);
    editor.setValue(text);
    editor.clearSelection();
};

/**
 * Ensure that editor completers are updated/synced to match anything the user has added to (or removed from) the Values data role.
 */
const updateCompleters = (jsonEditor: JSONEditor, role: TEditorRole) => {
    const editor = getAceEditor(jsonEditor);
    switch (role) {
        case 'spec': {
            if (!editor) {
                return;
            }
            let completers = editor.completers;
            // This is messy, but will remove the custom completer if it's already been added
            if (completers.length > 2) {
                completers.pop();
            }
            editor.completers = completers.concat([getCompleters()]);
            break;
        }
        default: {
        }
    }
};
