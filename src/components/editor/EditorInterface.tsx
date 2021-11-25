import React from 'react';
import SplitPane from 'react-split-pane';

import Debugger from '../../Debugger';
import store from '../../store';
import EditorPane from './pane/EditorPane';
import EditorPreview from './preview//EditorPreview';
import CreateVisualDialog from '../create/CreateVisualDialog';
import ExportVisualDialog from '../export/ExportVisualDialog';
import {
    getResizablePaneMaxSize,
    getResizablePaneMinSize
} from '../../core/ui/advancedEditor';

const EditorInterface: React.FC = () => {
    Debugger.log('Rendering Component: [EditorInterface]...');
    const {
            editorPaneIsExpanded,
            editorPaneDefaultWidth,
            editorPaneWidth,
            visualSettings,
            updateEditorPaneWidth
        } = store((state) => state),
        { editor } = visualSettings,
        handleResize = (width: number) => {
            Debugger.log(`Setting pane width to ${width}px...`);
            updateEditorPaneWidth({
                editorPaneWidth: width,
                editorPaneExpandedWidth: width
            });
        },
        resolveDoubleClick = (event: MouseEvent) => {
            Debugger.log('Resizer double-clicked!');
            event.preventDefault();
            if (editorPaneIsExpanded) {
                Debugger.log(
                    `Resetting pane to default - ${editorPaneDefaultWidth}px...`
                );
                handleResize(editorPaneDefaultWidth);
            }
        },
        editorPane = <EditorPane isExpanded={editorPaneIsExpanded} />;
    return (
        <div id='visualEditor'>
            <SplitPane
                split='vertical'
                minSize={getResizablePaneMinSize()}
                maxSize={getResizablePaneMaxSize()}
                size={editorPaneWidth}
                onChange={handleResize}
                onResizerDoubleClick={resolveDoubleClick}
                allowResize={editorPaneIsExpanded}
            >
                {editor.position === 'left' ? editorPane : <EditorPreview />}
                {editor.position === 'left' ? <EditorPreview /> : editorPane}
            </SplitPane>
            <CreateVisualDialog />
            <ExportVisualDialog />
        </div>
    );
};

export default EditorInterface;
