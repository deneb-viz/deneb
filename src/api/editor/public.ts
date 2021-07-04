import * as ace from 'ace-builds';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';
import _ from 'lodash';
import JSONEditor from 'jsoneditor/dist/jsoneditor-minimalist';

import { isDialogOpen } from '../interface/public';
import { getBaseValidator } from '../specification/public';
import {
    debounceInput,
    getAceEditor,
    setAceOptions,
    setInitialText,
    setProviderSchema,
    updateCompleters
} from './private';

// TODO: These are global instances. There is still an opportunity to potentially manage them better.
export const specEditorService: IVisualEditor = new VisualEditor('spec');
export const configEditorService: IVisualEditor = new VisualEditor('config');

export const getAssignedEditor = (role: TEditorRole) => {
    switch (role) {
        case 'spec': {
            return specEditorService;
        }
        case 'config': {
            return configEditorService;
        }
    }
};

export const handleComponentUpdate = (
    jsonEditor: JSONEditor,
    role: TEditorRole
) => {
    setProviderSchema(jsonEditor, role);
    getAceEditor(jsonEditor)?.resize(true);
    if (!isDialogOpen()) {
        jsonEditor.focus();
        updateCompleters(jsonEditor, role);
    }
};

export interface IVisualEditor {
    role: TEditorRole;
    jsonEditor: JSONEditor;
    createEditor: (container: HTMLDivElement) => void;
    getText: () => string;
    setText: (text: string) => void;
}

export interface IVisualEditorProps {
    role: TEditorRole;
}

export type TEditorRole = 'spec' | 'config' | 'settings';

// TODO: By moving these to private.ts, we get a little bit of trouble going on in the package process, so they're left here for now
function VisualEditor(role: TEditorRole) {
    this.role = role;
    this.jsonEditor = <JSONEditor>null;
}
VisualEditor.prototype.createEditor = function (container: HTMLDivElement) {
    this.jsonEditor = getNewJsonEditor(container);
    setAceOptions(this.jsonEditor, {
        useWorker: false,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true
    });
    setInitialText(this.jsonEditor, this.role);
};
VisualEditor.prototype.getText = function () {
    return this.jsonEditor.getText();
};
VisualEditor.prototype.setText = function (text: string) {
    const editor = getAceEditor(this.jsonEditor);
    editor.setValue(text);
    editor.clearSelection();
};

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
