/**
 * Field name encoding helpers shared across packages.
 *
 * Both Vega and Vega-Lite reserve characters that interfere with field
 * accessor parsing in expressions and lookups: `\`, `"`, `.`, `[`, and `]`.
 * Field names containing any of these are encoded by replacing them with
 * underscores so the resulting identifier is safe to use as a property
 * accessor.
 *
 * Reference:
 *  - Vega: https://vega.github.io/vega/docs/types/#Field
 *  - Vega-Lite: https://vega.github.io/vega-lite/docs/field.html
 */
export const getEncodedFieldName = (displayName: string): string =>
    displayName?.replace(/([\\".[\]])/g, '_') || '';
