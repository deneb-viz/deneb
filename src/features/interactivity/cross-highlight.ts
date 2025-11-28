import {
    HIGHLIGHT_COMPARATOR_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    getHighlightRegExpAlternation
} from '@deneb-viz/dataset/field';

/**
 * Produces a simple RegExp pattern for matching highlight fields.
 */
const getCrossHighlightFieldRegExp = (pattern: string) =>
    new RegExp(`(.*)(${pattern})`);
