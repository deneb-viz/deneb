import { stripComments } from 'jsonc-parser';

/**
 * Character used to replace stripped JSONC comments. A space preserves the
 * original character offsets, so downstream parse errors still point at the
 * right line.
 */
const JSONC_COMMENT_REPLACE_CHAR = ' ';

/** Empty-object fallback for empty/nullish content. */
const JSONC_EMPTY_OBJECT = '{}';

/**
 * Result of parsing JSONC content: the parsed value, or `null` with the raw
 * parse-error message(s). Callers decorate the errors as needed (line numbers,
 * a fallback string, redaction).
 */
export interface JsoncParseResult {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any | null;
    errors: string[];
}

/**
 * Strip comments from JSONC content, replacing them with `replaceChar` (a space
 * by default, which preserves line numbers). Empty/nullish content becomes an
 * empty object literal (`{}`).
 */
export const stripJsoncComments = (
    content: string | undefined | null,
    replaceChar: string = JSONC_COMMENT_REPLACE_CHAR
): string => stripComments(content || JSONC_EMPTY_OBJECT, replaceChar);

/**
 * Parse JSONC (JSON with comments) into a `{ result, errors }` shape. Comments
 * are stripped (line numbers preserved) before `JSON.parse`. On failure,
 * `result` is `null` and `errors` carries the raw parse-error message; callers
 * add their own enrichment (e.g. a line number or a fallback).
 *
 * Shared core behind vega-runtime's `parseJsonWithResult` and json-processing's
 * JSONC string helpers (audit M16).
 */
export const parseJsoncWithResult = (
    content: string | undefined | null
): JsoncParseResult => {
    try {
        return { result: JSON.parse(stripJsoncComments(content)), errors: [] };
    } catch (e) {
        return {
            result: null,
            errors: [e instanceof Error ? e.message : String(e)]
        };
    }
};
