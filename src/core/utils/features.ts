export { isFeatureEnabled };

import { getConfig } from './config';

/**
 * Check config for named feature flag and verify that it's enabled. Also returns `false` if flag does not exist.
 */
const isFeatureEnabled = (feature: string): boolean =>
    getConfig()?.features?.[feature?.trim()] || false;
