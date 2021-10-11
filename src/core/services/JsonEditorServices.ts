export {
    specEditorService,
    configEditorService,
    getAssignedEditor,
    handleComponentUpdate,
    JsonEditorServices,
    IVisualEditorProps,
    IVisualEditor,
    TEditorRole
};

import * as ace from 'ace-builds';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';
import Ace = ace.Ace;
import Completer = Ace.Completer;
import Editor = Ace.Editor;
import JSONEditor from 'jsoneditor/dist/jsoneditor-minimalist';
import debounce from 'lodash/debounce';

import { updateDirtyFlag } from '../../store/visual';
import { getConfig } from '../utils/config';
import { ITableColumnMetadata } from '../data/dataset';
import { hasLiveSpecChanged, persist } from '../utils/specification';
import { getState, store } from '../../store';
import { isDialogOpen } from '../ui/modal';
import { i18nValue } from '../ui/i18n';
import { getBaseValidator } from '../utils/json';
import { getEditorSchema, TSpecProvider } from '../vega';

class JsonEditorServices implements IVisualEditor {
    role: TEditorRole;
    jsonEditor: JSONEditor = null;

    constructor(role: TEditorRole) {
        this.role = role;
    }

    createEditor = (container: HTMLDivElement) => {
        this.jsonEditor = getNewJsonEditor(container);
        setAceOptions(this.jsonEditor, {
            ...{
                useWorker: false,
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true
            },
            ...getDynamicAceEditorOptions()
        });
        setInitialText(this.jsonEditor, this.role);
    };

    getText = () => this.jsonEditor?.getText() || '';

    setText = (text: string) => {
        const editor = getAceEditor(this.jsonEditor);
        editor.setValue(text);
        editor.clearSelection();
    };
}

/**
 * Instance of `JsonEditorServices` that is used to track and manage specification in the visual.
 */
const specEditorService = new JsonEditorServices('spec');

/**
 * Instance of `VisualEditor` that is used to track and manage config in the visual.
 */
const configEditorService = new JsonEditorServices('config');

/**
 * For the supplied role, get the correct instance of `VisualEditor`.
 */
const getAssignedEditor = (role: TEditorRole) => {
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
 * Consolidates any options that should be set/updated on editor create/update
 */
const getDynamicAceEditorOptions = (): {
    [key: string]: any;
} => ({
    fontSize: `${getEditorPropFromStore('fontSize')}pt`
});

/**
 * Logic to manage updates in the main React component.
 */
const handleComponentUpdate = (jsonEditor: JSONEditor, role: TEditorRole) => {
    setProviderSchema(jsonEditor, role);
    getAceEditor(jsonEditor)?.resize(true);
    setAceOptions(jsonEditor, getDynamicAceEditorOptions());
    if (!isDialogOpen()) {
        jsonEditor.focus();
        updateCompleters(jsonEditor, role);
    }
};

/**
 * Specifies the structure of each `VisualEditor` instance.
 *
 *  - `role`: assigned `TEditorRole`.
 *  - `jsonEditor`: attached instance of `JSONEditor`, used for maintaining either specification or config object.
 *  - `createEditor`: creates a new `JSONEditor` in the visual DOM and assignes it back to the `jsonEditor` property for subsequent operations
 *      within the UI.
 *  - `getText`: retrieve the current JSON content from the editor instance.
 *  - `setText`: set the current JSON content in the editor instance.
 */
interface IVisualEditor {
    role: TEditorRole;
    jsonEditor: JSONEditor;
    createEditor: (container: HTMLDivElement) => void;
    getText: () => string;
    setText: (text: string) => void;
}

/**
 * Properties for the `Editor` React component.
 *
 *  - `role`: assigned `TEditorRole`.
 */
interface IVisualEditorProps {
    role: TEditorRole;
}

/**
 * Used to specify the types of operatons we should have within the pivot control in the editor pane.
 */
type TEditorRole = 'spec' | 'config' | 'settings';

/**
 * Ensures that when auto-apply is enabled, the Redux store is updated at a sensible interval after input has finished, rather than applying
 * changes for every keystroke.
 */
const debounceInput = () =>
    debounce(
        handleTextEntry,
        getConfig().propertyDefaults.editor.debounceInterval
    );

/**
 * Gets the Ace editor instance from the supplied `jsonEditor`.
 */
const getAceEditor = (jsonEditor: JSONEditor): Editor =>
    (<any>jsonEditor)?.aceEditor;

/**
 * For an editor, we need to populate the completers for the end-user. This traverses the metadata for all columns and measures added to the
 * Values data role and returns them as a valid Ace `Completer`.
 */
const getCompleters = (): Completer => {
    const { dataset } = getState().visual,
        { metadata } = dataset;
    let tokens = [];
    // Tokens for columns and measures
    Object.entries(metadata).forEach(([key, value], i) => {
        tokens.push({
            name: `${key}`,
            value: `${key}`,
            caption: `${key}`,
            meta: resolveCompleterMeta(metadata[`${key}`]),
            score: resolveCompleterScore(metadata[`${key}`], i)
        });
    });
    return {
        getCompletions: (editor, session, pos, prefix, callback) => {
            callback(null, tokens);
        }
    };
};

/**
 * Retrieve the specific property from the Redux store.
 */
const getEditorPropFromStore = (prop: string) =>
    getState()?.visual?.settings?.editor?.[prop];

/**
 * Creates a new JSONEditor object in the supplied DOM element and binds configuration and behavior.
 */
const getNewJsonEditor = (container: HTMLDivElement) =>
    new JSONEditor(container, {
        modes: [],
        ace: ace,
        ajv: getBaseValidator(),
        mode: 'code',
        mainMenuBar: false,
        theme: 'ace/theme/chrome',
        onChange: debounceInput()
    });

/**
 * For the given role, retrieve its value from the visual properties (via Redux store).
 */
const getInitialText = (role: TEditorRole) => {
    const { settings } = getState().visual,
        { jsonConfig, jsonSpec } = settings.vega;
    return role === 'spec' ? jsonSpec || '' : jsonConfig;
};

/**
 * Logic used to handle changes in the editor (such as auto-apply, if enabled). Will also request `specification` API
 * checks/handles the `isDirty` state.
 */
const handleTextEntry = () => {
    const { autoApply } = getState().visual;
    if (autoApply) {
        persist();
    } else {
        store.dispatch(updateDirtyFlag(hasLiveSpecChanged()));
    }
};

/**
 * For any data-based completers in the editor, provide a qualifier denoting whether it's a column, measure or something else.
 */
const resolveCompleterMeta = (field: ITableColumnMetadata) => {
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
const resolveCompleterScore = (field: ITableColumnMetadata, index: number) => {
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
const setAceOptions = (
    jsonEditor: JSONEditor,
    options: { [key: string]: any }
) => getAceEditor(jsonEditor)?.setOptions(options);

const setInitialText = (jsonEditor: JSONEditor, role: TEditorRole) => {
    setText(jsonEditor, getInitialText(role));
};

/**
 * Ensures that the correct JSON schema is applied to the JSON editor for validation, based on the specificed role.
 */
const setProviderSchema = (jsonEditor: JSONEditor, role: TEditorRole) => {
    const { settings } = getState().visual,
        { provider } = settings.vega;
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
