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
const getValueFormatter = vi.fn(() => ({
    format: vi.fn((v: unknown) => `f(${v})`)
}));
vi.mock('@deneb-viz/powerbi-compat/formatting', () => ({
    getValueFormatter: (format?: string, options?: unknown) =>
        getValueFormatter(format, options),
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

// Formatting-string branch: default off for the highlight fixtures, toggled on
// for the formatter-reuse tests.
const isFieldEligibleForFormatting = vi.fn((_v: unknown) => false);
vi.mock('../fields', () => ({
    isFieldEligibleForFormatting: (v: unknown) =>
        isFieldEligibleForFormatting(v)
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

const colFmt = (values: unknown[], format: string) =>
    ({ values, source: { format } }) as unknown as powerbi.DataViewValueColumn;

describe('getDatumValueEntriesFromDataview — mixed highlights (M9)', () => {
    beforeEach(() => {
        isCrossHighlightPropSet.mockReturnValue(false);
        doesDataViewHaveHighlights.mockReturnValue(true);
        isFieldEligibleForFormatting.mockReturnValue(false);
    });

    it('falls back to a column’s own values when it has no highlights (auto-substitution path)', () => {
        // Column A carries highlights, column B does not — the exact mixed
        // dataview that produced `undefined` entries and dropped the dataset.
        const values = cols(col([10, 20], [10, null]), col([30, 40]));

        const entries = getDatumValueEntriesFromDataview([], values);

        expect(entries.every((e) => Array.isArray(e))).toBe(true);
        expect(entries).toContainEqual([30, 40]);
    });

    it('falls back per-column on the cross-highlight path too', () => {
        isCrossHighlightPropSet.mockReturnValue(true);
        const values = cols(col([10, 20], [10, null]), col([30, 40]));

        const entries = getDatumValueEntriesFromDataview([], values);

        expect(entries.every((e) => Array.isArray(e))).toBe(true);
    });

    it('is unchanged for an all-values (no-highlight) dataview', () => {
        doesDataViewHaveHighlights.mockReturnValue(false);
        const values = cols(col([10, 20]), col([30, 40]));

        const entries = getDatumValueEntriesFromDataview([], values);

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

describe('getFormattingStringValueEntries — parity placeholders (perf)', () => {
    beforeEach(() => {
        isCrossHighlightPropSet.mockReturnValue(false);
        doesDataViewHaveHighlights.mockReturnValue(false);
        isFieldEligibleForFormatting.mockReturnValue(true);
        getValueFormatter.mockClear();
    });

    it('emits two parity slots per eligible measure without constructing a formatter', () => {
        const values = cols(colFmt([1, 2, 3, 4], '#,##0'));

        const entries = getDatumValueEntriesFromDataview([], values);

        // One measure value entry + two formatting-parity slots = 3 entries.
        // Index parity with the columns array is preserved.
        expect(entries).toHaveLength(3);
        // The measure section is unchanged (raw value array passes through).
        expect(entries[0]).toEqual([1, 2, 3, 4]);
        // Every entry is an array — the row builder never faults on undefined.
        expect(entries.every((e) => Array.isArray(e))).toBe(true);
        // The discarded formatted-value computation is gone: no Power BI value
        // formatter is constructed during value-entry extraction.
        expect(getValueFormatter).not.toHaveBeenCalled();
    });

    it('emits two parity slots for each of several eligible measures', () => {
        const values = cols(colFmt([1, 2], '#,##0'), colFmt([3, 4], '0.00'));

        const entries = getDatumValueEntriesFromDataview([], values);

        // 2 measure entries + 2 × 2 formatting-parity slots.
        expect(entries).toHaveLength(6);
        expect(getValueFormatter).not.toHaveBeenCalled();
    });

    it('emits no formatting slots when no measure is eligible for formatting', () => {
        isFieldEligibleForFormatting.mockReturnValue(false);
        const values = cols(colFmt([1, 2], '#,##0'));

        const entries = getDatumValueEntriesFromDataview([], values);

        // Just the single measure entry, no formatting slots.
        expect(entries).toHaveLength(1);
        expect(getValueFormatter).not.toHaveBeenCalled();
    });
});
