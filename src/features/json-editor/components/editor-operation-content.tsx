import React from 'react';

import { EditorOperationContainer } from './editor-operation-container';
import { logRender } from '../../logging';

const EditorOperationContent: React.FC = () => {
    logRender('EditorOperationContent');
    return (
        <>
            <EditorOperationContainer operation='Spec' />
            <EditorOperationContainer operation='Config' />
            <EditorOperationContainer operation='Settings' />
        </>
    );
};

export default EditorOperationContent;
