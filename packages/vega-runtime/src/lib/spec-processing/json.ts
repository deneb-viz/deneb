import { parseJsoncWithResult } from '@deneb-viz/utils/jsonc';
import type { ContentPatchResult } from './types';

/**
 * Parse JSONC (JSON with Comments) with error handling and line-number
 * enrichment. Thin decorator over the shared `parseJsoncWithResult` core
 * (`@deneb-viz/utils`); the only local behaviour is enriching parse-error
 * messages with a line number.
 *
 * @param content JSONC string to parse
 * @returns Parsed result or error information
 */
export const parseJsonWithResult = (content: string): ContentPatchResult => {
    const { result, errors } = parseJsoncWithResult(content);
    if (errors.length === 0) return { result, errors };
    return {
        result: null,
        errors: errors.map((message) => getErrorLine(content, message))
    };
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
