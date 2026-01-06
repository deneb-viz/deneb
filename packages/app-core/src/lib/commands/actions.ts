import {
    APPLICATION_INFORMATION_CONFIGURATION,
    PROJECT_DEFAULTS,
    VISUAL_PREVIEW_ZOOM_CONFIGURATION
} from '@deneb-viz/configuration';
import { getDenebState } from '../../state';
import { type DebugPaneRole, type EditorPaneRole } from '../interface';
import { type Command } from './types';
import { type SpecificationEditorRefs } from '../../features/specification-editor';
import { monaco } from '../../components/code-editor/monaco-integration';
import { HOTKEY_BINDINGS } from './constants';
import { getZoomToFitScale } from '../interface/layout';

/**
 * Executes a command if:
 * - the command is valid
 * - the command callback is defined
 */
const executeCommand = (command: Command, callback: () => void) => {
    const { commands } = getDenebState();
    if (commands[command]) {
        callback();
    }
};

/**
 * Ensure that we have the correct ref for an Ace editor, based on the current editor role in the store. This will
 * allow us to access the editor instance from other components.
 */
const getActiveEditorRef = (editorRefs: SpecificationEditorRefs) => {
    const { editorSelectedOperation } = getDenebState();
    switch (editorSelectedOperation) {
        case 'Spec':
            return editorRefs.spec;
        case 'Config':
            return editorRefs.config;
        default:
            return null;
    }
};

/**
 * For a given operation and string input, ensure that it's trimmed and replaced with suitable defaults if empty.
 */
const getCleanJsonInputForPersistence = (
    operation: EditorPaneRole,
    input: string
): string => {
    const clean = input?.trim() || '';
    if (clean === '') {
        switch (operation) {
            case 'Spec':
                return PROJECT_DEFAULTS.spec;
            case 'Config':
                return PROJECT_DEFAULTS.config;
        }
    }
    return clean;
};

/**
 * Convenience method to get key binding details from configuration for the specified command.
 */
export const getCommandKey = (command: Command): string =>
    HOTKEY_BINDINGS[command as keyof typeof HOTKEY_BINDINGS]?.combination || '';

/**
 * Applies the changes to the specification.
 */
export const handleApplyChanges = (editorRefs: SpecificationEditorRefs) => {
    executeCommand('applyChanges', () =>
        handlePersistSpecification(
            editorRefs?.spec.current,
            editorRefs?.config.current
        )
    );
    handleSetFocusToActiveEditor(editorRefs);
};

/**
 * Toggles the auto-apply changes mode.
 */
export const handleAutoApplyChanges = (editorRefs: SpecificationEditorRefs) => {
    const {
        editor: { toggleApplyMode }
    } = getDenebState();
    handleApplyChanges(editorRefs);
    executeCommand('autoApplyToggle', toggleApplyMode);
};

export const handleCloseCreateDialog = () =>
    getDenebState().project.setIsInitialized(true);

export const handleDataTableRowsPerPageChange = (value: number) => {
    const {
        editorPreferences: { setDataViewerRowsPerPage }
    } = getDenebState();
    setDataViewerRowsPerPage(value);
};

export const handleDebugPaneData = () => {
    executeCommand('debugPaneShowData', () => {
        setDebugPivotItem('data');
    });
};

export const handleDebugPaneLog = () => {
    executeCommand('debugPaneShowLogs', () => {
        setDebugPivotItem('log');
    });
};

export const handleDebugPaneSignal = () => {
    executeCommand('debugPaneShowSignals', () => {
        setDebugPivotItem('signal');
    });
};

/**
 * Allows the UI to discard changes after exiting the editor. As Monaco preserves state for the session, this will do
 * nothing.
 */
export const handleDiscardChanges = () => {
    executeCommand('discardChanges', () => {
        return;
    });
};

/**
 * Sets editor to config.
 */
export const handleEditorPaneConfig = (editorRefs: SpecificationEditorRefs) => {
    executeCommand('navigateConfig', () => {
        setEditorPivotItem('Config');
    });
    editorRefs.config?.current?.focus();
};

/**
 * Sets editor pane content to settings.
 */
export const handleEditorPaneSettings = () => {
    executeCommand('navigateSettings', () => {
        setEditorPivotItem('Settings');
    });
};

/**
 * Sets editor to specification.
 */
export const handleEditorPaneSpecification = (
    editorRefs: SpecificationEditorRefs
) => {
    executeCommand('navigateSpecification', () => {
        setEditorPivotItem('Spec');
    });
    editorRefs.spec?.current?.focus();
};

/**
 * Displays the export specification dialog.
 */
export const handleExportSpecification = () =>
    executeCommand('exportSpecification', () => {
        getDenebState().interface.setModalDialogRole('Export');
    });

export const handleOpenCreateSpecificationDialog = () => {
    getDenebState().interface.setModalDialogRole('Create');
};

