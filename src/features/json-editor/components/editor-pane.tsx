import * as React from 'react';

import { EditorPaneExpanded } from './editor-pane-expanded';
import { EditorPaneCollapsed } from '@deneb-viz/app-core';

interface IEditorPaneProps {
    isExpanded: boolean;
}

export const EditorPane: React.FC<IEditorPaneProps> = ({ isExpanded }) =>
    isExpanded ? <EditorPaneExpanded /> : <EditorPaneCollapsed />;

export default EditorPane;
