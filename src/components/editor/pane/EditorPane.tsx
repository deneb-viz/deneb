import * as React from 'react';

import JsonEditorPaneCollapsed from '../../../features/json-editor/components/json-editor-pane-collapsed';
import EditorPaneExpanded from './EditorPaneExpanded';

interface IEditorPaneProps {
    isExpanded: boolean;
}

export const EditorPane: React.FC<IEditorPaneProps> = (props) => (
    <>
        <section>{getEditorPaneContent(props.isExpanded)}</section>
    </>
);

export default EditorPane;

const getEditorPaneContent = (isExpanded: boolean) =>
    isExpanded ? <EditorPaneExpanded /> : <JsonEditorPaneCollapsed />;
