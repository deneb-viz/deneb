import React from 'react';
import { FluentProvider } from '@fluentui/react-components';
import SplitPane from 'react-split-pane';
import { shallow } from 'zustand/shallow';

import store from '../../store';
import EditorPane from './pane/EditorPane';
import { PreviewArea } from '../../features/preview-area';
import {
    getResizablePaneMaxSize,
    getResizablePaneMinSize,
    resizerPaneVerticalStyles,
    resizerVerticalStyles
} from '../../core/ui/advancedEditor';
import { ModalDialog } from '../../features/modal-dialog';
import { Themes, useInterfaceStyles } from '../../features/interface';
import { logRender } from '../../features/logging';

const EditorInterface: React.FC = () => {
    const {
        editorPaneDefaultWidth,
        editorPaneIsExpanded,
        editorPaneWidth,
        position,
        updateEditorPaneWidth
    } = store(
        (state) => ({
            editorPaneDefaultWidth: state.editorPaneDefaultWidth,
            editorPaneIsExpanded: state.editorPaneIsExpanded,
            editorPaneWidth: state.editorPaneWidth,
            position: state.visualSettings.editor.position,
            updateEditorPaneWidth: state.updateEditorPaneWidth
        }),
        shallow
    );
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
    const styles = useInterfaceStyles();
    logRender('EditorInterface');
    return (
        <FluentProvider
            theme={Themes.light}
            className={styles.container}
            id='visualEditor'
        >
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
        </FluentProvider>
    );
};

export default EditorInterface;
