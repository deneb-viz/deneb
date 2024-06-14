/**
 * Placeholder to use when generating literal tokens for field names. These are u sed to identify field names in a
 * specification.
 */
export const JSON_FIELD_TRACKING_TOKEN_PLACEHOLDER = '__FIELD__';

/**
 * Placeholder to use when generating replacement tokens for fields in a specification. This will be replaced with the
 * actual metadata placeholder when ready to tokenize the specification.
 */
export const JSON_FIELD_TRACKING_METADATA_PLACEHOLDER = '__METADATA__';

/**
 * When resolving JSON to readable strings, this is the default maximum level of depth to stop at.
 */
export const JSON_MAX_PRUNE_DEPTH = 3;
