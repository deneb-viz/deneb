import type { EmptyStateReason } from './empty-state-reason';

/**
 * Maps an `EmptyStateReason` to its i18n catalog key. Pure; lives in its own
 * module so tests can assert the mapping without pulling in the component's
 * React / Fluent UI / Monaco transitive graph (the workspace runs vitest in
 * `node` mode, no RTL or jsdom).
 */
export const getMessageKey = (reason: EmptyStateReason): string => {
    switch (reason) {
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
 * The `DatasetSelect` is only meaningful when a Vega view exists and a
 * different named dataset can be chosen — i.e. the `'dataset-unavailable'`
 * case. With no view (`'view-unavailable'`), the selector's options come from
 * the absent view, so picking from a stale or empty list has no actionable
 * effect; the selector is suppressed alongside source-tab and signal reasons.
 */
export const shouldEmbedDatasetSelect = (reason: EmptyStateReason): boolean =>
    reason === 'dataset-unavailable';
