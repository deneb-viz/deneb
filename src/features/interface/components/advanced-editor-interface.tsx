import React from 'react';
import { FluentProvider } from '@fluentui/react-components';
import SplitPane from 'react-split-pane';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { EditorPane } from '../../json-editor';
import { PreviewArea } from '../../preview-area';
import {
    getResizablePaneMaxSize,
    getResizablePaneMinSize,
    resizerPaneVerticalStyles,
    resizerVerticalStyles
} from '../../../core/ui/advancedEditor';
import { useKonami as fourd3d3d } from 'react-konami-code';
import { ModalDialog, ModalDialogLegacy } from '../../modal-dialog';
import { Themes, useInterfaceStyles } from '..';
import { logRender } from '../../logging';
import { AdvancedEditorToolbar } from '../../toolbar';
import { ADVANCED_EDITOR_TOOLBAR_HEIGHT } from '../../../constants';

export const AdvancedEditorInterface: React.FC = () => {
    const {
        editorPaneDefaultWidth,
        editorPaneIsExpanded,
        editorPaneWidth,
        position,
        setVisual4d3d3d,
        updateEditorPaneWidth
    } = store(
        (state) => ({
            editorPaneDefaultWidth: state.editorPaneDefaultWidth,
            editorPaneIsExpanded: state.editorPaneIsExpanded,
            editorPaneWidth: state.editorPaneWidth,
            position: state.visualSettings.editor.position,
            setVisual4d3d3d: state.setVisual4d3d3d,
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
    fourd3d3d(() => {
        setVisual4d3d3d(true);
    });
    const editorPane = <EditorPane isExpanded={editorPaneIsExpanded} />;
    const styles = useInterfaceStyles();
    logRender('AdvancedEditorInterface');
    return (
        <FluentProvider
            theme={Themes.light}
            className={styles.container}
            id='visualEditor'
        >
            <AdvancedEditorToolbar />
            <SplitPane
                style={{
                    height: `calc(100% - ${
                        ADVANCED_EDITOR_TOOLBAR_HEIGHT + 1
                    }px)`
                }}
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
            <ModalDialogLegacy type='new' />
            <ModalDialogLegacy type='export' />
            <ModalDialogLegacy type='mapping' />
            <ModalDialog />
        </FluentProvider>
    );
};
