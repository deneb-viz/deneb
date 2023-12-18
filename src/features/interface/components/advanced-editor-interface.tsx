import React, { useMemo } from 'react';
import { FluentProvider, mergeClasses } from '@fluentui/react-components';
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
import { ModalDialog } from '../../modal-dialog';
import { Themes, useInterfaceStyles } from '..';
import { logRender } from '../../logging';
import { AdvancedEditorToolbar } from '../../toolbar';
import { ADVANCED_EDITOR_TOOLBAR_HEIGHT } from '../../../constants';
import { JsonEditorContextProvider } from '../../json-editor';
import { PortalRoot } from './portal-root';

export const AdvancedEditorInterface: React.FC = () => {
    const {
        backgroundPassThrough,
        editorPaneDefaultWidth,
        editorPaneIsExpanded,
        editorPaneWidth,
        position,
        theme,
        setVisual4d3d3d,
        updateEditorPaneWidth
    } = store(
        (state) => ({
            backgroundPassThrough:
                state.visualSettings.editor.backgroundPassThrough,
            editorPaneDefaultWidth: state.editorPaneDefaultWidth,
            editorPaneIsExpanded: state.editorPaneIsExpanded,
            editorPaneWidth: state.editorPaneWidth,
            position: state.visualSettings.editor.position,
            theme: state.visualSettings.editor.theme,
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
    const classes = useInterfaceStyles();
    const resolvedTheme = useMemo(() => Themes[theme], [theme]);
    const className = useMemo(
        () =>
            mergeClasses(
                classes.container,
                backgroundPassThrough
                    ? classes.visualBackground
                    : classes.themeBackground
            ),
        [theme, backgroundPassThrough]
    );
    logRender('AdvancedEditorInterface');
    return (
        <FluentProvider
            theme={resolvedTheme}
            className={className}
            id='visualEditor'
        >
            <JsonEditorContextProvider>
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
                <ModalDialog />
                <PortalRoot />
            </JsonEditorContextProvider>
        </FluentProvider>
    );
};
