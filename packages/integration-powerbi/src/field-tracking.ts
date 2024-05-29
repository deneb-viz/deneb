import {
    JSON_FIELD_TRACKING_METADATA_PLACEHOLDER,
    JSON_FIELD_TRACKING_TOKEN_PLACEHOLDER,
    TokenPatternReplacer,
    utils
} from '@deneb-viz/core-dependencies';
import { getCrossHighlightRegExpAlternation } from './cross-highlight';
import { getNumberFormatRegExpAlternation } from './number-formatting';

/**
 * For a literal field name (i.e., an extracted property value from a JSON or Vega expression AST), returns an array of
 * RegEx patterns that can be used to test that the literal matches the given field name (allowing for field modifiers
 * such as highlights and number formatting).
 */
export const getPowerBiTokenPatternsLiteral = (
    fieldName?: string
): string[] => {
    const namePattern = utils.getEscapedReplacerPattern(
        fieldName ?? JSON_FIELD_TRACKING_TOKEN_PLACEHOLDER
    );
    return [
        ...getPowerBiTokenPatterns(
            namePattern,
            getCrossHighlightRegExpAlternation(),
            ''
        ),
        ...getPowerBiTokenPatterns(
            namePattern,
            getNumberFormatRegExpAlternation(),
            ''
        )
    ].map((r) => r.pattern);
};

/**
 * Provide the Power BI-specific tokens that we may need to search for and replace when performing field remapping in a
 * specification.
 */
export const getPowerBiTokenPatternsReplacement = (
    fieldName?: string,
    placeholder?: string
): TokenPatternReplacer[] => {
    const namePattern = utils.getEscapedReplacerPattern(
        fieldName ?? JSON_FIELD_TRACKING_TOKEN_PLACEHOLDER
    );
    const alternations = [
        getCrossHighlightRegExpAlternation(),
        getNumberFormatRegExpAlternation()
    ];
    const replacers: TokenPatternReplacer[] = [];
    for (let i = 0, n = alternations.length; i < n; i++) {
        const alternation = alternations[i] as string;
        replacers.push(
            ...getPowerBiTokenPatterns(
                namePattern,
                alternation,
                placeholder ?? JSON_FIELD_TRACKING_METADATA_PLACEHOLDER
            )
        );
    }
    return replacers;
};

/**
 * Standard find and replace patterns for dataset field names in Power BI. These are in order of precedence, with the
 * most specific patterns first.
 */
const getPowerBiTokenPatterns = (
    namePattern: string,
    alternation: string,
    placeholder: string
): TokenPatternReplacer[] => [
    // Base field
    {
        pattern: `^(${namePattern})(${alternation})$`,
        replacer: `${placeholder}$2`
    },
    // Advanced cross-filtering datum escaped single quote with dot accessor
    {
        pattern: `(?<='.*datum)(.${namePattern})(${alternation})?(?=.*')`,
        replacer: `[\\'${placeholder}$2\\']`
    },
    // Advanced cross-filtering datum escaped single quote with single quote accessor
    {
        pattern: `(?<='.*datum\\[\\\\\\')(${namePattern})(${alternation})?(?=\\\\\\'\\].*')`,
        replacer: `${placeholder}$2`
    },
    // Accessor with escaped double-quote within expression
    {
        pattern: `(?<=datum\\[\\\\")(${namePattern})(${alternation})?(?=\\\\"\\])`,
        replacer: `${placeholder}$2`
    },
    // Standard dot accessor
    {
        pattern: `(?<=datum)(.${namePattern})(${alternation})?(?=)`,
        replacer: `['${placeholder}$2']`
    },
    // Accessor with single quote within expression
    {
        pattern: `(?<=datum\\[')(${namePattern})(${alternation})?(?='\\])`,
        replacer: `${placeholder}$2`
    },
    // Accessor with double quote within expression
    {
        pattern: `(?<=datum\\[")(${namePattern})(${alternation})?(?="\\])`,
        replacer: `${placeholder}$2`
    },
    // Advanced cross-filtering token
    {
        pattern: `(?<=_\\{)(${namePattern})(${alternation})?(?=\\}_)`,
        replacer: `${placeholder}$2`
    }
];
