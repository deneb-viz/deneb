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

/**
 * Extract the major version number from a semver string.
 */
const getMajorVersion = (version: string) => version.split('.')[0] ?? '5';

/**
 * Schema URL patterns for each provider. Uses major version from bundled runtime.
 */
const SCHEMA_URL_PATTERNS = {
    vega: (majorVersion: string) =>
        `https://vega.github.io/schema/vega/v${majorVersion}.json`,
    vegaLite: (majorVersion: string) =>
        `https://vega.github.io/schema/vega-lite/v${majorVersion}.json`
} as const;

/**
 * Get the schema URL for the specified provider based on the bundled runtime version.
 * This ensures the schema URL always matches the installed Vega/Vega-Lite major version.
 */
export const getProviderSchemaUrl = (provider: SpecProvider) => {
    const majorVersion = getMajorVersion(RUNTIME_VERSIONS[provider]);
    return SCHEMA_URL_PATTERNS[provider](majorVersion);
};
