import { getConfig } from '../../config/src/getConfig';

export const isFeatureEnabled = (feature: string): boolean => getConfig()?.features?.[feature?.trim()] || false;