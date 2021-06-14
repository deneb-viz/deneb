import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as _ from 'lodash';

import Debugger from '../Debugger';
import {
    IPlaceholderValuePayload,
    ITemplateImportPayload,
    TExportOperation,
    TTemplateProvider
} from '../types';
import { templateReducer as initialState } from '../config/templateReducer';
import {
    IDenebTemplateMetadata,
    ITemplateDatasetField
} from '../schema/template-v1';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';
import {
    getPlaceholderResolutionStatus,
    getNewExportTemplateMetadata,
    ITemplateExportFieldUpdatePayload,
    ITemplateImportErrorPayload,
    TTemplateExportState,
    TTemplateImportState
} from '../api/template';

const templateSlice = createSlice({
    name: 'templates',
    initialState,
    reducers: {
        updateSelectedDialogProvider: (
            state,
            action: PayloadAction<TTemplateProvider>
        ) => {
            state.templateProvider = action.payload;
            state.templateFile = null;
            state.templateImportState = 'None';
            state.templateImportErrorMessage = null;
            state.templateSchemaErrors = [];
            state.templateFileRawContent = null;
            switch (state.templateProvider) {
                case 'import': {
                    state.selectedTemplateIndex = null;
                    state.templateToApply = null;
                    state.allImportCriteriaApplied = false;
                    state.specProvider = null;
                    break;
                }
                default: {
                    const templateIdx = 0;
                    state.specProvider = state.templateProvider;
                    state.selectedTemplateIndex = templateIdx;
                    state.templateToApply =
                        state[state.templateProvider][templateIdx];
                    state.allImportCriteriaApplied = getPlaceholderResolutionStatus(
                        <Spec | TopLevelSpec>state.templateToApply
                    );
                }
            }
        },
        updateTemplateExportState: (
            state,
            action: PayloadAction<TTemplateExportState>
        ) => {
            state.templateExportState = action.payload;
            state.templateExportErrorMessage = null;
        },
        updateTemplateImportState: (
            state,
            action: PayloadAction<TTemplateImportState>
        ) => {
            state.templateImportState = action.payload;
        },
        templateImportError: (
            state,
            action: PayloadAction<ITemplateImportErrorPayload>
        ) => {
            state.templateImportState = 'Error';
            state.templateImportErrorMessage =
                action.payload.templateImportErrorMessage;
            state.templateSchemaErrors = action.payload.templateSchemaErrors;
        },
        templateImportSuccess: (
            state,
            action: PayloadAction<ITemplateImportPayload>
        ) => {
            state.templateImportState = 'Success';
            state.templateFile = action.payload.templateFile;
            state.templateFileRawContent =
                action.payload.templateFileRawContent;
            state.templateToApply = action.payload.templateToApply;
            state.specProvider =
                action.payload.provider ||
                (<IDenebTemplateMetadata>(
                    action.payload.templateToApply.usermeta
                )).deneb.provider;
        },
        templateExportError: (state, action: PayloadAction<string>) => {
            state.templateExportState = 'Error';
            state.templateExportErrorMessage = action.payload;
        },
        updateSelectedTemplate: (state, action: PayloadAction<number>) => {
            state.selectedTemplateIndex = action.payload;
            state.templateToApply =
                state[state.templateProvider][action.payload];
            state.allImportCriteriaApplied = getPlaceholderResolutionStatus(
                <Spec | TopLevelSpec>state.templateToApply
            );
        },
        updateSelectedExportOperation: (
            state,
            action: PayloadAction<TExportOperation>
        ) => {
            state.selectedExportOperation = action.payload;
        },
        updateExportTemplatePropertyBySelector: (
            state,
            action: PayloadAction<ITemplateExportFieldUpdatePayload>
        ) => {
            let newState = { ...state.templateExportMetadata };
            _.set(newState, action.payload.selector, action.payload.value);
            state.templateExportMetadata = { ...newState };
        },
        newExportTemplateMetadata: (state, action) => {
            state.templateExportMetadata = getNewExportTemplateMetadata();
        },
        syncExportTemplateDataset: (
            state,
            action: PayloadAction<ITemplateDatasetField[]>
        ) => {
            let newState = action.payload.map((d) => {
                let match = state.templateExportMetadata.dataset.find(
                    (ds) => ds.key === d.key
                );
                if (match) {
                    return {
                        ...match,
                        ...{
                            name: d.name,
                            namePlaceholder: d.namePlaceholder
                        }
                    };
                }
                return d;
            });
            state.templateExportMetadata.dataset = [...newState];
        },
        patchTemplatePlaceholder: (
            state,
            action: PayloadAction<IPlaceholderValuePayload>
        ) => {
            Debugger.log('Updating template placeholder.', action.payload);
            const pl = action.payload,
                phIdx = (<IDenebTemplateMetadata>(
                    state.templateToApply?.usermeta
                ))?.dataset.findIndex((ph) => ph.key === pl.key);
            if (phIdx > -1) {
                (<IDenebTemplateMetadata>(
                    state.templateToApply?.usermeta
                )).dataset[phIdx].suppliedObjectName = pl.objectName;
            }
            state.allImportCriteriaApplied = getPlaceholderResolutionStatus(
                <Spec | TopLevelSpec>state.templateToApply
            );
        }
    }
});

const templateReducer = templateSlice.reducer;

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
    updateExportTemplatePropertyBySelector
} = templateSlice.actions;

export default templateReducer;
