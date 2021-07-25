export {
    specEditorService,
    configEditorService,
    getAssignedEditor,
    handleComponentUpdate,
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
import * as vegaSchema from 'vega/build/vega-schema.json';
import * as vegaLiteSchema from 'vega-lite/build/vega-lite-schema.json';

import { updateDirtyFlag } from '../../store/visualReducer';
import { getConfig } from '../config';
import { ITableColumnMetadata } from '../dataset';
import {
    getBaseValidator,
    hasLiveSpecChanged,
    persist
} from '../specification';
import { getState, store } from '../store';
import { isDialogOpen } from '../ui';
import { i18nValue } from '../../core/ui/i18n';

// TODO: These are global instances. There is still an opportunity to potentially manage them better.
const specEditorService: IVisualEditor = new VisualEditor('spec');
const configEditorService: IVisualEditor = new VisualEditor('config');

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

const handleComponentUpdate = (jsonEditor: JSONEditor, role: TEditorRole) => {
    setProviderSchema(jsonEditor, role);
    getAceEditor(jsonEditor)?.resize(true);
    setAceOptions(jsonEditor, {
        fontSize: `${getEditorPropFromStore('fontSize')}pt`
    });
    if (!isDialogOpen()) {
        jsonEditor.focus();
        updateCompleters(jsonEditor, role);
    }
};

interface IVisualEditor {
    role: TEditorRole;
    jsonEditor: JSONEditor;
    createEditor: (container: HTMLDivElement) => void;
    getText: () => string;
    setText: (text: string) => void;
}

interface IVisualEditorProps {
    role: TEditorRole;
}

type TEditorRole = 'spec' | 'config' | 'settings';

const debounceInput = () =>
    debounce(
        handleTextEntry,
        getConfig().propertyDefaults.editor.debounceInterval
    );

const getAceEditor = (jsonEditor: JSONEditor): Editor =>
    (<any>jsonEditor)?.aceEditor;

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

const getEditorPropFromStore = (prop: string) =>
    getState()?.visual?.settings?.editor?.[prop];

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

const getInitialText = (role: TEditorRole) => {
    const { settings } = getState().visual,
        { jsonConfig, jsonSpec } = settings.vega;
    return role === 'spec' ? jsonSpec || '' : jsonConfig;
};

const handleTextEntry = () => {
    const { autoApply } = getState().visual;
    if (autoApply) {
        persist();
    } else {
        store.dispatch(updateDirtyFlag(hasLiveSpecChanged()));
    }
};

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

const resolveCompleterScore = (field: ITableColumnMetadata, index: number) => {
    switch (true) {
        case field.isMeasure:
        case field.isColumn: {
            return 2000 + index;
        }
    }
};

const setAceOptions = (
    jsonEditor: JSONEditor,
    options: { [key: string]: any }
) => getAceEditor(jsonEditor)?.setOptions(options);

const setInitialText = (
    //TODO: needs more thought
    jsonEditor: JSONEditor,
    role: TEditorRole
) => {
    setText(jsonEditor, getInitialText(role));
};

const setProviderSchema = (jsonEditor: JSONEditor, role: TEditorRole) => {
    const { settings } = getState().visual,
        { provider } = settings.vega;
    switch (true) {
        case role === 'spec' && provider == 'vegaLite': {
            jsonEditor?.setSchema(vegaLiteSchema);
            break;
        }
        case role === 'spec' && provider == 'vega': {
            jsonEditor?.setSchema(vegaSchema);
            break;
        }
        default: {
            jsonEditor?.setSchema(null);
        }
    }
};

const setText = (jsonEditor: JSONEditor, text: string) => {
    const editor = getAceEditor(jsonEditor);
    editor.setValue(text);
    editor.clearSelection();
};

// TODO: Possible side-effecting code
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
