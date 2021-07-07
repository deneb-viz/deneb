export {
    applyChanges,
    closeModalDialog,
    createExportableTemplate,
    createNewSpec,
    discardChanges,
    fourd3d3d,
    getVisualHotkeys,
    isApplyButtonEnabled,
    openEditorPivotItem,
    openHelpSite,
    repairFormatJson,
    toggleAutoApply,
    toggleEditorPane,
    updateBooleanProperty,
    updateProvider,
    updateRenderMode,
    IKeyboardShortcut
};

import { TModalDialogType } from '../../types';
import { Options } from 'react-hotkeys-hook';
import {
    toggleAutoApply as rdxToggleAutoApply,
    toggleEditorPane as rdxToggleEditorPane,
    fourd3d3d as rdxFourd3d3d,
    updateDirtyFlag,
    updateExportDialog,
    updateSelectedOperation
} from '../../store/visualReducer';
import { updateSelectedTemplate } from '../../store/templateReducer';

import { getConfig, getVisualMetadata } from '../config';
import { TEditorRole } from '../editor';
import {
    resolveObjectProperties,
    updateObjectProperties,
    IPersistenceProperty
} from '../properties';
import {
    fixAndFormat,
    persist,
    TSpecProvider,
    TSpecRenderMode
} from '../specification';
import { getState, store } from '../store';
import { updateExportState } from '../template';

const hotkeyOptions: Options = {
    enableOnTags: ['INPUT', 'SELECT', 'TEXTAREA']
};

const applyChanges = () => persist();

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

const createExportableTemplate = () => dispatchExportDialog();

const createNewSpec = () => {
    handlePersist({ name: 'isNewDialogOpen', value: true });
    dispatchDefaultTemplate();
};

const discardChanges = () => dispatchDiscardChanges();

const focusFirstPivot = () =>
    document.getElementById('editor-pivot-spec').focus();

const fourd3d3d = () => dispatchFourd3d3d();

const getVisualHotkeys = (): IKeyboardShortcut[] => [
    {
        keys: getCommandKeyBinding('applyChanges'),
        command: () => applyChanges(),
        options: hotkeyOptions
    },
    {
        keys: getCommandKeyBinding('autoApplyToggle'),
        command: () => toggleAutoApply(),
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
    }
];

const isApplyButtonEnabled = () => {
    const { autoApply, canAutoApply, isDirty } = getState().visual;
    return (canAutoApply && autoApply) || !isDirty;
};

const openEditorPivotItem = (operation: TEditorRole) =>
    dispatchEditorPivotItem(operation);

const openHelpSite = () => {
    const visualMetadata = getVisualMetadata(),
        { launchUrl } = getState().visual;
    launchUrl(visualMetadata.supportUrl);
};

const repairFormatJson = () => fixAndFormat();

const toggleAutoApply = () => {
    applyChanges();
    dispatchAutoApply();
};

const toggleEditorPane = () => {
    applyChanges();
    dispatchEditorPaneToggle();
};

const updateBooleanProperty = (name: string, value: boolean) =>
    handlePersist({ name: name, value: value });

const updateProvider = (provider: TSpecProvider) =>
    handlePersist({ name: 'provider', value: provider });

const updateRenderMode = (renderMode: TSpecRenderMode) =>
    handlePersist({ name: 'renderMode', value: renderMode });

interface IKeyboardShortcut {
    keys: string;
    command: () => void;
    options: Options;
}

const dispatchAutoApply = () => {
    store.dispatch(rdxToggleAutoApply());
};

const dispatchDefaultTemplate = () => {
    store.dispatch(updateSelectedTemplate(0));
};

const dispatchDiscardChanges = () => {
    store.dispatch(updateDirtyFlag(false));
};

const dispatchEditorPivotItem = (operation: TEditorRole) => {
    store.dispatch(updateSelectedOperation(operation));
};

const dispatchEditorPaneToggle = () => {
    store.dispatch(rdxToggleEditorPane());
};

const dispatchExportDialog = (show = true) => {
    store.dispatch(updateExportDialog(show));
};

const dispatchFourd3d3d = () => {
    store.dispatch(rdxFourd3d3d(true));
};

const getCommandKeyBinding = (command: string): string =>
    getConfig()?.keyBindings?.[command?.trim()] || '';

const handlePersist = (property: IPersistenceProperty) =>
    updateObjectProperties(resolveObjectProperties('vega', [property]));
