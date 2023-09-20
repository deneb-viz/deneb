import React from 'react';

import store from '../../../store';
import { TEditorRole } from '..';
import { JsonEditor } from './json-editor';
import { logRender } from '../../logging';
import { SettingsPane } from '../../settings';

interface IEditorOperationContainerProps {
    operation: TEditorRole;
}

export const EditorOperationContainer: React.FC<IEditorOperationContainerProps> =
    ({ operation }) => {
        const { editorSelectedOperation, visualSettings } = store(
            (state) => state
        );
        const visible = editorSelectedOperation === operation;
        const editorPane = operation !== 'settings';
        const Editor =
            visualSettings.editor.provider === 'jsoneditor' ? JsonEditor : null;
        logRender('EditorOperationContainer', operation);
        return (
            <div
                className={`editor-pane-container ${
                    (!editorPane && 'settings') || ''
                }`}
                style={{
                    display: visible ? 'inherit' : 'none'
                }}
            >
                {editorPane ? <Editor role={operation} /> : <SettingsPane />}
            </div>
        );
    };
