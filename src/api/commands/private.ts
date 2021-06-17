import {
    toggleAutoApply,
    toggleEditorPane,
    fourd3d3d,
    updateExportDialog,
    updateSelectedOperation
} from '../../store/visualReducer';
import { updateSelectedTemplate } from '../../store/templateReducer';

import {
    resolveObjectProperties,
    updateObjectProperties,
    IPersistenceProperty
} from '../properties/public';
import { getStore } from '../store/public';
import { TEditorOperation } from '../../types';

export const dispatchAutoApply = () => {
    getStore().dispatch(toggleAutoApply());
};

export const dispatchDefaultTemplate = () => {
    getStore().dispatch(updateSelectedTemplate(0));
};

export const dispatchEditorPivotItem = (operation: TEditorOperation) => {
    getStore().dispatch(updateSelectedOperation(operation));
};

export const dispatchEditorPaneToggle = () => {
    getStore().dispatch(toggleEditorPane());
};

export const dispatchExportDialog = (show = true) => {
    getStore().dispatch(updateExportDialog(show));
};

export const dispatchFourd3d3d = () => {
    getStore().dispatch(fourd3d3d(true));
};

export const handlePersist = (property: IPersistenceProperty) =>
    updateObjectProperties(resolveObjectProperties('vega', [property]));
