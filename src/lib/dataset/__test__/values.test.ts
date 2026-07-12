// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type powerbi from 'powerbi-visuals-api';

// values.ts transitively pulls the Power BI runtime graph (logging,
// powerbi-compat formatting, the interactivity barrel). Stub those so the unit
// under test loads without standing up the visual (handoff fact #10 — the
// interactivity barrel + powerbi-compat/formatting reach the extensionless
// powerbi-visuals-utils-typeutils ESM that CI's Node rejects).
vi.mock('@deneb-viz/utils/logging', () => ({
    logTimeStart: vi.fn(),
    logTimeEnd: vi.fn()
}));
vi.mock('powerbi-visuals-api', () => ({}));
vi.mock('@deneb-viz/powerbi-compat/formatting', () => ({
    getFormattedValue: vi.fn((v) => v)
}));

const isCrossHighlightPropSet = vi.fn(() => false);
vi.mock('../../interactivity', () => ({
    isCrossHighlightPropSet: () => isCrossHighlightPropSet()
}));

const doesDataViewHaveHighlights = vi.fn(() => true);
vi.mock('../data-view', () => ({
    doesDataViewHaveHighlights: () => doesDataViewHaveHighlights()
}));

// Keep the formatting-string branch out of these fixtures.
vi.mock('../fields', () => ({
    isFieldEligibleForFormatting: vi.fn(() => false)
}));

import {
    getCastedPrimitiveValue,
    getDatumValueEntriesFromDataview
} from '../values';
import type { AugmentedMetadataField } from '../types';

const col = (values: unknown[], highlights?: unknown[]) =>
    ({ values, highlights }) as unknown as powerbi.DataViewValueColumn;

const cols = (...columns: powerbi.DataViewValueColumn[]) =>
    columns as unknown as powerbi.DataViewValueColumns;

const cell = (v: unknown) => v as powerbi.PrimitiveValue;

describe('getDatumValueEntriesFromDataview — mixed highlights (M9)', () => {
    beforeEach(() => {
        isCrossHighlightPropSet.mockReturnValue(false);
        doesDataViewHaveHighlights.mockReturnValue(true);
    });

    it('falls back to a column’s own values when it has no highlights (auto-substitution path)', () => {
        // Column A carries highlights, column B does not — the exact mixed
        // dataview that produced `undefined` entries and dropped the dataset.
        const values = cols(col([10, 20], [10, null]), col([30, 40]));

        const entries = getDatumValueEntriesFromDataview([], values, 'en-US');

        expect(entries.every((e) => Array.isArray(e))).toBe(true);
        expect(entries).toContainEqual([30, 40]);
    });

    it('falls back per-column on the cross-highlight path too', () => {
        isCrossHighlightPropSet.mockReturnValue(true);
        const values = cols(col([10, 20], [10, null]), col([30, 40]));

        const entries = getDatumValueEntriesFromDataview([], values, 'en-US');

        expect(entries.every((e) => Array.isArray(e))).toBe(true);
    });

    it('is unchanged for an all-values (no-highlight) dataview', () => {
        doesDataViewHaveHighlights.mockReturnValue(false);
        const values = cols(col([10, 20]), col([30, 40]));

        const entries = getDatumValueEntriesFromDataview([], values, 'en-US');

        expect(entries).toEqual([
            [10, 20],
            [30, 40]
        ]);
    });
});

describe('getCastedPrimitiveValue — undefined dateTime cell (L14)', () => {
    const dateField = {
        column: { type: { dateTime: true } }
    } as unknown as AugmentedMetadataField;

    it('passes undefined through instead of producing an Invalid Date', () => {
        expect(
            getCastedPrimitiveValue(dateField, cell(undefined))
        ).toBeUndefined();
    });

    it('passes null through', () => {
        expect(getCastedPrimitiveValue(dateField, cell(null))).toBeNull();
    });

    it('still casts a real dateTime value to a valid Date', () => {
        const result = getCastedPrimitiveValue(dateField, '2020-01-01') as Date;
        expect(result instanceof Date).toBe(true);
        expect(Number.isNaN(result.getTime())).toBe(false);
    });

    it('leaves non-dateTime values untouched', () => {
        const numField = {
            column: { type: {} }
        } as unknown as AugmentedMetadataField;
        expect(getCastedPrimitiveValue(numField, 42)).toBe(42);
    });
});
