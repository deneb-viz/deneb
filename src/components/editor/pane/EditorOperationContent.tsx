import * as React from 'react';

import EditorOperationContainer from './EditorOperationContainer';

const EditorOperationContent: React.FC = () => (
    <>
        <EditorOperationContainer operation='spec' />
        <EditorOperationContainer operation='config' />
        <EditorOperationContainer operation='settings' />
    </>
);

export default EditorOperationContent;
