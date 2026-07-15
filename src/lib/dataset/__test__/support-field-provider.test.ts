// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('powerbi-visuals-api', () => ({}));

// The provider now creates ONE Power BI value formatter per (locale, format
// string) pair and reuses it, so spy on the formatter FACTORY (getValueFormatter)
// rather than the per-call getFormattedValue convenience wrapper it replaced.
// The returned formatter echoes its construction args so output can be pinned.
const getValueFormatter = vi.fn(
    (format?: string, options?: { cultureSelector?: string }) => ({
        format: (value: unknown) =>
            `[${options?.cultureSelector}|${format}|${value}]`
    })
);
vi.mock('@deneb-viz/powerbi-compat/formatting', () => ({
    getValueFormatter: (format?: string, options?: unknown) =>
        getValueFormatter(format, options)
}));

import {
    createPbiSupportFieldProvider,
    type CreatePbiProviderParams
} from '../support-field-provider';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const makeValueColumn = (
    overrides: Partial<{
        sourceFormat: string | undefined;
        objectsFormatString: string | undefined;
        highlights: (number | null)[] | null;
    }> = {}
) => ({
    source: {
        format: overrides.sourceFormat
    },
    objects:
        overrides.objectsFormatString !== undefined
            ? [{ general: { formatString: overrides.objectsFormatString } }]
            : undefined,
    highlights: overrides.highlights ?? null
});

