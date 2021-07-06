import { getConfig } from '../config';

export const isFeatureEnabled = (feature: string): boolean =>
    getConfig()?.features?.[feature?.trim()] || false;
