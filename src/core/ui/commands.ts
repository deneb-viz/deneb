export {
    applyChanges,
    closeModalDialog,
    createExportableTemplate,
    createNewSpec,
    discardChanges,
    fourd3d3d,
    getVisualHotkeys,
    handleResetZoomLevel,
    handleSetZoomLevel,
    handleSetZoomToFit,
    handleZoomIn,
    handleZoomOut,
    isApplyButtonEnabled,
    openEditorPivotItem,
    openHelpSite,
    repairFormatJson,
    toggleAutoApplyState,
    toggleEditorPane,
    updateBooleanProperty,
    updateProvider,
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
import {
    toggleAutoApply,
    fourd3d3d as rdxFourd3d3d,
    toggleEditorPane as rdxToggleEditorPane,
    updateDirtyFlag,
    updateExportDialog,
    updateSelectedOperation
} from '../../store/visual';
import { updateSelectedTemplate } from '../../store/templates';
import { setZoomLevel } from '../../store/zoom';
import { getConfig, getVisualMetadata } from '../utils/config';
import { getZoomToFitScale } from './advancedEditor';
import { TEditorRole } from '../services/JsonEditorServices';
import { hostServices } from '../services';
import { TModalDialogType } from './modal';
import { updateExportState } from '../template';
import { TSpecProvider, TSpecRenderMode } from '../vega';

interface IKeyboardShortcut {
    keys: string;
    command: KeyHandler;
    options: Options;
}

/**
 * Handle the Apply Changes command.
 */
const applyChanges = () => persist();

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
    }
};

/**
 * Handle the Generate JSON Template command.
 */
const createExportableTemplate = () => dispatchExportDialog();

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
 * Manages dispatch of the default template select method to the Redux store.
 */
const dispatchDefaultTemplate = () => {
    store.dispatch(updateSelectedTemplate(0));
};

/**
 * Manages dispatch of the discard changes command method to the Redux store.
 */
const dispatchDiscardChanges = () => {
    store.dispatch(updateDirtyFlag(false));
};

/**
 * Manages dispatch of the editor pane command method to the Redux store.
 */
const dispatchEditorPaneToggle = () => {
    store.dispatch(rdxToggleEditorPane());
};

/**
 * Manages dispatch of the a pivot item selection method to the Redux store.
 */
const dispatchEditorPivotItem = (operation: TEditorRole) => {
    store.dispatch(updateSelectedOperation(operation));
};

/**
 * Manages dispatch of the export dialog command method to the Redux store.
 */
const dispatchExportDialog = (show = true) => {
    store.dispatch(updateExportDialog(show));
};

const dispatchFourd3d3d = () => {
    store.dispatch(rdxFourd3d3d(true));
};

/**
 * 'Escape hatch' method to set current window focus to the first pivot element (Specification). This is ideal for situations
 * where the user might be inside an editor, where the tab key is bound to indent/outdent.
 */

const focusFirstPivot = () =>
    document.getElementById('editor-pivot-spec').focus();

const fourd3d3d = () => dispatchFourd3d3d();

/**
 * Convenience method to get key binding details from configuration for the specified command.
 */
const getCommandKeyBinding = (command: string): string =>
    getConfig()?.keyBindings?.[command?.trim()] || '';

/**
 * Get an object array of visual hotkeys and their bindings from configuration, suitable for use in `react-hotkeys-hook`.
 */
const getVisualHotkeys = (): IKeyboardShortcut[] => [
    {
        keys: getCommandKeyBinding('applyChanges'),
        command: applyChanges,
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('autoApplyToggle'),
        command: () => toggleAutoApplyState(),
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('repairFormatJson'),
        command: () => repairFormatJson(),
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('newTemplate'),
        command: () => createExportableTemplate(),
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('newSpecification'),
        command: () => createNewSpec(),
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('openHelpUrl'),
        command: () => openHelpSite(),
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('navigateSpecification'),
        command: () => openEditorPivotItem('spec'),
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('navigateConfig'),
        command: () => openEditorPivotItem('config'),
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('navigateSettings'),
        command: () => openEditorPivotItem('settings'),
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('toggleEditorPane'),
        command: () => toggleEditorPane(),
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('editorFocusOut'),
        command: () => focusFirstPivot(),
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('zoomIn'),
        command: handleZoomIn,
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('zoomOut'),
        command: handleZoomOut,
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('zoomReset'),
        command: handleResetZoomLevel,
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('zoomFit'),
        command: handleSetZoomToFit,
        options: hotkeyOptions
    }
];

/**
 * Manages persistence of a properties object to the Redux store from an operation.
 */
const handlePersist = (property: IPersistenceProperty) =>
    updateObjectProperties(resolveObjectProperties('vega', [property]));

/**
 * Manages the reset of the zoom level in the visual editor.
 */
const handleResetZoomLevel = () => {
    handleSetZoomLevel(getConfig().zoomLevel.default);
};

/**
 * Manages the setting of the zoom level in the advanced editor to specified value.
 */
const handleSetZoomLevel = (value: number) => {
    store.dispatch(setZoomLevel(value));
};

/**
 * Manages the calculation of zoom level in the visual editor that will fit the visual viewport from the report.
 */
const handleSetZoomToFit = () => {
    handleSetZoomLevel(getZoomToFitScale());
};

/**
 * Manages the increase of zoom level in the visual editor by increasing it by step value.
 */
const handleZoomIn = () => {
    const { value, step, max } = getState().zoom,
        level = Math.min(max, Math.floor((value + step) / 10) * 10);
    value < max && handleSetZoomLevel(level);
};

/**
 * Manages the decrease of zoom level in the visual editor by decreasing it by step value.
 */
const handleZoomOut = () => {
    const { value, step, min } = getState().zoom,
        level = Math.max(min, Math.ceil((value - step) / 10) * 10);
    value > min && handleSetZoomLevel(level);
};

/**
 * Constant specifying `react-hotkeys-hook` bindings for particular HTML elements.
 */
const hotkeyOptions: Options = {
    enableOnTags: ['INPUT', 'SELECT', 'TEXTAREA'],
    splitKey: '|'
};

/**
 * Check auto-apply and dirty status to determine whether the Apply button should be enabled or not.
 */
const isApplyButtonEnabled = () => {
    const { autoApply, canAutoApply, isDirty } = getState().visual;
    return (canAutoApply && autoApply) || !isDirty;
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

/**
 * Handle the Toggle Auto Apply command.
 */
const toggleAutoApplyState = () => {
    applyChanges();
    store.dispatch(toggleAutoApply());
};

/**
 * Handle the show/hide of the editor pane.
 */
const toggleEditorPane = () => {
    applyChanges();
    dispatchEditorPaneToggle();
};

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
 * Handle the change in render mode from one to the other and update necessary store dependencies and properties.
 */
const updateRenderMode = (renderMode: TSpecRenderMode) =>
    handlePersist({ name: 'renderMode', value: renderMode });
