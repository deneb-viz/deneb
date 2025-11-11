/**
 * When we parse the JSON to look for specific field types, these rely on specific patterns and replacements. This
 * interface provides the pattern and the replacement for a given field type.
 */
export type TokenPatternReplacer = {
    pattern: string;
    replacer: string;
};
