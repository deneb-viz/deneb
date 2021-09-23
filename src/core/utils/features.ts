export { getFeatureSettings, isFeatureEnabled };

import { getConfig } from './config';

const getFeatureSettings = () => getConfig()?.features;

/**
 * Check config for named feature flag and verify that it's enabled. Also returns `false` if flag does not exist.
 */
const isFeatureEnabled = (feature: string): boolean =>
    getFeatureSettings()?.[feature?.trim()] || false;
