export { isFeatureEnabled };

import { getConfig } from '../config';

const isFeatureEnabled = (feature: string): boolean =>
    getConfig()?.features?.[feature?.trim()] || false;
