import React, { useMemo } from 'react';
import { FluentProvider, mergeClasses } from '@fluentui/react-components';
import SplitPane from 'react-split-pane';
import { shallow } from 'zustand/shallow';
import { useHotkeys } from 'react-hotkeys-hook';

import store from '../../../store';
import { EditorPane, useJsonEditorContext } from '../../json-editor';
import { PreviewArea } from '../../preview-area';
import {
    getResizablePaneMaxSize,
    getResizablePaneMinSize,
    resizerPaneVerticalStyles,
    resizerVerticalStyles
} from '../../../core/ui/advancedEditor';
import { ModalDialog } from '../../modal-dialog';
import { Themes, useInterfaceStyles } from '..';
import { logRender } from '../../logging';
import { AdvancedEditorToolbar } from '../../toolbar';
import { ADVANCED_EDITOR_TOOLBAR_HEIGHT } from '../../../constants';
import { PortalRoot } from './portal-root';
import { KEY_BINDINGS } from '../../../../config';
import {
    Command,
    HOTKEY_OPTIONS,
    handleApplyChanges,
    handleAutoApplyChanges,
    handleDebugPaneData,
    handleDebugPaneLog,
    handleDebugPaneSignal,
    handleEditorPaneConfig,
    handleEditorPaneSettings,
    handleEditorPaneSpecification,
    handleExportSpecification,
    handleOpenCreateSpecificationDialog,
    handleOpenRemapDialog,
    handleOpenWebsite,
    handleToggleDebugPane,
    handleToggleEditorPane,
    handleToggleEditorTheme,
    handleZoomFit,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset
} from '../../commands';

//eslint-disable-next-line max-lines-per-function
export const AdvancedEditorInterface: React.FC = () => {
    const {
        backgroundPassThrough,
        editorPaneDefaultWidth,
        editorPaneIsExpanded,
        editorPaneWidth,
        position,
        theme,
        updateEditorPaneWidth
    } = store(
        (state) => ({
            backgroundPassThrough:
                state.visualSettings.editor.preview.backgroundPassThrough.value,
            editorPaneDefaultWidth: state.editorPaneDefaultWidth,
            editorPaneIsExpanded: state.editorPaneIsExpanded,
            editorPaneWidth: state.editorPaneWidth,
            position: state.visualSettings.editor.json.position.value,
            theme: state.visualSettings.editor.interface.theme.value,
            updateEditorPaneWidth: state.updateEditorPaneWidth
        }),
        shallow
    );
    const editorRefs = useJsonEditorContext();
    const hotkeyHandler = (command: Command, callback: () => void) =>
        useHotkeys(getCommandKey(command), callback, HOTKEY_OPTIONS);
    hotkeyHandler('applyChanges', () => handleApplyChanges(editorRefs));
    hotkeyHandler('autoApplyToggle', () => handleAutoApplyChanges(editorRefs));
    hotkeyHandler('newSpecification', handleOpenCreateSpecificationDialog);
    hotkeyHandler('exportSpecification', handleExportSpecification);
    hotkeyHandler('fieldMappings', handleOpenRemapDialog);
    hotkeyHandler('themeToggle', handleToggleEditorTheme);
    hotkeyHandler('helpSite', handleOpenWebsite);
    hotkeyHandler('navigateSpecification', () =>
        handleEditorPaneSpecification(editorRefs)
    );
    hotkeyHandler('navigateConfig', () => handleEditorPaneConfig(editorRefs));
    hotkeyHandler('navigateSettings', handleEditorPaneSettings);
    hotkeyHandler('zoomIn', handleZoomIn);
    hotkeyHandler('zoomOut', handleZoomOut);
    hotkeyHandler('zoomReset', handleZoomReset);
    hotkeyHandler('zoomFit', handleZoomFit);
    hotkeyHandler('editorPaneToggle', handleToggleEditorPane);
    hotkeyHandler('debugPaneToggle', handleToggleDebugPane);
    hotkeyHandler('debugPaneShowData', handleDebugPaneData);
    hotkeyHandler('debugPaneShowSignals', handleDebugPaneSignal);
    hotkeyHandler('debugPaneShowLogs', handleDebugPaneLog);
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
        </FluentProvider>
    );
};

/**
 * Convenience method to get key binding details from configuration for the specified command.
 */
const getCommandKey = (command: Command): string =>
    KEY_BINDINGS?.[command]?.combination || '';
