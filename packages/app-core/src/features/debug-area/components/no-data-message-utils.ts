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
        case 'no-datasets':
            return 'Text_Debug_Data_No_Datasets_In_View';
        case 'dataset-unavailable':
            return 'Text_Debug_Data_Dataset_Unavailable';
        case 'no-signals':
            return 'Text_Debug_Signal_No_Signals';
        default: {
            // Exhaustiveness gate: tsconfig has `strict: true` but no
            // `noImplicitReturns`, so without this default a future
            // `EmptyStateReason` member missing a case would silently return
            // undefined typed as `string`. Assigning `reason` to `never`
            // turns that into a compile error.
            const _exhaustive: never = reason;
            return _exhaustive;
        }
    }
};

/**
 * Resolves the positional tokens passed to `translate(key, tokens)` for a
 * given reason. Only `'dataset-unavailable'` carries a token today (the
 * dataset name that resolved to undefined); every other reason is a static
 * string. Kept pure so the substitution contract is exercised in tests
 * without rendering the component.
 */
export const getMessageTokens = (
    reason: EmptyStateReason,
    datasetName: string
): string[] => {
    switch (reason) {
        case 'dataset-unavailable':
            return [datasetName];
        case 'source-unavailable':
        case 'view-unavailable':
        case 'no-datasets':
        case 'no-signals':
            return [];
        default: {
            // Exhaustiveness gate (see getMessageKey).
            const _exhaustive: never = reason;
            return _exhaustive;
        }
    }
};

/**
 * The `DatasetSelect` is only meaningful when a Vega view exists *and* it
 * exposes at least one addressable dataset that the user could switch to —
 * i.e. the `'dataset-unavailable'` case. With no view (`'view-unavailable'`)
 * the selector's options come from the absent view; with no addressable
 * datasets (`'no-datasets'`) there is literally nothing to pick. The selector
 * is suppressed in both, alongside source-tab and signal reasons.
 */
export const shouldEmbedDatasetSelect = (reason: EmptyStateReason): boolean =>
    reason === 'dataset-unavailable';
