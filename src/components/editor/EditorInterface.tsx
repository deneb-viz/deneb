import React from 'react';
import SplitPane from 'react-split-pane';

import { useStoreProp } from '../../store';
import EditorPane from './pane/EditorPane';
import { PreviewArea } from '../../features/preview-area';
import {
    getResizablePaneMaxSize,
    getResizablePaneMinSize,
    resizerPaneVerticalStyles,
    resizerVerticalStyles
} from '../../core/ui/advancedEditor';
import { IEditorPaneUpdatePayload } from '../../store/editor';
import { reactLog } from '../../core/utils/reactLog';
import { TEditorPosition } from '../../core/ui';
import { ModalDialog } from '../../features/modal-dialog';

const EditorInterface: React.FC = () => {
    const editorPaneIsExpanded: boolean = useStoreProp('editorPaneIsExpanded');
    const editorPaneDefaultWidth: number = useStoreProp(
        'editorPaneDefaultWidth'
    );
    const editorPaneWidth: number = useStoreProp('editorPaneWidth');
    const position = useStoreProp<TEditorPosition>(
        'position',
        'visualSettings.editor'
    );
    const updateEditorPaneWidth: (payload: IEditorPaneUpdatePayload) => void =
        useStoreProp('updateEditorPaneWidth');
    const handleResize = (width: number) => {
        updateEditorPaneWidth({
            editorPaneWidth: width,
            editorPaneExpandedWidth: width
        });
    };
    const resolveDoubleClick = (event: MouseEvent) => {
        event.preventDefault();
        if (editorPaneIsExpanded) {
            handleResize(editorPaneDefaultWidth);
        }
    };
    const editorPane = <EditorPane isExpanded={editorPaneIsExpanded} />;
    reactLog('Rendering [EditorInterface]');
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
                resizerStyle={resizerVerticalStyles}
                paneStyle={resizerPaneVerticalStyles}
            >
                {position === 'left' ? editorPane : <PreviewArea />}
                {position === 'left' ? <PreviewArea /> : editorPane}
            </SplitPane>
            <ModalDialog type='new' />
            <ModalDialog type='export' />
            <ModalDialog type='mapping' />
        </div>
    );
};

export default EditorInterface;
