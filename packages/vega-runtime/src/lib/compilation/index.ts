/**
 * Compilation module for Vega and Vega-Lite specifications.
 * Provides high-level APIs for compiling specs ready for embedding.
 */

export { COMPILATION_STATUS_DEFAULT } from './constants';
export { compileSpec, validateCompilation } from './compile';
export { buildEmbedOptions } from './embed-options';
export type {
    CompileSpecOptions,
    CompilationResult,
    CompilationStatus,
    BuildEmbedOptionsInput
} from './types';
