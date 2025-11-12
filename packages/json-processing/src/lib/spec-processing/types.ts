/**
 * Options for resolving a provider schema validator.
 */
export type GetProviderValidatorOptions = {
    provider: SchemaProvider;
    version?: string;
    isConfig?: boolean;
};

/**
 * Valid provider types for JSON schemas used in Deneb.
 */
export type SchemaProvider = 'vega' | 'vegaLite' | 'denebUserMeta';

/**
 * Represents the JSON schema metadata for a given provider version.
 */
export type SchemaProviderMetadata = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

/**
 * A record of of all schema providers and the JSON for the specified versions.
 */
export type SchemaProviderReference = {
    [key in SchemaProvider]: SchemaProviderMetadata;
};

/**
 * When we perform parsing of the JSON editor or property content (prior to patching it), we need to know if there
 * re any errors so we can log them. This providdes the result of the parsing, and any errors that were encountered.
 */
export interface IJsonParseResult {
    result: object | null;
    errors: string[];
}
