import { createSlice } from '@reduxjs/toolkit';
import { initialState } from './state';
import * as reducers from './reducers';

const slice = createSlice({
    name: 'templates',
    initialState,
    reducers
});

export const templates = slice.reducer,
    {
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
