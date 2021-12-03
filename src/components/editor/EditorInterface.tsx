import React from 'react';
import SplitPane from 'react-split-pane';

import store from '../../store';
import EditorPane from './pane/EditorPane';
import EditorPreview from './preview//EditorPreview';
import CreateVisualDialog from '../create/CreateVisualDialog';
import ExportVisualDialog from '../export/ExportVisualDialog';
import MapFieldsDialog from '../map/MapFieldsDialog';
import {
    getResizablePaneMaxSize,
    getResizablePaneMinSize
} from '../../core/ui/advancedEditor';

const EditorInterface: React.FC = () => {
    const {
            editorPaneIsExpanded,
            editorPaneDefaultWidth,
            editorPaneWidth,
            visualSettings,
            updateEditorPaneWidth
        } = store((state) => state),
        { editor } = visualSettings,
        handleResize = (width: number) => {
            updateEditorPaneWidth({
                editorPaneWidth: width,
                editorPaneExpandedWidth: width
            });
        },
        resolveDoubleClick = (event: MouseEvent) => {
            event.preventDefault();
            if (editorPaneIsExpanded) {
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
            <MapFieldsDialog />
        </div>
    );
};

export default EditorInterface;
