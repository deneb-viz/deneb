import * as React from 'react';

import Debugger from '../../Debugger';
import EditorPaneCollapsed from './EditorPaneCollapsed';
import EditorPaneExpanded from './EditorPaneExpanded';

interface IEditorPaneContentProps {
    editorPaneIsExpanded: boolean;
}

const EditorPaneContent: React.FC<IEditorPaneContentProps> = (props) => {
    Debugger.log('Rendering Component: [EditorPaneContent]...');

    switch (props.editorPaneIsExpanded) {
        case true: {
            return <EditorPaneExpanded />;
        }
        case false: {
            return <EditorPaneCollapsed />;
        }
    }
};

export default EditorPaneContent;
