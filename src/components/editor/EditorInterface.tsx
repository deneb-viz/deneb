import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import SplitPane from 'react-split-pane';
import { useHotkeys } from 'react-hotkeys-hook';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { updateEditorPaneSize, hotkeysRegistered } from '../../store/visual';
import EditorPane from './EditorPane';
import EditorPreview from './EditorPreview';
import NewVisualDialog from '../create/NewVisualDialog';
import ExportVisualDialog from '../export/ExportVisualDialog';
import { getVisualHotkeys } from '../../core/ui/commands';
import {
    getResizablePaneMaxSize,
    getResizablePaneMinSize
} from '../../core/ui/advancedEditor';

const EditorInterface: React.FC = () => {
    Debugger.log('Rendering Component: [EditorInterface]...');
    const {
            resizablePaneDefaultWidth,
            resizablePaneWidth,
            editorPaneIsExpanded,
            settings,
            hotkeysBound
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
        editorPane = <EditorPane isExpanded={editorPaneIsExpanded} />;
    if (!hotkeysBound) {
        Debugger.log('*** HOTKEY STUFF ***');
        getVisualHotkeys().forEach((hk) => {
            useHotkeys(hk.keys, hk.command, hk.options);
        });
    }
    useEffect(() => {
        return () => {
            Debugger.log('*** HOTKEY CLEANUP ***');
            dispatch(hotkeysRegistered());
        };
    }, []);
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
                {editor.position === 'left' ? editorPane : <EditorPreview />}
                {editor.position === 'left' ? <EditorPreview /> : editorPane}
            </SplitPane>
            <NewVisualDialog />
            <ExportVisualDialog />
        </div>
    );
};

export default EditorInterface;
