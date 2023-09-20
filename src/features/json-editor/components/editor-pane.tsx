import * as React from 'react';

import { EditorPaneCollapsed } from './editor-pane-collapsed';
import { EditorPaneExpanded } from './editor-pane-expanded';

interface IEditorPaneProps {
    isExpanded: boolean;
}

export const EditorPane: React.FC<IEditorPaneProps> = ({ isExpanded }) =>
    isExpanded ? <EditorPaneExpanded /> : <EditorPaneCollapsed />;

export default EditorPane;
