import { getConfig } from '../config';

export { isFeatureEnabled };

const isFeatureEnabled = (feature: string): boolean =>
    getConfig()?.features?.[feature?.trim()] || false;
