import React from 'react';

import store from '../../../store';
import { JsonEditor } from './json-editor';
import { EditorPaneRole, SettingsPane } from '@deneb-viz/app-core';
import { logRender } from '@deneb-viz/utils/logging';
import { InteractivitySettings } from '../../settings';

interface IEditorOperationContainerProps {
    operation: EditorPaneRole;
}

export const EditorOperationContainer: React.FC<
    IEditorOperationContainerProps
> = ({ operation }) => {
    const { editorSelectedOperation } = store((state) => state);
    const visible = editorSelectedOperation === operation;
    const editorPane = operation !== 'Settings';
    logRender('EditorOperationContainer', operation);
    return (
        <div
            className={`editor-pane-container ${
                (!editorPane && 'Settings') || ''
            }`}
            style={{
                display: visible ? 'inherit' : 'none'
            }}
        >
            {editorPane ? (
                <JsonEditor thisEditorRole={operation} />
            ) : (
                <SettingsPane platformSettings={<InteractivitySettings />} />
            )}
        </div>
    );
};
