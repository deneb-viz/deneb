import type { ParsedSpec, ParseSpecOptions } from '../spec-processing/types';
import type { EmbedOptions } from 'vega-embed';

/**
 * Options for compiling a specification
 */
export interface CompileSpecOptions extends ParseSpecOptions {
    /**
     * Additional embed options to merge
     */
    embedOptions?: Partial<EmbedOptions>;

    /**
     * Log level for Vega embed (0 = none, 1 = error, 2 = warn, 3 = info, 4 = debug)
     */
    logLevel?: number;
}

/**
 * Status of the compilation process
 */
export type CompilationStatus = 'new' | 'ready' | 'error' | 'compiling';

/**
 * Result of spec compilation including embed options and compiled Vega spec
 */
export interface CompilationResult {
    /**
     * Status of compilation
     */
    status: CompilationStatus;

    /**
     * Parsed specification result
     */
    parsed: ParsedSpec;

    /**
     * Vega embed options
     */
    embedOptions: EmbedOptions;

    /**
     * For Vega-Lite specs, the compiled Vega specification
     */
    vgSpec?: object;

    /**
     * Compilation errors (if status is 'error')
     */
    errors?: string[];
}

/**
 * Options for building embed options
 */
export interface BuildEmbedOptionsInput {
    /**
     * Mode for embedding (vega or vega-lite)
     */
    mode: 'vega' | 'vega-lite';

    /**
     * Config to merge into embed options
     */
    config?: object;

    /**
     * User-provided embed options to merge
     */
    userOptions?: Partial<EmbedOptions>;

    /**
     * Log level (0 = none, 1 = error, 2 = warn, 3 = info, 4 = debug)
     */
    logLevel?: number;
}
