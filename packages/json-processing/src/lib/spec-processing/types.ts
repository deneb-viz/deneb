import { type Spec } from 'vega';
import { type TopLevelSpec } from 'vega-lite';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { type VegaDatum } from '@deneb-viz/data-core/value';

/**
 * After parsing, we need to patch content. This represents the results of
 * that operation.
 */
export type ContentPatchResult = {
    result: Spec | TopLevelSpec | null;
    errors: string[];
};

/**
 * Options for resolving a provider schema validator.
 */
export type GetProviderValidatorOptions = {
    provider: SchemaProvider;
    version?: string;
    isConfig?: boolean;
};

/**
 * Options for getting the specification for the visual.
 */
export type GetSpecificationForVisualOptions = {
    values: VegaDatum[];
    spec: object;
    provider: SpecProvider;
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
 * Items we need to compare whether a specification has changed or not.
 */
export type SpecificationComparisonOptions = {
    config: string;
    spec: string;
    provider: SpecProvider;
    validateSchema: boolean;
    viewportHeight: number;
    viewportWidth: number;
};

/**
 * Options for parsing the specification.
 */
export type SpecificationParseOptions = {
    config: string;
    logLevel: number;
    provider: SpecProvider;
    spec: string;
    translations: {
        configParseError: string;
        specParseError: string;
    };
    viewportHeight: number;
    viewportWidth: number;
    validateSchema: boolean;
};
