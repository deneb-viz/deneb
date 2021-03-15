import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import SplitPane from 'react-split-pane';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { updateEditorPaneSize } from '../../store/visualReducer';
import { renderingService } from '../../services';
import DataProcessingRouter from '../DataProcessingRouter';
import EditorPaneContent from './EditorPaneContent';
import NewVisualDialog from '../create/NewVisualDialog';

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
        editorPane = (
            <section>
                <EditorPaneContent
                    editorPaneIsExpanded={editorPaneIsExpanded}
                />
            </section>
        ),
        editorPreview = (
            <div id='editorPreview'>
                <DataProcessingRouter />
            </div>
        );
    return (
        <div id='visualEditor'>
            <SplitPane
                split='vertical'
                minSize={renderingService.getResizablePaneMinSize()}
                maxSize={renderingService.getResizablePaneMaxSize()}
                size={resizablePaneWidth}
                onChange={handleResize}
                onResizerDoubleClick={resolveDoubleClick}
                allowResize={editorPaneIsExpanded}
            >
                {editor.position === 'left' ? editorPane : editorPreview}
                {editor.position === 'left' ? editorPreview : editorPane}
            </SplitPane>
            <NewVisualDialog />
        </div>
    );
};

export default EditorInterface;
