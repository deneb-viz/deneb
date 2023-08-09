export {
    closeModalDialog,
    createExportableTemplate,
    createNewSpec,
    discardChanges,
    getCommandKey,
    hotkeyOptions,
    openEditorPivotItem,
    openHelpSite,
    openMapFieldsDialog,
    openPreviewPivotItem,
    repairFormatJson,
    resetProviderPropertyValue,
    updateBooleanProperty,
    updateLogLevel,
    updatePreviewDebugPaneState,
    updateProvider,
    updateSelectionMaxDataPoints,
    updateRenderMode,
    dismissVersionNotification,
    IKeyboardShortcut
};

import { KeyHandler } from 'hotkeys-js';
import { Options } from 'react-hotkeys-hook';

import {
    getProviderVersionProperty,
    IPersistenceProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../utils/properties';
import { getState } from '../../store';
import { getConfig, getVisualMetadata } from '../utils/config';
import { hostServices } from '../services';
import { TModalDialogType } from '../../features/modal-dialog';
import { TSpecProvider, TSpecRenderMode } from '../vega';
import { getZoomInLevel, getZoomOutLevel, zoomConfig } from './dom';
import { getZoomToFitScale, TPreviewPivotRole } from './advancedEditor';
import { dispatchPreviewImage } from '../../features/template';
import {
    fixAndFormatSpecification,
    persistSpecification
} from '../../features/specification';
import { updateTemplateExportState } from '../../features/visual-export';
import { TEditorRole } from '../../features/json-editor';

interface IKeyboardShortcut {
    keys: string;
    command: KeyHandler;
    options: Options;
}

/**
 * Constant specifying `react-hotkeys-hook` bindings for particular HTML elements.
 */
const hotkeyOptions: Options = {
    enableOnTags: ['INPUT', 'SELECT', 'TEXTAREA'],
    splitKey: '|'
};

const executeEditorCommand = (command: () => void) => {
    const {
        interface: { mode }
    } = getState();
    mode === 'Editor' && command();
};

/**
 * Convenience method to get key binding details from configuration for the specified command.
 */
const getCommandKey = (command: string): string =>
    getConfig()?.keyBindings?.[command?.trim()]?.combination || '';

/**
 * Wrappers for event handling
 */
export const handleApply = () => executeEditorCommand(persistSpecification);
export const handleAutoApply = () => {
    const {
        editor: { toggleApplyMode }
    } = getState();
    handleApply();
    executeEditorCommand(toggleApplyMode);
};
export const handleFormat = () =>
    executeEditorCommand(fixAndFormatSpecification);
export const handleNewSpecification = () => executeEditorCommand(createNewSpec);
export const handleExportTemplate = () =>
    executeEditorCommand(createExportableTemplate);
export const handleMapFields = () => executeEditorCommand(openMapFieldsDialog);
export const handleZoomIn = () => executeEditorCommand(zoomIn);
export const handleZoomOut = () => executeEditorCommand(zoomOut);
export const handleZoomReset = () => executeEditorCommand(zoomReset);
export const handleZoomFit = () => executeEditorCommand(zoomFit);
export const handleHelp = () => executeEditorCommand(openHelpSite);
export const handleNavSpec = () => executeEditorCommand(navSpec);
export const handleNavConfig = () => executeEditorCommand(navConfig);
export const handleNavSettings = () => executeEditorCommand(navSettings);
export const handleEditorPane = () =>
    executeEditorCommand(getState().toggleEditorPane);
export const handleDebugPane = () =>
    executeEditorCommand(getState().togglePreviewDebugPane);
export const handleEditorDebugPaneData = () =>
    executeEditorCommand(showDebugPaneData);
export const handleEditorDebugPaneSignal = () =>
    executeEditorCommand(showDebugPaneSignal);
export const handleEditorDebugPaneLog = () =>
    executeEditorCommand(showDebugPaneLog);
export const handleFocusFirstPivot = () =>
    executeEditorCommand(focusFirstPivot);

/**
 * Actual event handling logic for wrappers
 */
const focusFirstPivot = () =>
    document.getElementById('editor-pivot-spec').focus();
const zoomReset = () => getState().updateEditorZoomLevel(zoomConfig.default);
const zoomIn = () =>
    getState().updateEditorZoomLevel(
        getZoomInLevel(getState().editorZoomLevel)
    );
const zoomOut = () =>
    getState().updateEditorZoomLevel(
        getZoomOutLevel(getState().editorZoomLevel)
    );
const zoomFit = () => getState().updateEditorZoomLevel(getZoomToFitScale());

export const closeCreateDialog = () =>
    handlePersist([{ name: 'isNewDialogOpen', value: false }]);

/**
 * Handle the necessary logic required to close down a modal dialog.
 */
const closeModalDialog = (type: TModalDialogType) => {
    switch (type) {
        case 'export': {
            dispatchExportDialog(false);
            updateTemplateExportState('None');
            break;
        }
    }
};

/**
 * Handle the Generate JSON Template command.
 */
const createExportableTemplate = () => dispatchExportDialog();

/**
 * Handle opening the map fields dialog.
 */
const openMapFieldsDialog = () => dispatchMapFieldsDialog();

/**
 * Handle the Create New Spec command.
 */
const createNewSpec = () => {
    handlePersist([{ name: 'isNewDialogOpen', value: true }]);
};

/**
 * Handle the discard operation from the apply dialog, if the editors are dirty and the creator exits without applying them.
 */
const discardChanges = () => dispatchDiscardChanges();

/**
 * Manages dispatch of the discard changes command method to the store.
 */
const dispatchDiscardChanges = () => {
    getState().editor.updateIsDirty(false);
};

/**
 * Manages dispatch of the a pivot item selection method to the store.
 */
const dispatchEditorPivotItem = (operation: TEditorRole) => {
    getState().updateEditorSelectedOperation(operation);
};

/**
 * Manages dispatch of the export dialog command method to the store.
 */
const dispatchExportDialog = (show = true) => {
    getState().interface.setModalDialogRole('Export');
};

const dispatchMapFieldsDialog = () => {
    getState().interface.setModalDialogRole('Remap');
};

const dispatchPreviewPivotItem = (role: TPreviewPivotRole) => {
    getState().updateEditorSelectedPreviewRole(role);
};

const dispatchPreviewDebugToggle = () => {
    getState().togglePreviewDebugPane();
};

/**
 * Manages persistence of a properties object to the store from an operation.
 */
const handlePersist = (
    properties: IPersistenceProperty[],
    objectName = 'vega'
) =>
    updateObjectProperties(
        resolveObjectProperties([{ objectName, properties }])
    );

/**
 * Open a specific pivot item from the editor.
 */
const openEditorPivotItem = (operation: TEditorRole) =>
    dispatchEditorPivotItem(operation);

/**
 * Open a specific pivot item in the preview pane.
 */
const openPreviewPivotItem = (role: TPreviewPivotRole) =>
    dispatchPreviewPivotItem(role);

/**
 * Handles update of debug pane toggle state.
 */
const updatePreviewDebugPaneState = () => dispatchPreviewDebugToggle();

/**
 * Handle the Get Help command.
 */
const openHelpSite = () => {
    const visualMetadata = getVisualMetadata();
    hostServices.launchUrl(visualMetadata.supportUrl);
};

/**
 * Handle the Repair/Format JSON command.
 */
const repairFormatJson = () => fixAndFormatSpecification();

/**
 * Navigate to the spec pane in the editor.
 */
const navSpec = () => openEditorPivotItem('spec');

/**
 * Navigate to the config pane in the editor.
 */
const navConfig = () => openEditorPivotItem('config');

/**
 * Navigate to the settings pane in the editor.
 */
const navSettings = () => openEditorPivotItem('settings');

/**
 * Show the Data pane in the Debug Pane.
 */
const showDebugPaneData = () => openPreviewPivotItem('data');

/**
 * Show the Signals pane in the Debug Pane.
 */
const showDebugPaneSignal = () => openPreviewPivotItem('signal');

/**
 * Show the Logs pane in the Debug Pane.
 */
const showDebugPaneLog = () => openPreviewPivotItem('log');

/**
 * Reset the specified provider (Vega) visual property to its default value.
 */
const resetProviderPropertyValue = (propertyKey: string) => {
    const value: string = getConfig().propertyDefaults.vega?.[propertyKey];
    handlePersist([{ name: propertyKey, value }]);
};

/**
 * Generic handler for a boolean (checkbox) property in the settings pane.
 */
const updateBooleanProperty = (name: string, value: boolean) =>
    handlePersist([{ name, value }]);

const updateLogLevel = (value: string) => {
    handlePersist([{ name: 'logLevel', value }]);
};

/**
 * Handle the change in provider from one to the other and update necessary store dependencies and properties.
 */
const updateProvider = (provider: TSpecProvider) =>
    handlePersist([
        { name: 'provider', value: provider },
        getProviderVersionProperty(provider)
    ]);

/**
 * Handle the change in maximm permitted underlying data points for selection.
 */
const updateSelectionMaxDataPoints = (value: number) =>
    handlePersist([{ name: 'selectionMaxDataPoints', value }]);

/**
 * Handle the change in render mode from one to the other and update necessary store dependencies and properties.
 */
const updateRenderMode = (renderMode: TSpecRenderMode) =>
    handlePersist([{ name: 'renderMode', value: renderMode }]);

/**
 * Handle the dynamic setting of the version notification property.
 */
const dismissVersionNotification = () => handleApply();
