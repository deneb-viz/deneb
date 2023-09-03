import React from 'react';

import { EditorOperationContainer } from './editor-operation-container';
import { logRender } from '../../logging';

const EditorOperationContent: React.FC = () => {
    logRender('EditorOperationContent');
    return (
        <>
            <EditorOperationContainer operation='spec' />
            <EditorOperationContainer operation='config' />
            <EditorOperationContainer operation='settings' />
        </>
    );
};

export default EditorOperationContent;
