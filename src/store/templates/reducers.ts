import { WritableDraft } from 'immer/dist/internal';
import { PayloadAction } from '@reduxjs/toolkit';
import set from 'lodash/set';

import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';

import {
    ITemplateSliceState,
    IPlaceholderValuePayload,
    ITemplateImportErrorPayload,
    ITemplateExportFieldUpdatePayload,
    ITemplateImportPayload
} from './state';
import templates from '../../templates';
import {
    getNewExportTemplateMetadata,
    getPlaceholderResolutionStatus
} from '../../core/template';
import {
    IDenebTemplateMetadata,
    ITemplateDatasetField
} from '../../core/template/schema';
import {
    TExportOperation,
    TTemplateExportState,
    TTemplateImportState,
    TTemplateProvider
} from '../../core/template';

export const initializeImportExport = (
    state: WritableDraft<ITemplateSliceState>
) => {
    state.allImportCriteriaApplied = getPlaceholderResolutionStatus(
        templates.vegaLite[0]
    );
    state.templateExportMetadata = getNewExportTemplateMetadata();
};

export const updateSelectedDialogProvider = (
    state: WritableDraft<ITemplateSliceState>,
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
            state.templateToApply = state[state.templateProvider][templateIdx];
            state.allImportCriteriaApplied = getPlaceholderResolutionStatus(
                <Spec | TopLevelSpec>state.templateToApply
            );
        }
    }
};

export const updateTemplateExportState = (
    state: WritableDraft<ITemplateSliceState>,
    action: PayloadAction<TTemplateExportState>
) => {
    state.templateExportState = action.payload;
    state.templateExportErrorMessage = null;
};

export const updateTemplateImportState = (
    state: WritableDraft<ITemplateSliceState>,
    action: PayloadAction<TTemplateImportState>
) => {
    state.templateImportState = action.payload;
};

export const templateImportError = (
    state: WritableDraft<ITemplateSliceState>,
    action: PayloadAction<ITemplateImportErrorPayload>
) => {
    state.templateImportState = 'Error';
    state.templateImportErrorMessage =
        action.payload.templateImportErrorMessage;
    state.templateSchemaErrors = action.payload.templateSchemaErrors;
};

export const templateImportSuccess = (
    state: WritableDraft<ITemplateSliceState>,
    action: PayloadAction<ITemplateImportPayload>
) => {
    state.templateImportState = 'Success';
    state.templateFile = action.payload.templateFile;
    state.templateFileRawContent = action.payload.templateFileRawContent;
    state.templateToApply = action.payload.templateToApply;
    state.specProvider =
        action.payload.provider ||
        (<IDenebTemplateMetadata>action.payload.templateToApply.usermeta).deneb
            .provider;
};

export const templateExportError = (
    state: WritableDraft<ITemplateSliceState>,
    action: PayloadAction<string>
) => {
    state.templateExportState = 'Error';
    state.templateExportErrorMessage = action.payload;
};

export const updateSelectedTemplate = (
    state: WritableDraft<ITemplateSliceState>,
    action: PayloadAction<number>
) => {
    state.selectedTemplateIndex = action.payload;
    state.templateToApply = state[state.templateProvider][action.payload];
    state.allImportCriteriaApplied = getPlaceholderResolutionStatus(
        <Spec | TopLevelSpec>state.templateToApply
    );
};

export const updateSelectedExportOperation = (
    state: WritableDraft<ITemplateSliceState>,
    action: PayloadAction<TExportOperation>
) => {
    state.selectedExportOperation = action.payload;
};

export const updateExportTemplatePropertyBySelector = (
    state: WritableDraft<ITemplateSliceState>,
    action: PayloadAction<ITemplateExportFieldUpdatePayload>
) => {
    let newState = { ...state.templateExportMetadata };
    set(newState, action.payload.selector, action.payload.value);
    state.templateExportMetadata = { ...newState };
};

export const newExportTemplateMetadata = (
    state: WritableDraft<ITemplateSliceState>,
    action
) => {
    state.templateExportMetadata = getNewExportTemplateMetadata();
};

export const syncExportTemplateDataset = (
    state: WritableDraft<ITemplateSliceState>,
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
};

export const patchTemplatePlaceholder = (
    state: WritableDraft<ITemplateSliceState>,
    action: PayloadAction<IPlaceholderValuePayload>
) => {
    const pl = action.payload,
        phIdx = (<IDenebTemplateMetadata>(
            state.templateToApply?.usermeta
        ))?.dataset.findIndex((ph) => ph.key === pl.key);
    if (phIdx > -1) {
        (<IDenebTemplateMetadata>state.templateToApply?.usermeta).dataset[
            phIdx
        ].suppliedObjectName = pl.objectName;
    }
    state.allImportCriteriaApplied = getPlaceholderResolutionStatus(
        <Spec | TopLevelSpec>state.templateToApply
    );
};
