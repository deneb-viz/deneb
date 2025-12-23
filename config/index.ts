import capabilities from '../capabilities.json';
import features from './features.json';

/**
 * This is an object that contains the capabilities of the visual.
 */
export const CAPABILITIES = capabilities;

/**
 * The primary set of feature switches for the packaged application. These are
 * loaded from the `config/features.json` file, so that we can hot-swap them
 * for different configurations as needed.
 */
export const FEATURES = features;

/**
 * Current major version of the template metadata. This is used to ensure that
 * we can handle migrations between versions, and that we can handle different
 * versions of the template metadata if needed.
 */
export const TEMPLATE_METADATA_VERSION = 1;
