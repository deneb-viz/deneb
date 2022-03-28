import React from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';

import { useStoreProp } from '../../../store';
import Editor from './Editor';
import EditorPaneSettings from '../../settings/EditorPaneSettings';
import { TEditorRole } from '../../../core/services/JsonEditorServices';
import { reactLog } from '../../../core/utils/logger';

interface IEditorOperationContainerProps {
    operation: TEditorRole;
}

const EditorOperationContainer: React.FC<IEditorOperationContainerProps> = ({
    operation
}) => {
    const editorSelectedOperation = useStoreProp<TEditorRole>(
        'editorSelectedOperation'
    );
    const visible = editorSelectedOperation === operation;
    const editorPane = operation !== 'settings';
    reactLog('Rendering [EditorOperationContainer]', operation);
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
                    <EditorPaneSettings />
                </Scrollbars>
            )}
        </div>
    );
};

export default EditorOperationContainer;
