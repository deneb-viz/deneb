import { getHighlightRegExpAlternation } from '../highlight';
import {
    getEscapedReplacerPattern,
    getNumberFormatRegExpAlternation,
    getPlaceholderKey,
    getTokenPatternsLiteral,
    getTokenPatternsReplacement
} from '../tokenization';
import { describe, it, expect } from 'vitest';

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

describe('getPlaceholderKey', () => {
    it('should return a placeholder key', () => {
        expect(getPlaceholderKey(0)).toBe('__0__');
    });
    it('should return a placeholder key with positive number', () => {
        expect(getPlaceholderKey(5)).toBe('__5__');
    });
    it('should return a placeholder key with negative number', () => {
        expect(getPlaceholderKey(-3)).toBe('__3__');
    });
    it('should return a placeholder key with decimal number floored down', () => {
        expect(getPlaceholderKey(2.5)).toBe('__2__');
    });
});

describe('getTokenPatternsLiteral', () => {
    it('should return an array with the expected pattern', () => {
        const fieldName = '$ Sales';
        const result = getTokenPatternsLiteral(fieldName);
        const expectedPattern = [
            `^(\\${fieldName})(${getHighlightRegExpAlternation()})$`,
            `(?<='.*datum)(.\\${fieldName})(${getHighlightRegExpAlternation()})?(?=.*')`,
            `(?<='.*datum\\[\\\\\\')(\\${fieldName})(${getHighlightRegExpAlternation()})?(?=\\\\\\'\\].*')`,
            `(?<=datum\\[\\\\")(\\${fieldName})(${getHighlightRegExpAlternation()})?(?=\\\\"\\])`,
            `(?<=datum)(.\\${fieldName})(${getHighlightRegExpAlternation()})?(?=)`,
            `(?<=datum\\[')(\\${fieldName})(${getHighlightRegExpAlternation()})?(?='\\])`,
            `(?<=datum\\[")(\\${fieldName})(${getHighlightRegExpAlternation()})?(?="\\])`,
            `(?<=_\\{)(\\${fieldName})(${getHighlightRegExpAlternation()})?(?=\\}_)`,
            `^(\\${fieldName})(${getNumberFormatRegExpAlternation()})$`,
            `(?<='.*datum)(.\\${fieldName})(${getNumberFormatRegExpAlternation()})?(?=.*')`,
            `(?<='.*datum\\[\\\\\\')(\\${fieldName})(${getNumberFormatRegExpAlternation()})?(?=\\\\\\'\\].*')`,
            `(?<=datum\\[\\\\")(\\${fieldName})(${getNumberFormatRegExpAlternation()})?(?=\\\\"\\])`,
            `(?<=datum)(.\\${fieldName})(${getNumberFormatRegExpAlternation()})?(?=)`,
            `(?<=datum\\[')(\\${fieldName})(${getNumberFormatRegExpAlternation()})?(?='\\])`,
            `(?<=datum\\[")(\\${fieldName})(${getNumberFormatRegExpAlternation()})?(?="\\])`,
            `(?<=_\\{)(\\${fieldName})(${getNumberFormatRegExpAlternation()})?(?=\\}_)`
        ];
        expect(result).toEqual(expectedPattern);
    });
});
it('should return an array with the expected replacement patterns', () => {
    const fieldName = '$ Sales';
    const placeholder = 'placeholder';
    const result = getTokenPatternsReplacement(fieldName, placeholder);
    const expectedPatterns = [
        {
            pattern: `^(${getEscapedReplacerPattern(
                fieldName
            )})(${getHighlightRegExpAlternation()})$`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<='.*datum)(.${getEscapedReplacerPattern(
                fieldName
            )})(${getHighlightRegExpAlternation()})?(?=.*')`,
            replacer: `[\\'${placeholder}$2\\']`
        },
        {
            pattern: `(?<='.*datum\\[\\\\\\')(${getEscapedReplacerPattern(
                fieldName
            )})(${getHighlightRegExpAlternation()})?(?=\\\\\\'\\].*')`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum\\[\\\\")(${getEscapedReplacerPattern(
                fieldName
            )})(${getHighlightRegExpAlternation()})?(?=\\\\"\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum)(.${getEscapedReplacerPattern(
                fieldName
            )})(${getHighlightRegExpAlternation()})?(?=)`,
            replacer: `['${placeholder}$2']`
        },
        {
            pattern: `(?<=datum\\[')(${getEscapedReplacerPattern(
                fieldName
            )})(${getHighlightRegExpAlternation()})?(?='\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum\\[")(${getEscapedReplacerPattern(
                fieldName
            )})(${getHighlightRegExpAlternation()})?(?="\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=_\\{)(${getEscapedReplacerPattern(
                fieldName
            )})(${getHighlightRegExpAlternation()})?(?=\\}_)`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `^(${getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})$`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<='.*datum)(.${getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?=.*')`,
            replacer: `[\\'${placeholder}$2\\']`
        },
        {
            pattern: `(?<='.*datum\\[\\\\\\')(${getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?=\\\\\\'\\].*')`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum\\[\\\\")(${getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?=\\\\"\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum)(.${getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?=)`,
            replacer: `['${placeholder}$2']`
        },
        {
            pattern: `(?<=datum\\[')(${getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?='\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum\\[")(${getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?="\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=_\\{)(${getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?=\\}_)`,
            replacer: `${placeholder}$2`
        }
    ];
    expect(result).toEqual(expectedPatterns);
});
