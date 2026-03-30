import { describe, expect, it } from 'vitest';
import { createDefaultProvider } from '../default-provider';

describe('createDefaultProvider', () => {
    const provider = createDefaultProvider();

    describe('getFormatString', () => {
        it('should return empty string for any field and row', () => {
            expect(provider.getFormatString(0, 0)).toBe('');
            expect(provider.getFormatString(5, 100)).toBe('');
        });
    });

    describe('getFormattedValue', () => {
        it('should return the base value as-is', () => {
            expect(provider.getFormattedValue(42, '', 'en-US')).toBe(42);
            expect(provider.getFormattedValue('hello', '', 'en-US')).toBe(
                'hello'
            );
            expect(provider.getFormattedValue(null, '#,0', 'en-US')).toBe(null);
        });
    });

    describe('getHighlightValue', () => {
        it('should return the base value (no highlight data available)', () => {
            expect(provider.getHighlightValue(0, 0, 100)).toBe(100);
            expect(provider.getHighlightValue(3, 5, 'text')).toBe('text');
        });
    });
});
