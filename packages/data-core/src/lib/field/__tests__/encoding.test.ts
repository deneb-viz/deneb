import { describe, expect, it } from 'vitest';
import { getEncodedFieldName } from '../encoding';

describe('getEncodedFieldName', () => {
    it('returns the original name when no reserved characters are present', () => {
        expect(getEncodedFieldName('Sales')).toBe('Sales');
    });

    it('replaces dots with underscores', () => {
        expect(getEncodedFieldName('Date.Year')).toBe('Date_Year');
    });

    it('replaces backslashes with underscores', () => {
        expect(getEncodedFieldName('Path\\Name')).toBe('Path_Name');
    });

    it('replaces double quotes with underscores', () => {
        expect(getEncodedFieldName('Field"Name')).toBe('Field_Name');
    });

    it('replaces square brackets with underscores', () => {
        expect(getEncodedFieldName('Field[0]')).toBe('Field_0_');
    });

    it('replaces multiple reserved characters in a single name', () => {
        expect(getEncodedFieldName('Table.Field[0]."Value"')).toBe(
            'Table_Field_0___Value_'
        );
    });

    it('returns an empty string for undefined input', () => {
        expect(getEncodedFieldName(undefined as unknown as string)).toBe('');
    });

    it('returns an empty string for an empty string input', () => {
        expect(getEncodedFieldName('')).toBe('');
    });
});
