import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import SplitPane from 'react-split-pane';
import { useHotkeys } from 'react-hotkeys-hook';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { updateEditorPaneSize } from '../../store/visualReducer';
import DataProcessingRouter from '../DataProcessingRouter';
import EditorPane from './EditorPane';
import NewVisualDialog from '../create/NewVisualDialog';
import ExportVisualDialog from '../export/ExportVisualDialog';
import { getVisualHotkeys } from '../../api/commands';
import { getResizablePaneMaxSize, getResizablePaneMinSize } from '../../api/ui';

const EditorInterface: React.FC = () => {
    Debugger.log('Rendering Component: [EditorInterface]...');
    const {
            resizablePaneDefaultWidth,
            resizablePaneWidth,
            editorPaneIsExpanded,
            settings
        } = useSelector(state).visual,
        { editor } = settings,
        dispatch = useDispatch(),
        handleResize = (width: number) => {
            Debugger.log(`Setting pane width to ${width}px...`);
            dispatch(
                updateEditorPaneSize({
                    editorPaneWidth: width,
                    editorPaneExpandedWidth: width
                })
            );
        },
        resolveDoubleClick = (event: MouseEvent) => {
            Debugger.log('Resizer double-clicked!');
            event.preventDefault();
            if (editorPaneIsExpanded) {
                Debugger.log(
                    `Resetting pane to default - ${resizablePaneDefaultWidth}px...`
                );
                handleResize(resizablePaneDefaultWidth);
            }
        },
        editorPane = <EditorPane isExpanded={editorPaneIsExpanded} />,
        editorPreview = (
            <div id='editorPreview'>
                <DataProcessingRouter />
            </div>
        );
    getVisualHotkeys().forEach((hk) => {
        useHotkeys(hk.keys, hk.command, hk.options);
    });
    return (
        <div id='visualEditor'>
            <SplitPane
                split='vertical'
                minSize={getResizablePaneMinSize()}
                maxSize={getResizablePaneMaxSize()}
                size={resizablePaneWidth}
                onChange={handleResize}
                onResizerDoubleClick={resolveDoubleClick}
                allowResize={editorPaneIsExpanded}
            >
                {editor.position === 'left' ? editorPane : editorPreview}
                {editor.position === 'left' ? editorPreview : editorPane}
            </SplitPane>
            <NewVisualDialog />
            <ExportVisualDialog />
        </div>
    );
};

export default EditorInterface;
