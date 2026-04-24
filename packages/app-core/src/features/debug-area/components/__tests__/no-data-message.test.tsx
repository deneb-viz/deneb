import { describe, expect, it } from 'vitest';

import {
    getMessageKey,
    shouldEmbedDatasetSelect
} from '../no-data-message-utils';
import type { EmptyStateReason } from '../empty-state-reason';
import enUS from '../../../../i18n/en-US.json';

/**
 * Component-tree rendering tests are deferred in this workspace — vitest runs
 * in the `node` environment with no `@testing-library/react` available (see
 * `highlight-text.test.tsx` for the established precedent). We therefore test
 * the two pure helpers that drive every rendering decision inside
 * `<NoDataMessage>`: the i18n-key dispatch and the "does this reason embed a
 * `DatasetSelect`" predicate. Combined, they cover the full branch set the
 * component exposes.
 *
 * Each test scenario in Unit 3's brief is asserted against both helpers.
 */

describe('NoDataMessage helpers', () => {
    describe('getMessageKey', () => {
        it('maps "view-unavailable" to the data-tab view-unavailable key', () => {
            expect(getMessageKey('view-unavailable')).toBe(
                'Text_Debug_Data_View_Unavailable'
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

        it('maps "source-loading" to a distinct, transient loading key', () => {
            const loadingKey = getMessageKey('source-loading');
            expect(loadingKey).toBe('Text_Debug_Source_Loading');
            expect(loadingKey).not.toBe(getMessageKey('source-unavailable'));
        });

        it('maps "no-signals" to the signal-viewer no-signals key', () => {
            expect(getMessageKey('no-signals')).toBe(
                'Text_Debug_Signal_No_Signals'
            );
        });

        it('returns a distinct key for every EmptyStateReason value', () => {
            const reasons: EmptyStateReason[] = [
                'source-loading',
                'source-unavailable',
                'view-unavailable',
                'dataset-unavailable',
                'no-signals'
            ];
            const keys = reasons.map(getMessageKey);
            expect(new Set(keys).size).toBe(reasons.length);
        });

        it('returns keys that exist in the en-US i18n catalog', () => {
            const reasons: EmptyStateReason[] = [
                'source-loading',
                'source-unavailable',
                'view-unavailable',
                'dataset-unavailable',
                'no-signals'
            ];
            const catalog = enUS as Record<string, string>;
            for (const reason of reasons) {
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

    describe('shouldEmbedDatasetSelect', () => {
        it('returns true for "view-unavailable" (data-tab reason)', () => {
            expect(shouldEmbedDatasetSelect('view-unavailable')).toBe(true);
        });

        it('returns true for "dataset-unavailable" (data-tab reason)', () => {
            expect(shouldEmbedDatasetSelect('dataset-unavailable')).toBe(true);
        });

        it('returns false for "source-unavailable"', () => {
            expect(shouldEmbedDatasetSelect('source-unavailable')).toBe(false);
        });

        it('returns false for "source-loading"', () => {
            expect(shouldEmbedDatasetSelect('source-loading')).toBe(false);
        });

        it('returns false for "no-signals" (signal viewer no longer carries a DatasetSelect)', () => {
            expect(shouldEmbedDatasetSelect('no-signals')).toBe(false);
        });
    });
});
