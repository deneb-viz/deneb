export { isFeatureEnabled };

import { getConfig } from '../../core/utils/config';

const isFeatureEnabled = (feature: string): boolean =>
    getConfig()?.features?.[feature?.trim()] || false;
