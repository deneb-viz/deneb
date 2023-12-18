export {
    specEditorService,
    configEditorService,
    JsonEditorServices,
    IVisualEditor
};

import JSONEditor from 'jsoneditor/dist/jsoneditor-minimalist';

import { TEditorRole } from '../../features/json-editor/types';
import {
    getAceEditor,
    getDynamicAceEditorOptions,
    getNewJsonEditor,
    setAceOptions,
    setInitialText
} from '../../features/json-editor/utils-jsoneditor';

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
const specEditorService = new JsonEditorServices('Spec');

/**
 * Instance of `VisualEditor` that is used to track and manage config in the visual.
 */
const configEditorService = new JsonEditorServices('Config');
