import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import Debugger from '../Debugger';
import { templateService } from '../services';
import { IPlaceholderValuePayload, TSpecProvider } from '../types';
import { templateReducer as initialState } from '../config/templateReducer';

const templateSlice = createSlice({
    name: 'templates',
    initialState,
    reducers: {
        updateSelectedDialogProvider: (
            state,
            action: PayloadAction<TSpecProvider>
        ) => {
            const templateIdx = 0;
            state.selectedProvider = action.payload;
            state.selectedTemplateIndex = templateIdx;
            state.templateToApply = state[state.selectedProvider][templateIdx];
            state.allPlaceholdersSupplied = templateService.getPlaceholderResolutionStatus(
                state.templateToApply
            );
        },
        updateSelectedTemplate: (state, action: PayloadAction<number>) => {
            state.selectedTemplateIndex = action.payload;
            state.templateToApply =
                state[state.selectedProvider][action.payload];
            state.allPlaceholdersSupplied = templateService.getPlaceholderResolutionStatus(
                state.templateToApply
            );
        },
        patchTemplatePlaceholder: (
            state,
            action: PayloadAction<IPlaceholderValuePayload>
        ) => {
            Debugger.log('Updating template placeholder.', action.payload);
            const pl = action.payload,
                phIdx = state.templateToApply?.placeholders.findIndex(
                    (ph) => ph.key === pl.key
                );
            if (phIdx > -1) {
                state.templateToApply.placeholders[phIdx].suppliedObjectName =
                    pl.objectName;
            }
            state.allPlaceholdersSupplied = templateService.getPlaceholderResolutionStatus(
                state.templateToApply
            );
        }
    }
});

const templateReducer = templateSlice.reducer;

export const {
    patchTemplatePlaceholder,
    updateSelectedDialogProvider,
    updateSelectedTemplate
} = templateSlice.actions;

export default templateReducer;
