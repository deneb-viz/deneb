import { version as vegaVersion } from 'vega';
import { version as vegaLiteVersion } from 'vega-lite';
import { type SpecProvider } from './types';

export type * from './types';

/**
 * Runtime version constants from the installed vega and vega-lite packages.
 * These are used to report the actual version of the runtime rather than a
 * hardcoded value from configuration.
 */
export const RUNTIME_VERSIONS = {
    vega: vegaVersion,
    vegaLite: vegaLiteVersion
} as const;

/**
 * For the current provider, get the version from the installed runtime packages.
 */
export const getVegaVersion = (provider: SpecProvider) =>
    RUNTIME_VERSIONS[provider];
