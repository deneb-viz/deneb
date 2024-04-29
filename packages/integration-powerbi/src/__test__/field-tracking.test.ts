import { getCrossHighlightRegExpAlternation } from '../cross-highlight';
import { getPowerBiTokenPatternsLiteral, getPowerBiTokenPatternsReplacement } from '../field-tracking';
import { utils } from '@deneb-viz/core-dependencies';
import { getNumberFormatRegExpAlternation } from '../number-formatting';

describe('getPowerBiTokenPatternsLiteral', () => {
    it('should return an array with the expected pattern', () => {
        const fieldName = '$ Sales';
        const result = getPowerBiTokenPatternsLiteral(fieldName);
        const expectedPattern = [
            `^(\\${fieldName})(${getCrossHighlightRegExpAlternation()})$`,
            `(?<='.*datum)(.\\${fieldName})(${getCrossHighlightRegExpAlternation()})?(?=.*')`,
            `(?<='.*datum\\[\\\\\\')(\\${fieldName})(${getCrossHighlightRegExpAlternation()})?(?=\\\\\\'\\].*')`,
            `(?<=datum\\[\\\\")(\\${fieldName})(${getCrossHighlightRegExpAlternation()})?(?=\\\\"\\])`,
            `(?<=datum)(.\\${fieldName})(${getCrossHighlightRegExpAlternation()})?(?=)`,
            `(?<=datum\\[')(\\${fieldName})(${getCrossHighlightRegExpAlternation()})?(?='\\])`,
            `(?<=datum\\[")(\\${fieldName})(${getCrossHighlightRegExpAlternation()})?(?="\\])`,
            `(?<=_\\{)(\\${fieldName})(${getCrossHighlightRegExpAlternation()})?(?=\\}_)`,
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
    const result = getPowerBiTokenPatternsReplacement(fieldName, placeholder);
    const expectedPatterns = [
        {
            pattern: `^(${utils.getEscapedReplacerPattern(fieldName)})(${getCrossHighlightRegExpAlternation()})$`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<='.*datum)(.${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getCrossHighlightRegExpAlternation()})?(?=.*')`,
            replacer: `[\\'${placeholder}$2\\']`
        },
        {
            pattern: `(?<='.*datum\\[\\\\\\')(${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getCrossHighlightRegExpAlternation()})?(?=\\\\\\'\\].*')`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum\\[\\\\")(${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getCrossHighlightRegExpAlternation()})?(?=\\\\"\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum)(.${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getCrossHighlightRegExpAlternation()})?(?=)`,
            replacer: `['${placeholder}$2']`
        },
        {
            pattern: `(?<=datum\\[')(${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getCrossHighlightRegExpAlternation()})?(?='\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum\\[")(${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getCrossHighlightRegExpAlternation()})?(?="\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=_\\{)(${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getCrossHighlightRegExpAlternation()})?(?=\\}_)`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `^(${utils.getEscapedReplacerPattern(fieldName)})(${getNumberFormatRegExpAlternation()})$`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<='.*datum)(.${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?=.*')`,
            replacer: `[\\'${placeholder}$2\\']`
        },
        {
            pattern: `(?<='.*datum\\[\\\\\\')(${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?=\\\\\\'\\].*')`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum\\[\\\\")(${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?=\\\\"\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum)(.${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?=)`,
            replacer: `['${placeholder}$2']`
        },
        {
            pattern: `(?<=datum\\[')(${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?='\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=datum\\[")(${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?="\\])`,
            replacer: `${placeholder}$2`
        },
        {
            pattern: `(?<=_\\{)(${utils.getEscapedReplacerPattern(
                fieldName
            )})(${getNumberFormatRegExpAlternation()})?(?=\\}_)`,
            replacer: `${placeholder}$2`
        }
    ];
    expect(result).toEqual(expectedPatterns);
});
