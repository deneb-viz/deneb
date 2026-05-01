/**
 * Escape a string value for safe interpolation into a Vega expression
 * string literal (single-quoted). Backslashes are escaped first, then
 * single quotes, so that the resulting value is inert inside `'…'`.
 *
 * @param value - The raw string value to escape.
 * @returns The escaped string (without surrounding quotes).
 */
export const escapeVegaExpressionString = (value: string): string =>
    value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
