import { TEditorOperation, TModalDialogType } from '../../types';
import { Options } from 'react-hotkeys-hook';

import { getVisualMetadata } from '../config/public';
import {
    fixAndFormat,
    persist,
    TSpecProvider,
    TSpecRenderMode
} from '../specification/public';
import { getState } from '../store/public';
import { updateExportState } from '../template/public_noconflict';
import {
    dispatchAutoApply,
    dispatchDefaultTemplate,
    dispatchEditorPaneToggle,
    dispatchEditorPivotItem,
    dispatchExportDialog,
    dispatchFourd3d3d,
    getCommandKeyBinding,
    hotkeyOptions as options,
    handlePersist
} from './private';

export const applyChanges = () => persist();

export const closeModalDialog = (type: TModalDialogType) => {
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

export const createExportableTemplate = () => dispatchExportDialog();

export const createNewSpec = () => {
    handlePersist({ name: 'isNewDialogOpen', value: true });
    dispatchDefaultTemplate();
};

export const focusFirstPivot = () => document.getElementById("editor-pivot-spec").focus();

export const fourd3d3d = () => dispatchFourd3d3d();

export const getVisualHotkeys = (): IKeyboardShortcut[] => [
    {
        keys: getCommandKeyBinding('applyChanges'),
        command: () => applyChanges(),
        options
    },
    {
        keys: getCommandKeyBinding('autoApplyToggle'),
        command: () => toggleAutoApply(),
        options
    },
    {
        keys: getCommandKeyBinding('repairFormatJson'),
        command: () => repairFormatJson(),
        options
    },
    {
        keys: getCommandKeyBinding('newTemplate'),
        command: () => createExportableTemplate(),
        options
    },
    {
        keys: getCommandKeyBinding('newSpecification'),
        command: () => createNewSpec(),
        options
    },
    {
        keys: getCommandKeyBinding('openHelpUrl'),
        command: () => openHelpSite(),
        options
    },
    {
        keys: getCommandKeyBinding('navigateSpecification'),
        command: () => openEditorPivotItem('spec'),
        options
    },
    {
        keys: getCommandKeyBinding('navigateConfig'),
        command: () => openEditorPivotItem('config'),
        options
    },
    {
        keys: getCommandKeyBinding('navigateSettings'),
        command: () => openEditorPivotItem('settings'),
        options
    },
    {
        keys: getCommandKeyBinding('toggleEditorPane'),
        command: () => toggleEditorPane(),
        options
    },
    {
        keys: getCommandKeyBinding('editorFocusOut'),
        command: () => focusFirstPivot(),
        options
    }
];

export const openEditorPivotItem = (operation: TEditorOperation) =>
    dispatchEditorPivotItem(operation);

export const openHelpSite = () => {
    const visualMetadata = getVisualMetadata(),
        { launchUrl } = getState().visual;
    launchUrl(visualMetadata.supportUrl);
};

export const repairFormatJson = () => fixAndFormat();

export const toggleAutoApply = () => {
    applyChanges();
    dispatchAutoApply();
};

export const toggleEditorPane = () => {
    applyChanges();
    dispatchEditorPaneToggle();
};

export const updateBooleanProperty = (name: string, value: boolean) =>
    handlePersist({ name: name, value: value });

export const updateProvider = (provider: TSpecProvider) =>
    handlePersist({ name: 'provider', value: provider });

export const updateRenderMode = (renderMode: TSpecRenderMode) =>
    handlePersist({ name: 'renderMode', value: renderMode });

export interface IKeyboardShortcut {
    keys: string;
    command: () => void;
    options: Options;
}
