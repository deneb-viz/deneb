export {
    closeModalDialog,
    createExportableTemplate,
    createNewSpec,
    discardChanges,
    fourd3d3d,
    getCommandKey,
    hotkeyOptions,
    isApplyButtonDisabled,
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
    updateSvgFilter,
    dismissVersionNotification,
    IKeyboardShortcut
};

import { KeyHandler } from 'hotkeys-js';
import { Options } from 'react-hotkeys-hook';

import { fixAndFormat, persist } from '../utils/specification';
import {
    getProviderVersionProperty,
    IPersistenceProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../utils/properties';
import store, { getState } from '../../store';
import { getConfig, getVisualMetadata } from '../utils/config';
import { TEditorRole } from '../services/JsonEditorServices';
import { hostServices } from '../services';
import { TModalDialogType } from './modal';
import { updateExportState } from '../template';
import { TSpecProvider, TSpecRenderMode } from '../vega';
import { getZoomInLevel, getZoomOutLevel, zoomConfig } from './dom';
import { getZoomToFitScale, TPreviewPivotRole } from './advancedEditor';
import { dispatchPreviewImage } from '../../features/template';

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
    const { visualMode } = getState();
    visualMode === 'Editor' && command();
};

/**
 * Convenience method to get key binding details from configuration for the specified command.
 */
const getCommandKey = (command: string): string =>
    getConfig()?.keyBindings?.[command?.trim()]?.combination || '';

/**
 * Wrappers for event handling
 */
export const handleApply = () => executeEditorCommand(persist);
export const handleAutoApply = () => {
    const { toggleEditorAutoApplyStatus } = getState();
    handleApply();
    executeEditorCommand(toggleEditorAutoApplyStatus);
};
export const handleFormat = () => executeEditorCommand(fixAndFormat);
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

/**
 * Handle the necessary logic required to close down a modal dialog.
 */
const closeModalDialog = (type: TModalDialogType) => {
    switch (type) {
        case 'new': {
            handlePersist([{ name: 'isNewDialogOpen', value: false }]);
            break;
        }
        case 'export': {
            dispatchExportDialog(false);
            updateExportState('None');
            break;
        }
        case 'mapping': {
            dispatchMapFieldsDialog(false);
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
    dispatchDefaultTemplate();
};

/**
 * Handle the discard operation from the apply dialog, if the editors are dirty and the creator exits without applying them.
 */
const discardChanges = () => dispatchDiscardChanges();

/**
 * Manages dispatch of the default template select method to the store.
 */
const dispatchDefaultTemplate = () => {
    getState().updateSelectedTemplate(0);
};

/**
 * Manages dispatch of the discard changes command method to the store.
 */
const dispatchDiscardChanges = () => {
    getState().updateEditorDirtyStatus(false);
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
    const { updateEditorExportDialogVisible, updateTemplatePreviewImage } =
        getState();
    dispatchPreviewImage(false);
    updateEditorExportDialogVisible(show);
};

const dispatchMapFieldsDialog = (show = true) => {
    getState().updateEditorMapDialogVisible(show);
};

const dispatchPreviewPivotItem = (role: TPreviewPivotRole) => {
    getState().updateEditorSelectedPreviewRole(role);
};

const dispatchPreviewDebugToggle = () => {
    getState().togglePreviewDebugPane();
};

const dispatchFourd3d3d = () => {
    getState().setVisual4d3d3d(true);
};

const fourd3d3d = () => dispatchFourd3d3d();

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
 * Check auto-apply and dirty status to determine whether the Apply button should be enabled or not.
 */
const isApplyButtonDisabled = () => {
    const { editorAutoApply, editorCanAutoApply, editorIsDirty } = store(
        (state) => state
    );
    return (editorAutoApply && !editorCanAutoApply) || !editorIsDirty;
};

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
const repairFormatJson = () => fixAndFormat();

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
const updateSelectionMaxDataPoints = (value: string) =>
    handlePersist([{ name: 'selectionMaxDataPoints', value }]);

/**
 * Handle the change in render mode from one to the other and update necessary store dependencies and properties.
 */
const updateRenderMode = (renderMode: TSpecRenderMode) =>
    handlePersist([{ name: 'renderMode', value: renderMode }]);

/**
 * Handle the change in SVG filter from one to the other and update necessary store dependencies and properties.
 */
const updateSvgFilter = (value: string) =>
    handlePersist([{ name: 'svgFilter', value }], 'display');

/**
 * Handle the dynamic setting of the version notification property.
 */
const dismissVersionNotification = () => handleApply();
