/**
 * Specification processing for Vega and Vega-Lite.
 * Provides functional APIs for parsing, patching, and validating specs.
 */

// Main parsing API
export { parseSpec, validateSpec } from './parse';

// Patching functions (for advanced usage)
export { patchVegaSpec } from './patch-vega';
export { patchVegaLiteSpec } from './patch-vega-lite';
export { patchConfig } from './patch-config';
export {
    patchVegaSpecWithData,
    patchVegaLiteSpecWithData,
    patchSpecWithData,
    DATASET_DEFAULT_NAME
} from './patch-data';

// JSON utilities
export { parseJsonWithResult, redactJsonFromError } from './json';

// Types
export type {
    SpecProvider,
    CompileStatus,
    ContentPatchResult,
    ParseSpecOptions,
    ParsedSpec,
    PatchVegaOptions,
    PatchVegaLiteOptions,
    SchemaValidationResult,
    SchemaValidator
} from './types';
