import { getHighlightRegExpAlternation } from '../highlight';
import {
    getEscapedReplacerPattern,
    getNumberFormatRegExpAlternation,
    getParameterRegExpAlternation,
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
    it('should return a dataset-scoped placeholder key', () => {
        expect(getPlaceholderKey('dataset', 0)).toBe('__dataset.0__');
    });
    it('should return a placeholder key with positive number', () => {
        expect(getPlaceholderKey('dataset', 5)).toBe('__dataset.5__');
    });
    it('should return a placeholder key with negative number', () => {
        expect(getPlaceholderKey('dataset', -3)).toBe('__dataset.3__');
    });
    it('should return a placeholder key with decimal number floored down', () => {
        expect(getPlaceholderKey('dataset', 2.5)).toBe('__dataset.2__');
    });
    it('should scope placeholder to the given dataset name', () => {
        expect(getPlaceholderKey('map_layer', 0)).toBe('__map_layer.0__');
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
            `(?<=_\\{)(\\${fieldName})(${getNumberFormatRegExpAlternation()})?(?=\\}_)`,
            `^(\\${fieldName})(${getParameterRegExpAlternation()})$`,
            `(?<='.*datum)(.\\${fieldName})(${getParameterRegExpAlternation()})?(?=.*')`,
            `(?<='.*datum\\[\\\\\\')(\\${fieldName})(${getParameterRegExpAlternation()})?(?=\\\\\\'\\].*')`,
            `(?<=datum\\[\\\\")(\\${fieldName})(${getParameterRegExpAlternation()})?(?=\\\\"\\])`,
            `(?<=datum)(.\\${fieldName})(${getParameterRegExpAlternation()})?(?=)`,
            `(?<=datum\\[')(\\${fieldName})(${getParameterRegExpAlternation()})?(?='\\])`,
            `(?<=datum\\[")(\\${fieldName})(${getParameterRegExpAlternation()})?(?="\\])`,
            `(?<=_\\{)(\\${fieldName})(${getParameterRegExpAlternation()})?(?=\\}_)`
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
        },
        {
            pattern: `^(${getEscapedReplacerPattern(
                fieldName
            )})(${getParameterRegExpAlternation()})$`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<='.*datum)(.${getEscapedReplacerPattern(
                fieldName
            )})(${getParameterRegExpAlternation()})?(?=.*')`,
            replacer: `[\\'${placeholder}$2\\']`
        },
        {
            pattern: `(?<='.*datum\\[\\\\\\')(${getEscapedReplacerPattern(
                fieldName
            )})(${getParameterRegExpAlternation()})?(?=\\\\\\'\\].*')`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum\\[\\\\")(${getEscapedReplacerPattern(
                fieldName
            )})(${getParameterRegExpAlternation()})?(?=\\\\"\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum)(.${getEscapedReplacerPattern(
                fieldName
            )})(${getParameterRegExpAlternation()})?(?=)`,
            replacer: `['${placeholder}$2']`
        },
        {
            pattern: `(?<=datum\\[')(${getEscapedReplacerPattern(
                fieldName
            )})(${getParameterRegExpAlternation()})?(?='\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum\\[")(${getEscapedReplacerPattern(
                fieldName
            )})(${getParameterRegExpAlternation()})?(?="\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=_\\{)(${getEscapedReplacerPattern(
                fieldName
            )})(${getParameterRegExpAlternation()})?(?=\\}_)`,
            replacer: `${placeholder}$2`
        }
    ];
    expect(result).toEqual(expectedPatterns);
});

describe('getParameterRegExpAlternation', () => {
    it('should return the __names suffix', () => {
        expect(getParameterRegExpAlternation()).toBe('__names');
    });
});

describe('__names suffix tokenization', () => {
    it('getTokenPatternsLiteral should include patterns for __names suffix', () => {
        const fieldName = 'Dynamic Category';
        const result = getTokenPatternsLiteral(fieldName);
        const parameterAlternation = getParameterRegExpAlternation();
        const escapedName = getEscapedReplacerPattern(fieldName);
        // The base exact-match pattern for __names should be present
        expect(result).toContain(`^(${escapedName})(${parameterAlternation})$`);
        // The double-quote accessor pattern covering datum["Dynamic Category__names"]
        expect(result).toContain(
            `(?<=datum\\[")(${escapedName})(${parameterAlternation})?(?="\\])`
        );
    });

    it('getTokenPatternsReplacement should produce correct replacer for __names suffix', () => {
        const fieldName = 'Dynamic Category';
        const placeholder = '__dataset.0__';
        const result = getTokenPatternsReplacement(fieldName, placeholder);
        const parameterAlternation = getParameterRegExpAlternation();
        const escapedName = getEscapedReplacerPattern(fieldName);
        // Base exact-match replacer
        expect(result).toContainEqual({
            pattern: `^(${escapedName})(${parameterAlternation})$`,
            replacer: `${placeholder}$2`
        });
        // Double-quote accessor replacer covering datum["Dynamic Category__names"]
        expect(result).toContainEqual({
            pattern: `(?<=datum\\[")(${escapedName})(${parameterAlternation})?(?="\\])`,
            replacer: `${placeholder}$2`
        });
    });
});