/**
 * Handle opening the map fields dialog.
 */
export const handleOpenRemapDialog = () => {
    // Tracking is now only used for export (#486)
    // executeCommand('fieldMappings', () => {
    //     getState().interface.setModalDialogRole('Remap');
    // });
};

/**
 * Handle opening the Deneb website.
 */
export const handleOpenWebsite = (launchUrl: (url: string) => void) => {
    executeCommand('helpSite', () => {
        launchUrl(APPLICATION_INFORMATION_CONFIGURATION.supportUrl);
    });
};

/**
 * Resolve the spec/config and use the `properties` API for persistence. Also
 * resets the `isDirty` flag in the store.
 */
export const handlePersistSpecification = (
    specEditor: monaco.editor.IStandaloneCodeEditor | null,
    configEditor: monaco.editor.IStandaloneCodeEditor | null,
    stage = true
) => {
    const {
        editor: { stagedConfig, stagedSpec },
        project: { spec, config, setContent }
        // fieldUsage: { dataset: trackedFieldsCurrent },
    } = getDenebState();
    const nextSpec =
        (stage && specEditor
            ? getCleanJsonInputForPersistence('Spec', specEditor.getValue())
            : stagedSpec) ?? spec;
    const nextConfig =
        (stage && configEditor
            ? getCleanJsonInputForPersistence('Config', configEditor.getValue())
            : stagedConfig) ?? config;
    // Tracking is now only used for export (#486)
    // updateFieldTracking(nextSpec, trackedFieldsCurrent);
    setContent({ spec: nextSpec, config: nextConfig });
};

/**
 * Set focus to the active editor, based on the current editor role in the store.
 */
export const handleSetFocusToActiveEditor = (
    editorRefs: SpecificationEditorRefs
) => {
    if (shouldPrioritizeJsonEditor()) {
        getActiveEditorRef(editorRefs)?.current?.focus();
    }
};

/**
 * Handle toggling the debug pane.
 */
export const handleToggleDebugPane = () => {
    executeCommand('debugPaneToggle', () => {
        const {
            editor: { isDebugPaneMinimized, setIsDebugPaneMinimized }
        } = getDenebState();
        setIsDebugPaneMinimized(!isDebugPaneMinimized);
    });
};

/**
 * Handle toggling the editor theme.
 */
export const handleToggleEditorTheme = () => {
    executeCommand('themeToggle', () => {
        const {
            editorPreferences: { theme, setTheme }
        } = getDenebState();
        const newValue = theme === 'dark' ? 'light' : 'dark';
        setTheme(newValue);
    });
};

/**
 * Fit the zoom level to the current preview area dimensions.
 */
export const handleZoomFit = () =>
    executeCommand('zoomFit', () => {
        getDenebState().updateEditorZoomLevel(getZoomToFitScale());
    });

/**
 * Manages the decrease of zoom level in the visual editor by decreasing it by
 * step value.
 */
export const handleZoomIn = () =>
    executeCommand('zoomIn', () => {
        const value = getDenebState().editorZoomLevel;
        const { step, max } = VISUAL_PREVIEW_ZOOM_CONFIGURATION,
            level = Math.min(max, Math.floor((value + step) / 10) * 10);
        const zoomLevel = (value < max && level) || level;
        getDenebState().updateEditorZoomLevel(zoomLevel);
    });

/**
 * Manages the decrease of zoom level in the visual editor by decreasing it by
 * step value.
 */
export const handleZoomOut = () =>
    executeCommand('zoomOut', () => {
        const value = getDenebState().editorZoomLevel;
        const { step, min } = VISUAL_PREVIEW_ZOOM_CONFIGURATION,
            level = Math.max(min, Math.ceil((value - step) / 10) * 10);
        const zoomLevel = (value > min && level) || level;
        getDenebState().updateEditorZoomLevel(zoomLevel);
    });

/**
 * Resets the zoom level to the default value.
 */
export const handleZoomReset = () =>
    executeCommand('zoomReset', () => {
        getDenebState().updateEditorZoomLevel(
            VISUAL_PREVIEW_ZOOM_CONFIGURATION.default
        );
    });

/**
 * Open a specific pivot item in the debug pane.
 */
const setDebugPivotItem = (role: DebugPaneRole) => {
    getDenebState().updateEditorSelectedPreviewRole(role);
};

/**
 * Open a specific pivot item from the editor.
 */
const setEditorPivotItem = (operation: EditorPaneRole) =>
    getDenebState().updateEditorSelectedOperation(operation);

/**
 * Confirms that specified events are not occurring in the advanced editor UI
 * and the JSON editor can have focus set to it (or other similar actions).
 */
const shouldPrioritizeJsonEditor = () => {
    const {
        interface: { modalDialogRole }
    } = getDenebState();
    const isPopover = modalDialogRole !== 'None';
    return !isPopover;
};
