import { useDenebState } from '../../../state';
import { EditorPaneCollapsed } from './editor-pane-collapsed';
import { EditorPaneExpanded } from './editor-pane-expanded';

export const EditorArea = () => {
    const isExpanded = useDenebState((state) => state.editorPaneIsExpanded);
    return isExpanded ? <EditorPaneExpanded /> : <EditorPaneCollapsed />;
};
