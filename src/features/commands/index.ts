import { Options } from 'react-hotkeys-hook';
import {
    TPreviewPivotRole,
    getZoomToFitScale
} from '../../core/ui/advancedEditor';
import {
    IPersistenceProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../../core/utils/properties';
import { getState } from '../../store';
import { InterfaceMode } from '../interface';
import {
    ISpecification,
    fixAndFormatSpecification,
    persistSpecification
} from '../specification';
import {
    Command,
    IExportSpecCommandTestOptions,
    IZoomOtherCommandTestOptions,
    IZoomLevelCommandTestOptions
} from './types';
import { EditorApplyMode, TEditorRole } from '../json-editor';
import { APPLICATION_INFORMATION, VISUAL_PREVIEW_ZOOM } from '../../../config';
import { launchUrl } from '../visual-host';

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
export const getNextApplyMode = (applyMode: EditorApplyMode): EditorApplyMode =>
    applyMode === 'Auto' ? 'Manual' : 'Auto';

/**
 * Applies the changes to the specification.
 */
export const handleApplyChanges = () =>
    executeCommand('applyChanges', persistSpecification);

/**
 * Toggles the auto-apply changes mode.
 */
export const handleAutoApplyChanges = () => {
    const {
        editor: { toggleApplyMode }
    } = getState();
    handleApplyChanges();
    executeCommand('autoApplyToggle', toggleApplyMode);
};

/**
 * Allows the UI to discard changes after exiting the editor.
 */
export const handleDiscardChanges = () => {
    executeCommand('discardChanges', () => {
        getState().editor.updateIsDirty(false);
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
export const handleEditorPaneConfig = () => {
    executeCommand('navigateConfig', () => {
        setEditorPivotItem('config');
    });
};

/**
 * Sets editor pane content to settings.
 */
export const handleEditorPaneSettings = () => {
    executeCommand('navigateSettings', () => {
        setEditorPivotItem('settings');
    });
};

/**
 * Sets editor to specification.
 */
export const handleEditorPaneSpecification = () => {
    executeCommand('navigateSpecification', () => {
        setEditorPivotItem('spec');
    });
};

/**
 * Displays the export specification dialog.
 */
export const handleExportSpecification = () =>
    executeCommand('exportSpecification', () => {
        getState().interface.setModalDialogRole('Export');
    });

/**
 * Set focus to the specification editor
 */
export const handleFocusSpecificationEditor = () => {
    executeCommand('editorFocusOut', () => {
        document.getElementById('editor-pivot-spec').focus();
    });
};

/**
 * Invokes JSON formatting.
 */
export const handleFormatJson = () =>
    executeCommand('formatJson', fixAndFormatSpecification);

export const handleOpenCreateSpecificationDialog = () => {
    executeCommand('newSpecification', () => {
        setVisualProperty([{ name: 'isNewDialogOpen', value: true }]);
    });
};

/**
 * Handle opening the map fields dialog.
 */
export const handleOpenRemapDialog = () => {
    executeCommand('fieldMappings', () => {
        getState().interface.setModalDialogRole('Remap');
    });
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
const isSpecificationValid = (specification: ISpecification) =>
    specification.status === 'valid';

/**
 * Open a specific pivot item in the debug pane.
 */
const setDebugPivotItem = (role: TPreviewPivotRole) => {
    getState().updateEditorSelectedPreviewRole(role);
};

/**
 * Open a specific pivot item from the editor.
 */
const setEditorPivotItem = (operation: TEditorRole) =>
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
