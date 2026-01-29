import { stripComments } from 'jsonc-parser';
import type { ContentPatchResult } from './types';

/**
 * Character to replace comments with when stripping them from JSONC.
 * Using space preserves line numbers for error reporting.
 */
const JSONC_COMMENT_REPLACE_CHAR = ' ';

/**
 * Empty JSON object string used as fallback when input is empty.
 */
const JSONC_EMPTY_OBJECT = '{}';

/**
 * Parse JSONC (JSON with Comments) with error handling and line number extraction.
 * Returns a result object with the parsed content or error messages.
 *
 * Comments are stripped before parsing, with line numbers preserved.
 *
 * @param content JSONC string to parse
 * @returns Parsed result or error information
 */
export const parseJsonWithResult = (content: string): ContentPatchResult => {
    try {
        // Strip comments while preserving line numbers (replace with spaces)
        const pureJson = stripComments(
            content || JSONC_EMPTY_OBJECT,
            JSONC_COMMENT_REPLACE_CHAR
        );
        const parsed = JSON.parse(pureJson);
        return {
            result: parsed,
            errors: []
        };
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
            result: null,
            errors: [getErrorLine(content, message)]
        };
    }
};

/**
 * Extract line number from JSON parse error message (borrowed from vega-editor).
 * Provides user-friendly error messages with line numbers.
 *
 * @param code The JSON code that failed to parse
 * @param error The error message from JSON.parse
 * @returns Enhanced error message with line number
 */
const getErrorLine = (code: string, error: string): string => {
    const pattern = /(position\s)(\d+)/;
    const match = error.match(pattern);

    if (match !== null && match[2]) {
        const charPos = match[2];
        const position = parseInt(charPos, 10);

        if (!isNaN(position)) {
            let line = 1;
            let cursorPos = 0;

            while (
                cursorPos < position &&
                code.indexOf('\n', cursorPos) < position &&
                code.indexOf('\n', cursorPos) > -1
            ) {
                const newlinePos = code.indexOf('\n', cursorPos);
                line = line + 1;
                cursorPos = newlinePos + 1;
            }

            return `${error} at line ${line}`;
        }
    }

    return error;
};

/**
 * Redact JSON content from error messages to avoid overwhelming users
 * with large spec dumps in error messages.
 *
 * @param message Error message that may contain JSON
 * @returns Redacted error message
 */
export const redactJsonFromError = (message: string): string => {
    return message.replace(/(Invalid specification) (\{.*\})/g, '$1');
};
