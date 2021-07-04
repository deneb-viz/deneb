import * as React from 'react';
import { useSelector } from 'react-redux';

import Debugger from '../../Debugger';
import { state } from '../../store';
import Editor from './Editor';
import EditorPaneSettings from '../settings/EditorPaneSettings';

const EditorOperationContainer: React.FC = () => {
    Debugger.log('Rendering Component: [EditorContainer]...');
    const {
            selectedOperation,
            isNewDialogVisible,
            isExportDialogVisible
        } = useSelector(state).visual,
        isDialogOpen = isNewDialogVisible || isExportDialogVisible;
    return (
        <>
            <div
                className='editor-container'
                style={{
                    display: selectedOperation === 'spec' ? 'inherit' : 'none'
                }}
            >
                <Editor role='spec' />
            </div>
            <div
                className='editor-container'
                style={{
                    display: selectedOperation === 'config' ? 'inherit' : 'none'
                }}
            >
                <Editor role='config' />
            </div>
            <div
                className='settings-container'
                style={{
                    display:
                        selectedOperation === 'settings' ? 'inherit' : 'none'
                }}
            >
                <EditorPaneSettings />
            </div>
        </>
    );
};

export default EditorOperationContainer;
