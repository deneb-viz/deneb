import { describe, expect, it } from 'vitest';

import {
    getMessageKey,
    getMessageTokens,
    shouldEmbedDatasetSelect
} from '../no-data-message-utils';
import type { EmptyStateReason } from '../empty-state-reason';
import enUS from '../../../../i18n/en-US.json';

/**
 * Component-tree rendering tests are deferred in this workspace — vitest runs
 * in the `node` environment with no `@testing-library/react` available (see
 * `highlight-text.test.tsx` for the established precedent). We therefore test
 * the three pure helpers that drive every rendering decision inside
 * `<NoDataMessage>`: the i18n-key dispatch, the token-substitution contract,
 * and the "does this reason embed a `DatasetSelect`" predicate. Combined,
 * they cover the full branch set the component exposes.
 */

const ALL_REASONS: EmptyStateReason[] = [
    'source-unavailable',
    'view-unavailable',
    'no-datasets',
    'dataset-unavailable',
    'no-signals'
];

describe('NoDataMessage helpers', () => {
    describe('getMessageKey', () => {
        it('maps "view-unavailable" to the data-tab view-unavailable key', () => {
            expect(getMessageKey('view-unavailable')).toBe(
                'Text_Debug_Data_View_Unavailable'
            );
        });

        it('maps "no-datasets" to the data-tab no-datasets-in-view key', () => {
            expect(getMessageKey('no-datasets')).toBe(
                'Text_Debug_Data_No_Datasets_In_View'
            );
        });

        it('maps "dataset-unavailable" to the data-tab dataset-unavailable key', () => {
            expect(getMessageKey('dataset-unavailable')).toBe(
                'Text_Debug_Data_Dataset_Unavailable'
            );
        });

        it('maps "source-unavailable" to the source no-data key', () => {
            expect(getMessageKey('source-unavailable')).toBe(
                'Text_Debug_Source_No_Data'
            );
        });

        it('maps "no-signals" to the signal-viewer no-signals key', () => {
            expect(getMessageKey('no-signals')).toBe(
                'Text_Debug_Signal_No_Signals'
            );
        });

        it('returns a distinct key for every EmptyStateReason value', () => {
            const keys = ALL_REASONS.map(getMessageKey);
            expect(new Set(keys).size).toBe(ALL_REASONS.length);
        });

        it('returns keys that exist in the en-US i18n catalog', () => {
            const catalog = enUS as Record<string, string>;
            for (const reason of ALL_REASONS) {
                const key = getMessageKey(reason);
                expect(
                    catalog[key],
                    `catalog entry missing for "${key}" (reason "${reason}")`
                ).toBeTruthy();
            }
        });

        it('leaves legacy keys orphaned but present in the catalog', () => {
            const catalog = enUS as Record<string, string>;
            expect(catalog['Text_Debug_Data_No_Data']).toBeTruthy();
            expect(catalog['Text_Debug_Signal_No_Data']).toBeTruthy();
        });
    });

    describe('getMessageTokens', () => {
        it('returns [datasetName] for "dataset-unavailable" so {0} is substituted into the copy', () => {
            expect(getMessageTokens('dataset-unavailable', 'myData')).toEqual([
                'myData'
            ]);
        });

        it('passes through an empty datasetName verbatim for "dataset-unavailable" (transient state during view replacement)', () => {
            expect(getMessageTokens('dataset-unavailable', '')).toEqual(['']);
        });

        it.each([
            'source-unavailable',
            'view-unavailable',
            'no-datasets',
            'no-signals'
        ] as const)(
            'returns no tokens for "%s" (static copy, no placeholders)',
            (reason) => {
                expect(getMessageTokens(reason, 'irrelevant')).toEqual([]);
            }
        );

        it('the dataset-unavailable catalog entry actually contains the {0} placeholder the helper feeds', () => {
            const catalog = enUS as Record<string, string>;
            expect(catalog['Text_Debug_Data_Dataset_Unavailable']).toContain(
                '{0}'
            );
        });

        it('catalog entries for token-less reasons contain no positional placeholders', () => {
            const catalog = enUS as Record<string, string>;
            const tokenless: EmptyStateReason[] = [
                'source-unavailable',
                'view-unavailable',
                'no-datasets',
                'no-signals'
            ];
            for (const reason of tokenless) {
                const value = catalog[getMessageKey(reason)];
                expect(
                    value,
                    `catalog entry for "${reason}" should not contain {N} placeholders`
                ).not.toMatch(/\{\d+\}/);
            }
        });
    });

    describe('shouldEmbedDatasetSelect', () => {
        it('returns false for "view-unavailable" (no view = stale/empty selector options)', () => {
            expect(shouldEmbedDatasetSelect('view-unavailable')).toBe(false);
        });

        it('returns false for "no-datasets" (view live but nothing to pick from — selector would render zero options)', () => {
            expect(shouldEmbedDatasetSelect('no-datasets')).toBe(false);
        });

        it('returns true for "dataset-unavailable" (view live, datasets present; user can pick a valid name)', () => {
            expect(shouldEmbedDatasetSelect('dataset-unavailable')).toBe(true);
        });

        it('returns false for "source-unavailable"', () => {
            expect(shouldEmbedDatasetSelect('source-unavailable')).toBe(false);
        });

        it('returns false for "no-signals" (signal viewer no longer carries a DatasetSelect)', () => {
            expect(shouldEmbedDatasetSelect('no-signals')).toBe(false);
        });

        it('returns true for exactly one reason — locks in that only dataset-unavailable embeds the selector, so a future EmptyStateReason addition cannot silently flip the predicate', () => {
            const embedding = ALL_REASONS.filter(shouldEmbedDatasetSelect);
            expect(embedding).toEqual(['dataset-unavailable']);
        });
    });
});
