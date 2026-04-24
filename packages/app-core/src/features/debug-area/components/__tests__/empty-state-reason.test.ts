import { describe, expect, it } from 'vitest';

import type { EmptyStateReason } from '../empty-state-reason';

/**
 * These tests assert the exact string values of `EmptyStateReason`. The
 * reasons double as lookup keys for i18n dispatch in `NoDataMessage`, so a
 * silent rename would desync the enum from the copy map without a compile
 * error.
 */
describe('EmptyStateReason', () => {
    it('"source-unavailable" is a valid reason value', () => {
        const value: EmptyStateReason = 'source-unavailable';
        expect(value).toBe('source-unavailable');
    });

    it('"view-unavailable" is a valid reason value', () => {
        const value: EmptyStateReason = 'view-unavailable';
        expect(value).toBe('view-unavailable');
    });

    it('"dataset-unavailable" is a valid reason value', () => {
        const value: EmptyStateReason = 'dataset-unavailable';
        expect(value).toBe('dataset-unavailable');
    });

    it('"no-signals" is a valid reason value', () => {
        const value: EmptyStateReason = 'no-signals';
        expect(value).toBe('no-signals');
    });
});
