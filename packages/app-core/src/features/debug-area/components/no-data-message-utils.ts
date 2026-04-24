import type { EmptyStateReason } from './empty-state-reason';

/**
 * Maps an `EmptyStateReason` to its i18n catalog key. Pure; lives in its own
 * module so tests can assert the mapping without pulling in the component's
 * React / Fluent UI / Monaco transitive graph (the workspace runs vitest in
 * `node` mode, no RTL or jsdom).
 */
export const getMessageKey = (reason: EmptyStateReason): string => {
    switch (reason) {
        case 'source-loading':
            return 'Text_Debug_Source_Loading';
        case 'source-unavailable':
            return 'Text_Debug_Source_No_Data';
        case 'view-unavailable':
            return 'Text_Debug_Data_View_Unavailable';
        case 'dataset-unavailable':
            return 'Text_Debug_Data_Dataset_Unavailable';
        case 'no-signals':
            return 'Text_Debug_Signal_No_Signals';
    }
};

/**
 * Data-tab reasons embed a `DatasetSelect` in the status bar so the user can
 * pick a different named dataset from the Vega view without leaving the empty
 * state. Source-tab and signal reasons do not — no selector is meaningful in
 * those contexts.
 */
export const shouldEmbedDatasetSelect = (reason: EmptyStateReason): boolean =>
    reason === 'view-unavailable' || reason === 'dataset-unavailable';
