import { createSlice } from '@reduxjs/toolkit';
import { initialState } from './state';
import * as reducers from './reducers';

const slice = createSlice({
        name: 'templates',
        initialState,
        reducers
    }),
    zoomReducer = slice.reducer;

export const {
    newExportTemplateMetadata,
    syncExportTemplateDataset,
    patchTemplatePlaceholder,
    templateExportError,
    templateImportError,
    templateImportSuccess,
    updateSelectedDialogProvider,
    updateSelectedExportOperation,
    updateSelectedTemplate,
    updateTemplateExportState,
    updateTemplateImportState,
    updateExportTemplatePropertyBySelector,
    initializeImportExport
} = slice.actions;

export default zoomReducer;
