// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('powerbi-visuals-api', () => ({}));

vi.mock('@deneb-viz/powerbi-compat/formatting', () => ({
    getFormattedValue: vi.fn()
}));

import { getFormattedValue } from '@deneb-viz/powerbi-compat/formatting';
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
    locale: 'en-US',
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
                values: [col] as unknown as powerbi.DataViewValueColumns
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
                values: [col] as unknown as powerbi.DataViewValueColumns
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
                values: [col] as unknown as powerbi.DataViewValueColumns
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
                values: [col] as unknown as powerbi.DataViewValueColumns
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getFormatString(99, 0)).toBe('');
        });
    });

    describe('getFormattedValue', () => {
        it('should delegate to powerbi-compat getFormattedValue with cultureSelector', () => {
            vi.mocked(getFormattedValue).mockReturnValue('1,234.56');
            const params = makeParams({ locale: 'en-US' });
            const provider = createPbiSupportFieldProvider(params);
            const result = provider.getFormattedValue(
                1234.56,
                '#,##0.00',
                'en-US'
            );
            expect(getFormattedValue).toHaveBeenCalledWith(
                1234.56,
                '#,##0.00',
                { cultureSelector: 'en-US' }
            );
            expect(result).toBe('1,234.56');
        });

        it('should pass empty format string through to powerbi-compat', () => {
            vi.mocked(getFormattedValue).mockReturnValue('42');
            const params = makeParams();
            const provider = createPbiSupportFieldProvider(params);
            provider.getFormattedValue(42, '', 'de-DE');
            expect(getFormattedValue).toHaveBeenCalledWith(42, '', {
                cultureSelector: 'de-DE'
            });
        });
    });

    describe('getHighlightValue', () => {
        it('should return the highlight value from the column when highlights exist', () => {
            const col = makeValueColumn({ highlights: [null, 75, 50] });
            const params = makeParams({
                hasHighlights: true,
                values: [col] as unknown as powerbi.DataViewValueColumns
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getHighlightValue(0, 1, 100)).toBe(75);
        });

        it('should return null highlight value (not baseValue) when the highlight is null', () => {
            const col = makeValueColumn({ highlights: [null, 75, 50] });
            const params = makeParams({
                hasHighlights: true,
                values: [col] as unknown as powerbi.DataViewValueColumns
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
                values: [col] as unknown as powerbi.DataViewValueColumns
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getHighlightValue(0, 0, 100)).toBe(100);
        });

        it('should return baseValue when values is undefined', () => {
            const params = makeParams({
                hasHighlights: true,
                values: undefined
            });
            const provider = createPbiSupportFieldProvider(params);
            expect(provider.getHighlightValue(0, 0, 42)).toBe(42);
        });
    });
});
