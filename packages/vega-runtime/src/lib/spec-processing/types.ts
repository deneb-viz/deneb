import type { Spec } from 'vega';
import type { TopLevelSpec } from 'vega-lite';

/**
 * Specification provider (Vega or Vega-Lite).
 */
export type SpecProvider = 'vega' | 'vegaLite';

/**
 * Compilation status of a specification.
 */
export type CompileStatus = 'new' | 'valid' | 'error';

/**
 * Result of JSON content parsing and patching.
 */
export interface ContentPatchResult {
    /** The parsed and patched result (null if errors occurred) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any | null;
    /** Array of error messages (empty if successful) */
    errors: string[];
}

/**
 * Options for parsing a specification.
 */
export interface ParseSpecOptions {
    /** The specification text (JSON as string) */
    spec: string;
    /** The config text (JSON as string, optional) */
    config?: string;
    /** The provider (vega or vegaLite) */
    provider: SpecProvider;
    /** Schema validator function (optional - if provided, validates spec against schema) */
    schemaValidator?: SchemaValidator;
    /** Container dimensions for responsive sizing */
    containerDimensions?: {
        width: number;
        height: number;
    };
    /** Log level for Vega logger */
    logLevel?: number;
}

/**
 * Result of specification parsing.
 */
export interface ParsedSpec {
    /** Compilation status */
    status: CompileStatus;
    /** The parsed and patched spec (null if errors) */
    spec: Spec | TopLevelSpec | null;
    /** The parsed config (null if errors) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any | null;
    /** Array of error messages */
    errors: string[];
    /** Array of warning messages */
    warnings: string[];
    /** For Vega-Lite, the compiled Vega spec */
    vgSpec?: Spec;
}

/**
 * Result of schema validation.
 */
export interface SchemaValidationResult {
    /** Whether the spec is valid against the schema */
    valid: boolean;
    /** Array of validation warning messages (not errors - spec may still work) */
    warnings: string[];
}

/**
 * Schema validator function type.
 * Takes a parsed spec object and returns validation result.
 */
export type SchemaValidator = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    spec: any
) => SchemaValidationResult;

/**
 * Options for patching Vega specifications.
 */
export interface PatchVegaOptions {
    /** Container dimensions for responsive sizing */
    containerDimensions?: {
        width: number;
        height: number;
    };
    /** Additional signals to inject */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalSignals?: any[];
}

/**
 * Options for patching Vega-Lite specifications.
 */
export interface PatchVegaLiteOptions {
    /** Container dimensions for responsive sizing */
    containerDimensions?: {
        width: number;
        height: number;
    };
    /** Additional params to inject */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalParams?: any[];
}
