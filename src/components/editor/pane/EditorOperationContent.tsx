import React from 'react';

import EditorOperationContainer from './EditorOperationContainer';
import { logRender } from '../../../features/logging';

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
