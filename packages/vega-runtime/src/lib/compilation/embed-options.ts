import { mergician } from 'mergician';
import type { EmbedOptions } from 'vega-embed';
import type { BuildEmbedOptionsInput } from './types';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import type { Renderers } from 'vega';

/**
 * Build Vega embed options from configuration and user options, which merges Deneb defaults with user-provided options.
 *
 * @param input Configuration for building embed options
 * @returns Complete embed options for vega-embed
 *
 * @example
 * ```typescript
 * const options = buildEmbedOptions({
 *   mode: 'vega',
 *   config: { background: 'transparent' },
 *   logLevel: 0
 * });
 * ```
 */
export const buildEmbedOptions = (
    input: BuildEmbedOptionsInput
): EmbedOptions => {
    const { mode, config, userOptions = {}, logLevel } = input;

    const baseOptions: EmbedOptions = {
        mode,
        actions: false,
        renderer: PROJECT_DEFAULTS.renderMode as Renderers,
        loader: undefined, // Use default loader
        logLevel: logLevel ?? PROJECT_DEFAULTS.logLevel
    };

    if (config) {
        baseOptions.config = config;
    }

    // Merge user options (with precedence over defaults)
    return mergician(baseOptions, userOptions) as EmbedOptions;
};
