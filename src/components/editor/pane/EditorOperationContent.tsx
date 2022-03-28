import React from 'react';
import { reactLog } from '../../../core/utils/logger';

import EditorOperationContainer from './EditorOperationContainer';

const EditorOperationContent: React.FC = () => {
    reactLog('Rendering [EditorOperationContent]');
    return (
        <>
            <EditorOperationContainer operation='spec' />
            <EditorOperationContainer operation='config' />
            <EditorOperationContainer operation='settings' />
        </>
    );
};

export default EditorOperationContent;
