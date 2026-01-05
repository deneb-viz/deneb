import SplitPane from 'react-split-pane';
import { shallow } from 'zustand/shallow';
import { useHotkeys } from 'react-hotkeys-hook';

import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../state';
import {
    EDITOR_TOOLBAR_HEIGHT,
    type EditorPanePosition,
    getCommandKey,
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
    handleOpenWebsite,
    handleToggleDebugPane,
    handleToggleEditorPane,
    handleToggleEditorTheme,
    handleZoomFit,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    HOTKEY_OPTIONS,
    type Command,
    EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT,
    EDITOR_PANE_SPLIT_COLLAPSED_SIZE,
    EDITOR_PANE_SPLIT_MIN_SIZE
} from '../../lib';
import {
    SpecificationEditorProvider,
    useSpecificationEditor
} from '../../features/specification-editor';
import { CommandBar } from '../../features/command-bar';
import { ModalDialog } from '../../components/ui';
import { PortalRoot } from './portal-root';
import { EditorArea } from '../../features/editor-area';
import { SplitPaneOutput } from './split-pane-output';
import {
    RESIZER_PANE_VERTICAL_STYLES,
    RESIZER_VERTICAL_STYLES
} from './styles';
import { useDenebPlatformProvider } from '../../components/deneb-platform';

//eslint-disable-next-line max-lines-per-function
export const EditorContent = () => {
    const {
        editorPaneDefaultWidth,
        editorPaneIsExpanded,
        editorPaneWidth,
        position,
        viewportWidth,
        updateEditorPaneWidth
    } = useDenebState(
        (state) => ({
            editorPaneDefaultWidth: state.editorPaneDefaultWidth,
            editorPaneIsExpanded: state.editorPaneIsExpanded,
            editorPaneWidth: state.editorPaneWidth,
            position: state.editorPreferences.jsonEditorPosition,
            viewportWidth: state.interface.viewport?.width ?? 0,
            updateEditorPaneWidth: state.updateEditorPaneWidth
        }),
        shallow
    );
    const { launchUrl } = useDenebPlatformProvider();
    const editorRefs = useSpecificationEditor();
    const hotkeyHandler = (command: Command, callback: () => void) =>
        useHotkeys(getCommandKey(command), callback, HOTKEY_OPTIONS);
    hotkeyHandler('applyChanges', () => handleApplyChanges(editorRefs));
    hotkeyHandler('autoApplyToggle', () => handleAutoApplyChanges(editorRefs));
    hotkeyHandler('newSpecification', handleOpenCreateSpecificationDialog);
    hotkeyHandler('exportSpecification', handleExportSpecification);
    // Tracking is now only used for export (#486)
    // hotkeyHandler('fieldMappings', handleOpenRemapDialog);
    hotkeyHandler('themeToggle', handleToggleEditorTheme);
    hotkeyHandler('helpSite', () => handleOpenWebsite(launchUrl));
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
            handleResize(editorPaneDefaultWidth as number);
        }
    };
    logRender('AdvancedEditorInterface');
    return (
        <SpecificationEditorProvider>
            <CommandBar />
            <SplitPane
                style={{
                    height: `calc(100% - ${EDITOR_TOOLBAR_HEIGHT + 1}px)`
                }}
                split='vertical'
                minSize={getResizablePaneMinSize(
                    editorPaneIsExpanded,
                    position,
                    viewportWidth
                )}
                maxSize={getResizablePaneMaxSize(
                    editorPaneIsExpanded,
                    position,
                    viewportWidth
                )}
                size={editorPaneWidth as number}
                onChange={handleResize}
                onResizerDoubleClick={resolveDoubleClick}
                allowResize={editorPaneIsExpanded}
                resizerStyle={RESIZER_VERTICAL_STYLES}
                paneStyle={RESIZER_PANE_VERTICAL_STYLES}
            >
                {position === 'left' ? <EditorArea /> : <SplitPaneOutput />}
                {position === 'left' ? <SplitPaneOutput /> : <EditorArea />}
            </SplitPane>
            <ModalDialog />
            <PortalRoot />
        </SpecificationEditorProvider>
    );
};

/**
 * Work out what the maximum size of the resizable pane should be (in px), based on the persisted visual (store) state.
 */
const getResizablePaneMaxSize = (
    editorPaneIsExpanded: boolean,
    position: EditorPanePosition,
    visualViewportWidth: number
) => {
    return (
        (editorPaneIsExpanded &&
            (position === 'right'
                ? visualViewportWidth - EDITOR_PANE_SPLIT_MIN_SIZE
                : visualViewportWidth * EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT)) ||
        EDITOR_PANE_SPLIT_COLLAPSED_SIZE
    );
};

/**
 * Work out what the minimum size of the resizable pane should be (in px), based on the persisted visual (store) state
 */
const getResizablePaneMinSize = (
    editorPaneIsExpanded: boolean,
    position: EditorPanePosition,
    visualViewportWidth: number
) => {
    const resolvedCollapsedSize =
        position === 'right'
            ? visualViewportWidth - EDITOR_PANE_SPLIT_COLLAPSED_SIZE
            : EDITOR_PANE_SPLIT_COLLAPSED_SIZE;
    const resolvedMinSize =
        position === 'right'
            ? visualViewportWidth * (1 - EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT)
            : EDITOR_PANE_SPLIT_MIN_SIZE;
    const resolvedSize =
        (editorPaneIsExpanded && resolvedMinSize) || resolvedCollapsedSize;
    return resolvedSize;
};
