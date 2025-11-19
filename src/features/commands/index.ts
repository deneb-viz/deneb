import { Options } from 'react-hotkeys-hook';
import { getZoomToFitScale } from '../../core/ui/advancedEditor';
import {
    IPersistenceProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../../core/utils/properties';
import { getState } from '../../store';
import { persistSpecification } from '../specification';
import { IEditorRefs, setFocusToActiveEditor } from '../json-editor';
import { APPLICATION_INFORMATION } from '../../../config';
import {
    type Command,
    type DebugPaneRole,
    type EditorPaneRole
} from '@deneb-viz/app-core';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { launchUrl } from '@deneb-viz/powerbi-compat/visual-host';

/**
 * Specifies `react-hotkeys-hook` bindings for particular HTML elements.
 */
export const HOTKEY_OPTIONS: Options = {
    enableOnFormTags: ['INPUT', 'SELECT', 'TEXTAREA'],
    combinationKey: '|'
};

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
    } = getState();
    mode === 'Editor' && commands[command] && callback();
};

/**
 * Applies the changes to the specification.
 */
export const handleApplyChanges = (editorRefs: IEditorRefs) => {
    executeCommand('applyChanges', () =>
        persistSpecification(
            editorRefs?.spec.current,
            editorRefs?.config.current
        )
    );
    setFocusToActiveEditor(editorRefs);
};

/**
 * Toggles the auto-apply changes mode.
 */
export const handleAutoApplyChanges = (editorRefs: IEditorRefs) => {
    const {
        editor: { toggleApplyMode }
    } = getState();
    handleApplyChanges(editorRefs);
    executeCommand('autoApplyToggle', toggleApplyMode);
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
 * Sets editor to config.
 */
export const handleEditorPaneConfig = (editorRefs: IEditorRefs) => {
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
export const handleEditorPaneSpecification = (editorRefs: IEditorRefs) => {
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
        getState().interface.setModalDialogRole('Export');
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
        launchUrl(APPLICATION_INFORMATION.supportUrl);
    });
};

/**
 * Handle toggling the debug pane.
 */
export const handleToggleDebugPane = () => {
    executeCommand('debugPaneToggle', () => {
        getState().togglePreviewDebugPane();
    });
};

/**
 * Handle toggling the editor pane.
 */
export const handleToggleEditorPane = () => {
    executeCommand('editorPaneToggle', () => {
        getState().toggleEditorPane();
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
        } = getState();
        const newValue = theme === 'dark' ? 'light' : 'dark';
        setVisualProperty([{ name: 'theme', value: newValue }], 'editor');
    });
};

/**
 * Fit the zoom level to the current preview area dimensions.
 */
export const handleZoomFit = () =>
    executeCommand('zoomFit', () => {
        getState().updateEditorZoomLevel(getZoomToFitScale());
    });

/**
 * Manages the decrease of zoom level in the visual editor by decreasing it by
 * step value.
 */
export const handleZoomIn = () =>
    executeCommand('zoomIn', () => {
        const value = getState().editorZoomLevel;
        const { step, max } = VISUAL_PREVIEW_ZOOM_CONFIGURATION,
            level = Math.min(max, Math.floor((value + step) / 10) * 10);
        const zoomLevel = (value < max && level) || level;
        getState().updateEditorZoomLevel(zoomLevel);
    });

/**
 * Manages the decrease of zoom level in the visual editor by decreasing it by
 * step value.
 */
export const handleZoomOut = () =>
    executeCommand('zoomOut', () => {
        const value = getState().editorZoomLevel;
        const { step, min } = VISUAL_PREVIEW_ZOOM_CONFIGURATION,
            level = Math.max(min, Math.ceil((value - step) / 10) * 10);
        const zoomLevel = (value > min && level) || level;
        getState().updateEditorZoomLevel(zoomLevel);
    });

/**
 * Resets the zoom level to the default value.
 */
export const handleZoomReset = () =>
    executeCommand('zoomReset', () => {
        getState().updateEditorZoomLevel(
            VISUAL_PREVIEW_ZOOM_CONFIGURATION.default
        );
    });

/**
 * Open a specific pivot item in the debug pane.
 */
const setDebugPivotItem = (role: DebugPaneRole) => {
    getState().updateEditorSelectedPreviewRole(role);
};

/**
 * Open a specific pivot item from the editor.
 */
const setEditorPivotItem = (operation: EditorPaneRole) =>
    getState().updateEditorSelectedOperation(operation);

/**
 * Manages persistence of a properties object to the store from an operation.
 */
export const setVisualProperty = (
    properties: IPersistenceProperty[],
    objectName = 'vega'
) =>
    updateObjectProperties(
        resolveObjectProperties([{ objectName, properties }])
    );
