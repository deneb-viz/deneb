import React from 'react';

import EditorOperationContent from './editor-operation-content';

import { calculateEditorPaneMaxWidth } from '../../../core/ui/advancedEditor';
import { logRender } from '../../logging';
import { useEditorPaneStyles } from '.';

export const EditorPaneExpanded = () => {
    logRender('EditorPaneExpanded');
    const classes = useEditorPaneStyles();
    return (
        <div
            id='editorPane'
            className={classes.paneContainerExpanded}
            style={{ maxWidth: calculateEditorPaneMaxWidth(), height: '100%' }}
        >
            <EditorOperationContent />
        </div>
    );
};
