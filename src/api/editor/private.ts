import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Completer = Ace.Completer;
import Editor = Ace.Editor;
import JSONEditor from 'jsoneditor/dist/jsoneditor-minimalist';
import _ from 'lodash';
import * as vegaSchema from 'vega/build/vega-schema.json';
import * as vegaLiteSchema from 'vega-lite/build/vega-lite-schema.json';

import { updateDirtyFlag } from '../../store/visualReducer';
import { getConfig } from '../config';
import { ITableColumnMetadata } from '../dataset/public';
import { getHostLM } from '../i18n/public';
import { hasLiveSpecChanged, persist } from '../specification/public';
import { getState, getStore } from '../store/public';
import { TEditorRole } from './public';

export const debounceInput = () =>
    _.debounce(
        handleTextEntry,
        getConfig().propertyDefaults.editor.debounceInterval
    );

export const getAceEditor = (jsonEditor: JSONEditor): Editor =>
    (<any>jsonEditor)?.aceEditor;

export const getCompleters = (): Completer => {
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

export const getInitialText = (role: TEditorRole) => {
    const { settings } = getState().visual,
        { jsonConfig, jsonSpec } = settings.vega;
    return role === 'spec' ? jsonSpec || '' : jsonConfig;
};

export const handleTextEntry = () => {
    const { autoApply } = getState().visual;
    if (autoApply) {
        persist();
    } else {
        getStore().dispatch(updateDirtyFlag(hasLiveSpecChanged()));
    }
};

export const resolveCompleterMeta = (field: ITableColumnMetadata) => {
    const i18n = getHostLM();
    switch (true) {
        case field.isMeasure: {
            return i18n.getDisplayName('Completer_Cap_Measure');
        }
        default: {
            return i18n.getDisplayName('Completer_Cap_Column');
        }
    }
};

export const resolveCompleterScore = (
    field: ITableColumnMetadata,
    index: number
) => {
    switch (true) {
        case field.isMeasure:
        case field.isColumn: {
            return 2000 + index;
        }
    }
};

export const setAceOptions = (
    jsonEditor: JSONEditor,
    options: { [key: string]: any }
) => getAceEditor(jsonEditor)?.setOptions(options);

export const setInitialText = (
    //TODO: needs more thought
    jsonEditor: JSONEditor,
    role: TEditorRole
) => {
    setText(jsonEditor, getInitialText(role));
};

export const setProviderSchema = (
    jsonEditor: JSONEditor,
    role: TEditorRole
) => {
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

export const setText = (jsonEditor: JSONEditor, text: string) => {
    const editor = getAceEditor(jsonEditor);
    editor.setValue(text);
    editor.clearSelection();
};

// TODO: Possible side-effecting code
export const updateCompleters = (jsonEditor: JSONEditor, role: TEditorRole) => {
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
