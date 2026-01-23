import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { parseSpec } from '../spec-processing/parse';
import { buildEmbedOptions } from './embed-options';
import type { CompilationResult, CompileSpecOptions } from './types';

/**
 * Compile a Vega or Vega-Lite specification into a format ready for embedding, and main entry point for full spec
 * compilation.
 *
 * Process flow:
 * 1. Parse and validate spec (including signal migration)
 * 2. Build embed options with Deneb defaults
 * 3. Return compilation result ready for vegaEmbed
 *
 * Note: This does NOT perform Vega-Lite > Vega compilation. That happens during embed via vegaEmbed. This function
 * prepares everything for that step.
 *
 * @param options Compilation options
 * @returns Compilation result with parsed spec and embed options
 *
 * @example
 * ```typescript
 * const result = await compileSpec({
 *   spec: '{ "$schema": "https://vega.github.io/schema/vega/v5.json", ... }',
 *   config: '{}',
 *   provider: 'vega',
 *   containerDimensions: { width: 800, height: 600 },
 *   logLevel: 0
 * });
 *
 * if (result.status === 'ready') {
 *   // Use result.parsed.spec and result.embedOptions with vegaEmbed
 * }
 * ```
 */
export const compileSpec = (options: CompileSpecOptions): CompilationResult => {
    const {
        embedOptions: userEmbedOptions,
        logLevel = PROJECT_DEFAULTS.logLevel,
        ...parseOptions
    } = options;

    // Step 1: Parse and validate spec
    const parsed = parseSpec(parseOptions);

    // Step 2: Check for parsing errors
    if (parsed.status === 'error') {
        return {
            status: 'error',
            parsed,
            embedOptions: {},
            errors: parsed.errors
        };
    }

    // Step 3: Build embed options
    const embedOptions = buildEmbedOptions({
        mode: options.provider === 'vega' ? 'vega' : 'vega-lite',
        config: parsed.config,
        userOptions: userEmbedOptions,
        logLevel
    });

    // Step 4: Return ready compilation result
    return {
        status: 'ready',
        parsed,
        embedOptions
    };
};

/**
 * Lightweight validation-only version of compileSpec.
 * Returns only errors without building full compilation result.
 *
 * @param options Compilation options
 * @returns Errors array
 */
export const validateCompilation = (options: CompileSpecOptions): string[] => {
    // Strip embed-specific options that aren't needed for validation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { embedOptions, logLevel, ...parseOptions } = options;
    const parsed = parseSpec(parseOptions);
    return parsed.errors;
};
