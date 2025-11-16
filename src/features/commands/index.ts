import { Options } from 'react-hotkeys-hook';
import { getZoomToFitScale } from '../../core/ui/advancedEditor';
import {
    IPersistenceProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../../core/utils/properties';
import { getState } from '../../store';
import { persistSpecification } from '../specification';
import {
    IExportSpecCommandTestOptions,
    IZoomOtherCommandTestOptions,
    IZoomLevelCommandTestOptions
} from './types';
import { IEditorRefs, setFocusToActiveEditor } from '../json-editor';
import { APPLICATION_INFORMATION, VISUAL_PREVIEW_ZOOM } from '../../../config';
import { launchUrl } from '../visual-host';
import { type CompiledSpecification } from '@deneb-viz/json-processing/spec-processing';
import {
    type InterfaceMode,
    type Command,
    type EditorApplyMode,
    type EditorPaneRole,
    type DebugPaneRole
} from '@deneb-viz/app-core';

export * from './types';

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
 * For the current apply mode, determine what the new one should be.
 */
export const getNextApplyMode = (
    applyMode: EditorApplyMode
): EditorApplyMode => (applyMode === 'Auto' ? 'Manual' : 'Auto');

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
        const { step, max } = VISUAL_PREVIEW_ZOOM,
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
        const { step, min } = VISUAL_PREVIEW_ZOOM,
            level = Math.max(min, Math.ceil((value - step) / 10) * 10);
        const zoomLevel = (value > min && level) || level;
        getState().updateEditorZoomLevel(zoomLevel);
    });

/**
 * Resets the zoom level to the default value.
 */
export const handleZoomReset = () =>
    executeCommand('zoomReset', () => {
        getState().updateEditorZoomLevel(VISUAL_PREVIEW_ZOOM.default);
    });

/**
 * Tests whether the export specification command is enabled.
 */
export const isExportSpecCommandEnabled = (
    options: IExportSpecCommandTestOptions
) =>
    !options.editorIsDirty &&
    isSpecificationValid(options.specification) &&
    isInterfaceModeValid(options.interfaceMode);

/**
 * Tests whether other zoom commands are enabled.
 */
export const isZoomOtherCommandEnabled = (
    options: IZoomOtherCommandTestOptions
) =>
    isSpecificationValid(options.specification) &&
    isInterfaceModeValid(options.interfaceMode);

/**
 * Tests whether the zoom in command is enabled.
 */
export const isZoomInCommandEnabled = (options: IZoomLevelCommandTestOptions) =>
    options.value !== VISUAL_PREVIEW_ZOOM.max &&
    isSpecificationValid(options.specification) &&
    isInterfaceModeValid(options.interfaceMode);

/**
 * Tests whether the zoom out command is enabled.
 */
export const isZoomOutCommandEnabled = (
    options: IZoomLevelCommandTestOptions
) =>
    options.value !== VISUAL_PREVIEW_ZOOM.min &&
    isSpecificationValid(options.specification) &&
    isInterfaceModeValid(options.interfaceMode);

/**
 * Confirms whether the interface mode is valid. A condition for many commands.
 */
const isInterfaceModeValid = (mode: InterfaceMode) => mode === 'Editor';

/**
 * Confirms whether the specification is valid. A condition for many commands.
 */
const isSpecificationValid = (specification: CompiledSpecification) =>
    specification.status === 'valid';

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
