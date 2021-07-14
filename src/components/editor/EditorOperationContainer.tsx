import * as React from 'react';
import { useSelector } from 'react-redux';

import { state } from '../../store';
import Editor from './Editor';
import EditorPaneSettings from '../settings/EditorPaneSettings';
import { TEditorRole } from '../../api/editor';

interface IEditorOperationContainerProps {
    operation: TEditorRole;
}

const EditorOperationContainer: React.FC<IEditorOperationContainerProps> = ({
    operation
}) => {
    const { selectedOperation } = useSelector(state).visual,
        visible = selectedOperation === operation,
        editorPane = operation !== 'settings';
    return (
        <>
            <div
                className='editor-pane-container'
                style={{
                    display: visible ? 'inherit' : 'none'
                }}
            >
                {editorPane ? (
                    <Editor role={operation} />
                ) : (
                    <EditorPaneSettings />
                )}
            </div>
        </>
    );
};

export default EditorOperationContainer;
