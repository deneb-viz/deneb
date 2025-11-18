import { SpecProvider } from '@deneb-viz/vega-runtime/embed';

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

/**
 * Represents a parsed and validated specification.
 */
export type CompiledSpecification = {
    errors: string[];
    spec: object | null;
    status: CompileStatus;
    warns: string[];
    hashValue: string | null;
};

/**
 * Values for a spec's parse status.
 */
export type CompileStatus = 'valid' | 'error' | 'new';

/**
 * Options for parsing the specification.
 */
export type SpecificationParseOptions = {
    config: string;
    datasetHash: string;
    logLevel: number;
    provider: SpecProvider;
    spec: string;
    viewportHeight: number;
    viewportWidth: number;
    validateSchema: boolean;
};
