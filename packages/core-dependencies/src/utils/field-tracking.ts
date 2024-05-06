/**
 * When performing placeholder replacements, we need to ensure that special characters used in regex qualifiers are
 * suitably escaped so that we don't inadvertently mangle them. Returns escaped string, suitable for pattern matching
 * if any special characters are used.
 */
export const getEscapedReplacerPattern = (value: string) => value.replace(/[-/\\^$*+?.()&|[\]{}]/g, '\\$&');
