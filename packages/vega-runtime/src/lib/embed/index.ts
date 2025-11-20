import { PROVIDER_VERSION_CONFIGURATION } from '@deneb-viz/configuration';
import { type SpecProvider } from './types';

export type * from './types';

/**
 * For the current provider, get the version from our package configuration.
 */
export const getVegaVersion = (provider: SpecProvider) =>
    PROVIDER_VERSION_CONFIGURATION[provider];
