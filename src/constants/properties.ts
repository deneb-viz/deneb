import { objects } from '../../capabilities.json';
import { getConfig } from '../core/utils/config';

/**
 * Default visual settings from configuration.
 */
export const SETTINGS_DEFAULTS = getConfig().propertyDefaults;

/**
 * Object configuration from capabilities.json.
 */
export const SETTINGS_OBJECTS = objects;