const makeParams = (
    overrides: Partial<CreatePbiProviderParams> = {}
): CreatePbiProviderParams => ({
    categories: undefined,
    values: undefined,
    hasHighlights: false,
    fieldSourceMappings: [],
    ...overrides
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createPbiSupportFieldProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getFormatString', () => {
        it('should return column-level format string when available on source', () => {
            const col = makeValueColumn({ sourceFormat: '#,##0.00' });
            const params = makeParams({
                values: [col] as unknown as powerbi.DataViewValueColumns,
                fieldSourceMappings: [{ source: 'values', index: 0 }]
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getFormatString(0, 0)).toBe('#,##0.00');
        });

        it('should fall back to row-level format string from objects when source format is absent', () => {
            const col = makeValueColumn({
                sourceFormat: undefined,
                objectsFormatString: '$#,##0'
            });
            const params = makeParams({
                values: [col] as unknown as powerbi.DataViewValueColumns,
                fieldSourceMappings: [{ source: 'values', index: 0 }]
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getFormatString(0, 0)).toBe('$#,##0');
        });

        it('should return empty string when no format string is available', () => {
            const col = makeValueColumn({
                sourceFormat: undefined,
                objectsFormatString: undefined
            });
            const params = makeParams({
                values: [col] as unknown as powerbi.DataViewValueColumns,
                fieldSourceMappings: [{ source: 'values', index: 0 }]
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getFormatString(0, 0)).toBe('');
        });

        it('should return empty string when values is undefined', () => {
            const params = makeParams({ values: undefined });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getFormatString(0, 0)).toBe('');
        });

        it('should return empty string when fieldIndex is out of bounds', () => {
            const col = makeValueColumn({ sourceFormat: '#,##0' });
            const params = makeParams({
                values: [col] as unknown as powerbi.DataViewValueColumns,
                fieldSourceMappings: [{ source: 'values', index: 0 }]
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getFormatString(99, 0)).toBe('');
        });

        it('should return category format string for category-mapped field', () => {
            const params = makeParams({
                categories: [
                    { source: { format: 'yyyy-MM-dd' } }
                ] as unknown as powerbi.DataViewCategoryColumn[],
                fieldSourceMappings: [{ source: 'categories', index: 0 }]
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getFormatString(0, 0)).toBe('yyyy-MM-dd');
        });
    });

    describe('getFormattedValue', () => {
        it('should construct a formatter for the format string + locale and format the value', () => {
            const provider = createPbiSupportFieldProvider(makeParams());
            const result = provider.getFormattedValue(
                1234.56,
                '#,##0.00',
                'en-US'
            );
            expect(getValueFormatter).toHaveBeenCalledWith('#,##0.00', {
                cultureSelector: 'en-US'
            });
            expect(result).toBe('[en-US|#,##0.00|1234.56]');
        });

        it('should construct ONE formatter for repeated calls with the same format string', () => {
            const provider = createPbiSupportFieldProvider(makeParams());
            for (let i = 0; i < 5; i++) {
                provider.getFormattedValue(i, '#,##0.00', 'en-US');
            }
            expect(getValueFormatter).toHaveBeenCalledTimes(1);
        });

        it('should construct a distinct formatter per distinct format string', () => {
            const provider = createPbiSupportFieldProvider(makeParams());
            provider.getFormattedValue(1, '#,##0.00', 'en-US');
            provider.getFormattedValue(2, '0%', 'en-US');
            provider.getFormattedValue(3, '#,##0.00', 'en-US');
            // Two distinct strings across three calls → two formatters.
            expect(getValueFormatter).toHaveBeenCalledTimes(2);
        });

        it('should key the cache on locale as well as format string', () => {
            const provider = createPbiSupportFieldProvider(makeParams());
            provider.getFormattedValue(1, '#,##0.00', 'en-US');
            provider.getFormattedValue(2, '#,##0.00', 'de-DE');
            // Same format string, different locale → two formatters.
            expect(getValueFormatter).toHaveBeenCalledTimes(2);
        });

        it('should preserve the empty-format-string semantics (missing format string)', () => {
            const provider = createPbiSupportFieldProvider(makeParams());
            const result = provider.getFormattedValue(42, '', 'de-DE');
            expect(getValueFormatter).toHaveBeenCalledWith('', {
                cultureSelector: 'de-DE'
            });
            expect(result).toBe('[de-DE||42]');
        });

        it('should not share a formatter cache across separate providers', () => {
            const a = createPbiSupportFieldProvider(makeParams());
            const b = createPbiSupportFieldProvider(makeParams());
            a.getFormattedValue(1, '#,##0.00', 'en-US');
            b.getFormattedValue(2, '#,##0.00', 'en-US');
            // Cache lifetime is per-provider (per getMappedDataset call).
            expect(getValueFormatter).toHaveBeenCalledTimes(2);
        });
    });

    describe('getHighlightValue', () => {
        it('should return the highlight value from the column when highlights exist', () => {
            const col = makeValueColumn({ highlights: [null, 75, 50] });
            const params = makeParams({
                hasHighlights: true,
                values: [col] as unknown as powerbi.DataViewValueColumns,
                fieldSourceMappings: [{ source: 'values', index: 0 }]
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getHighlightValue(0, 1, 100)).toBe(75);
        });

        it('should return null highlight value (not baseValue) when the highlight is null', () => {
            const col = makeValueColumn({ highlights: [null, 75, 50] });
            const params = makeParams({
                hasHighlights: true,
                values: [col] as unknown as powerbi.DataViewValueColumns,
                fieldSourceMappings: [{ source: 'values', index: 0 }]
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getHighlightValue(0, 0, 100)).toBeNull();
        });

        it('should return baseValue when hasHighlights is false', () => {
            const col = makeValueColumn({ highlights: [75] });
            const params = makeParams({
                hasHighlights: false,
                values: [col] as unknown as powerbi.DataViewValueColumns
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getHighlightValue(0, 0, 100)).toBe(100);
        });

        it('should return baseValue when column has no highlights array', () => {
            const col = makeValueColumn({ highlights: null });
            const params = makeParams({
                hasHighlights: true,
                values: [col] as unknown as powerbi.DataViewValueColumns,
                fieldSourceMappings: [{ source: 'values', index: 0 }]
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getHighlightValue(0, 0, 100)).toBe(100);
        });

        it('should return baseValue when values is undefined', () => {
            const params = makeParams({
                hasHighlights: true,
                values: undefined,
                fieldSourceMappings: [{ source: 'values', index: 0 }]
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getHighlightValue(0, 0, 42)).toBe(42);
        });
    });
});
