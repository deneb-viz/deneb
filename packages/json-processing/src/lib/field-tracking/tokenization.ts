import {
    FORMATTED_FIELD_SUFFIX,
    FORMAT_FIELD_SUFFIX,
    HIGHLIGHT_COMPARATOR_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX
} from '@deneb-viz/dataset/field';
import type { TokenPatternReplacer } from './types';
import {
    JSON_FIELD_TRACKING_METADATA_PLACEHOLDER,
    JSON_FIELD_TRACKING_TOKEN_PLACEHOLDER
} from './constants';

/**
 * When performing placeholder replacements, we need to ensure that special characters used in regex qualifiers are
 * suitably escaped so that we don't inadvertently mangle them. Returns escaped string, suitable for pattern matching
 * if any special characters are used.
 */
export const getEscapedReplacerPattern = (value: string) => {
    return (value ?? '').replace(/[-/\\^$*+?.()&|[\]{}]/g, '\\$&');
};

/**
 * Provides all highlight field suffixes, suitable for a RegExp expression.
 */
export const getHighlightRegExpAlternation = () =>
    `${HIGHLIGHT_COMPARATOR_SUFFIX}|${HIGHLIGHT_STATUS_SUFFIX}|${HIGHLIGHT_FIELD_SUFFIX}`;

/**
 * Provides all number formatting field suffixes, suitable for a RegExp expression.
 */
export const getNumberFormatRegExpAlternation = () =>
    `${FORMAT_FIELD_SUFFIX}|${FORMATTED_FIELD_SUFFIX}`;

/**
 * For a literal field name (i.e., an extracted property value from a JSON or Vega expression AST), returns an array of
 * RegEx patterns that can be used to test that the literal matches the given field name (allowing for field modifiers
 * such as highlights and number formatting).
 */
export const getTokenPatternsLiteral = (fieldName?: string): string[] => {
    const namePattern = getEscapedReplacerPattern(
        fieldName ?? JSON_FIELD_TRACKING_TOKEN_PLACEHOLDER
    );
    return [
        ...getTokenPatterns(namePattern, getHighlightRegExpAlternation(), ''),
        ...getTokenPatterns(namePattern, getNumberFormatRegExpAlternation(), '')
    ].map((r) => r.pattern);
};

/**
 * Provide the Power BI-specific tokens that we may need to search for and replace when performing field remapping in a
 * specification.
 */
export const getTokenPatternsReplacement = (
    fieldName?: string,
    placeholder?: string
): TokenPatternReplacer[] => {
    const namePattern = getEscapedReplacerPattern(
        fieldName ?? JSON_FIELD_TRACKING_TOKEN_PLACEHOLDER
    );
    const alternations = [
        getHighlightRegExpAlternation(),
        getNumberFormatRegExpAlternation()
    ];
    const replacers: TokenPatternReplacer[] = [];
    for (let i = 0, n = alternations.length; i < n; i++) {
        const alternation = alternations[i] as string;
        replacers.push(
            ...getTokenPatterns(
                namePattern,
                alternation,
                placeholder ?? JSON_FIELD_TRACKING_METADATA_PLACEHOLDER
            )
        );
    }
    return replacers;
};

/**
 * Standard find and replace patterns for dataset field names. These are in order of precedence, with the most specific
 * patterns first.
 */
const getTokenPatterns = (
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
