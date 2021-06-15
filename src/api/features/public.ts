import { getConfig } from '../config/public';

export const isFeatureEnabled = (feature: string): boolean =>
    getConfig()?.features?.[feature?.trim()] || false;
