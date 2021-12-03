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
    repairFormatJson,
    updateBooleanProperty,
    updateProvider,
    updateSelectionMaxDataPoints,
    updateRenderMode,
    IKeyboardShortcut
};

import { KeyHandler } from 'hotkeys-js';
import { Options } from 'react-hotkeys-hook';

import { fixAndFormat, persist } from '../utils/specification';
import {
    IPersistenceProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../utils/properties';
import store, { getState } from '../../store';
import { getConfig, getVisualMetadata } from '../utils/config';
import { TEditorRole } from '../services/JsonEditorServices';
import { hostServices, viewServices } from '../services';
import { TModalDialogType } from './modal';
import { updateExportState } from '../template';
import { TSpecProvider, TSpecRenderMode } from '../vega';
import { getZoomInLevel, getZoomOutLevel, zoomConfig } from './dom';
import { getZoomToFitScale } from './advancedEditor';

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
            handlePersist({ name: 'isNewDialogOpen', value: false });
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

const openMapFieldsDialog = () => dispatchMapFieldsDialog();

/**
 * Handle the Create New Spec command.
 */
const createNewSpec = () => {
    handlePersist({ name: 'isNewDialogOpen', value: true });
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
    viewServices.setPreviewImage(false);
    updateEditorExportDialogVisible(show);
};

const dispatchMapFieldsDialog = (show = true) => {
    getState().updateEditorMapDialogVisible(show);
};

const dispatchFourd3d3d = () => {
    getState().setVisual4d3d3d(true);
};

const fourd3d3d = () => dispatchFourd3d3d();

/**
 * Manages persistence of a properties object to the store from an operation.
 */
const handlePersist = (property: IPersistenceProperty) =>
    updateObjectProperties(resolveObjectProperties('vega', [property]));

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

const navSpec = () => openEditorPivotItem('spec');

const navConfig = () => openEditorPivotItem('config');

const navSettings = () => openEditorPivotItem('settings');

/**
 * Generic handler for a boolean (checkbox) property in the settings pane.
 */
const updateBooleanProperty = (name: string, value: boolean) =>
    handlePersist({ name: name, value: value });

/**
 * Handle the change in provider from one to the other and update necessary store dependencies and properties.
 */
const updateProvider = (provider: TSpecProvider) =>
    handlePersist({ name: 'provider', value: provider });

/**
 * Handle the change in maximm permitted underlying data points for selection.
 */
const updateSelectionMaxDataPoints = (value: string) =>
    handlePersist({ name: 'selectionMaxDataPoints', value });

/**
 * Handle the change in render mode from one to the other and update necessary store dependencies and properties.
 */
const updateRenderMode = (renderMode: TSpecRenderMode) =>
    handlePersist({ name: 'renderMode', value: renderMode });
