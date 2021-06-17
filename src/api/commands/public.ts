import { TEditorOperation, TModalDialogType } from '../../types';

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

export const fourd3d3d = () => dispatchFourd3d3d();

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
