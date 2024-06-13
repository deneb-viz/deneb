import { getEscapedReplacerPattern } from '../fields';

describe('getEscapedReplacerPattern', () => {
    it('should escape special characters in the input string', () => {
        const input = '$ Sales.Current';
        const expectedOutput = '\\$ Sales\\.Current';
        expect(getEscapedReplacerPattern(input)).toBe(expectedOutput);
    });

    it('should leave underscores alone', () => {
        const input = 'Sales_Current';
        expect(getEscapedReplacerPattern(input)).toBe(input);
    });

    it('should return the same string if there are no special characters', () => {
        const input = 'abc123';
        expect(getEscapedReplacerPattern(input)).toBe(input);
    });
});
