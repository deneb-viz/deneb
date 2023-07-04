import React from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';

import store from '../../../store';
import { EditorJsonEditor, TEditorRole } from '../../../features/json-editor';
import { logRender } from '../../../features/logging';
import { SettingsPane } from '../../../features/settings';

interface IEditorOperationContainerProps {
    operation: TEditorRole;
}

const EditorOperationContainer: React.FC<IEditorOperationContainerProps> = ({
    operation
}) => {
    const { editorSelectedOperation, visualSettings } = store((state) => state);
    const visible = editorSelectedOperation === operation;
    const editorPane = operation !== 'settings';
    const Editor =
        visualSettings.editor.provider === 'jsoneditor'
            ? EditorJsonEditor
            : null;
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
            {editorPane ? (
                <Editor role={operation} />
            ) : (
                <Scrollbars>
                    <SettingsPane />
                </Scrollbars>
            )}
        </div>
    );
};

export default EditorOperationContainer;
