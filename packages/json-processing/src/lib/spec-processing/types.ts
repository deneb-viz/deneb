/**
 * When we perform parsing of the JSON editor or property content (prior to patching it), we need to know if there
 * are any errors so we can log them. This provides the result of the parsing, and any errors that were encountered.
 */
export interface IJsonParseResult {
    result: object | null;
    errors: string[];
}
