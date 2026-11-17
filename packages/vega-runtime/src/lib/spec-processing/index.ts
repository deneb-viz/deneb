/**
 * Specification processing for Vega and Vega-Lite.
 * Provides functional APIs for parsing, patching, and validating specs.
 */

// Main parsing API
export { parseSpec, validateSpec, compileCleanVgSpec } from './parse';

// Patching functions (for advanced usage)
export { patchVegaSpec } from './patch-vega';
export {
    patchVegaLiteSpec,
    patchVegaLiteResponsiveSizing
} from './patch-vega-lite';
export { patchConfig } from './patch-config';
export {
    patchVegaSpecWithData,
    patchVegaLiteSpecWithData,
    patchSpecWithData,
    DATASET_DEFAULT_NAME
} from './patch-data';

// Input bindings rendered by Deneb
export { getApplicableHeldValues, getHeldValue } from './bound-signals';
export { patchSpecForBindings } from './patch-bindings';
export {
    getBindingControlKind,
    getBindingLabel,
    getColorInputValue,
    getInputProperties,
    getInputType,
    getInputValue,
    getOptionAtIndex,
    getOptionLabel,
    getRangeAttributes,
    getSelectedOptionIndex
} from './binding-controls';

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
export type {
    BoundSignal,
    BoundSignalBinding,
    HeldBoundValue,
    HeldBoundValues
} from './bound-signals';
