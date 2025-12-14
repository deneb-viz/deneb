import { useMemo } from 'react';
import {
    FluentProvider,
    makeStyles,
    mergeClasses,
    tokens
} from '@fluentui/react-components';
import SplitPane from 'react-split-pane';
import { shallow } from 'zustand/shallow';
import { useHotkeys } from 'react-hotkeys-hook';

import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../state';
import {
    EDITOR_TOOLBAR_HEIGHT,
    type EditorPanePosition,
    getCommandKey,
    getDenebTheme,
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
    POPOVER_Z_INDEX,
    type Command,
    type DenebTheme,
    EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT,
    EDITOR_PANE_SPLIT_COLLAPSED_SIZE,
    EDITOR_PANE_SPLIT_MIN_SIZE
} from '../../lib';
import { useSpecificationEditor } from '../../features/specification-editor';
import { CommandBar } from '../../features/command-bar';
import { ModalDialog } from '../../components/ui';
import { PortalRoot } from './portal-root';
import { EditorArea } from '../../features/editor-area';
import { SplitPaneOutput } from './split-pane-output';
import {
    RESIZER_PANE_VERTICAL_STYLES,
    RESIZER_VERTICAL_STYLES
} from './styles';

const useInterfaceStyles = makeStyles({
    container: {
        boxSizing: 'border-box',
        height: '100%',
        width: '100%',
        cursor: 'auto',
        '& .editor-heading': {
            cursor: 'pointer'
        },
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`
    },
    tooltipMount: {
        zIndex: POPOVER_Z_INDEX
    },
    themeBackground: {
        backgroundColor: tokens.colorNeutralBackground1
    },
    visualBackground: {
        backgroundColor: 'transparent'
    }
});

//eslint-disable-next-line max-lines-per-function
export const EditorContent = () => {
    const {
        backgroundPassThrough,
        editorPaneDefaultWidth,
        editorPaneIsExpanded,
        editorPaneWidth,
        position,
        theme,
        visualViewportWidth,
        updateEditorPaneWidth
    } = useDenebState(
        (state) => ({
            backgroundPassThrough:
                state.visualSettings.editor.preview.backgroundPassThrough.value,
            editorPaneDefaultWidth: state.editorPaneDefaultWidth,
            editorPaneIsExpanded: state.editorPaneIsExpanded,
            editorPaneWidth: state.editorPaneWidth,
            position: state.visualSettings.editor.json.position
                .value as EditorPanePosition,
            theme: state.visualSettings.editor.interface.theme
                .value as DenebTheme,
            visualViewportWidth: state.visualViewportCurrent.width,
            updateEditorPaneWidth: state.updateEditorPaneWidth
        }),
        shallow
    );
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
            handleResize(editorPaneDefaultWidth as number);
        }
    };
    const classes = useInterfaceStyles();
    const resolvedTheme = useMemo(() => getDenebTheme(theme), [theme]);
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
            <CommandBar />
            <SplitPane
                style={{
                    height: `calc(100% - ${EDITOR_TOOLBAR_HEIGHT + 1}px)`
                }}
                split='vertical'
                minSize={getResizablePaneMinSize(
                    editorPaneIsExpanded,
                    position,
                    visualViewportWidth
                )}
                maxSize={getResizablePaneMaxSize(
                    editorPaneIsExpanded,
                    position,
                    visualViewportWidth
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
        </FluentProvider>
    );
};

/**
 * Work out what the maximum size of the resizable pane should be (in px), based on the persisted visual (store) state.
 */
export const getResizablePaneMaxSize = (
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
