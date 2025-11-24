import {
    APPLICATION_INFORMATION_CONFIGURATION,
    VISUAL_PREVIEW_ZOOM_CONFIGURATION
} from '@deneb-viz/configuration';
import { getDenebState } from '../../state';
import {
    type DebugPaneRole,
    type EditorPaneRole,
    getZoomToFitScale
} from '../interface';
import { type Command } from './types';
import {
    launchUrl,
    type PersistenceProperty,
    persistProperties,
    resolveObjectProperties
} from '@deneb-viz/powerbi-compat/visual-host';
import { type SpecificationEditorRefs } from '../../features/specification-editor';

/**
 * Executes a command if:
 * - the command is valid
 * - the interface mode is valid
 * - the command callback is defined
 */
const executeCommand = (command: Command, callback: () => void) => {
    const {
        commands,
        interface: { mode }
    } = getDenebState();
    if (mode === 'Editor' && commands[command]) {
        callback();
    }
};

export const handleDataTableRowsPerPageChange = (value: number) => {
    setVisualProperty(
        [{ name: 'debugTableRowsPerPage', value: `${value}` }],
        'editor'
    );
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
    executeCommand('newSpecification', () => {
        setVisualProperty([{ name: 'isNewDialogOpen', value: true }]);
    });
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
export const handleOpenWebsite = () => {
    executeCommand('helpSite', () => {
        launchUrl(APPLICATION_INFORMATION_CONFIGURATION.supportUrl);
    });
};

/**
 * Handle toggling the debug pane.
 */
export const handleToggleDebugPane = () => {
    executeCommand('debugPaneToggle', () => {
        getDenebState().togglePreviewDebugPane();
    });
};

/**
 * Handle toggling the editor pane.
 */
export const handleToggleEditorPane = () => {
    executeCommand('editorPaneToggle', () => {
        getDenebState().toggleEditorPane();
    });
};

/**
 * Handle toggling the editor theme.
 */
export const handleToggleEditorTheme = () => {
    executeCommand('themeToggle', () => {
        const {
            visualSettings: {
                editor: {
                    interface: {
                        theme: { value: theme }
                    }
                }
            }
        } = getDenebState();
        const newValue = theme === 'dark' ? 'light' : 'dark';
        setVisualProperty([{ name: 'theme', value: newValue }], 'editor');
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
 * Manages persistence of a properties object to the store from an operation.
 */
const setVisualProperty = (
    properties: PersistenceProperty[],
    objectName = 'vega'
) => persistProperties(resolveObjectProperties([{ objectName, properties }]));
