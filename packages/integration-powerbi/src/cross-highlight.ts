import {
    HIGHLIGHT_COMPARATOR_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX
} from '@deneb-viz/core-dependencies';

/**
 * Provides all highlight field suffixes, suitable for a RegExp expression.
 */
export const getCrossHighlightRegExpAlternation = () =>
    `${HIGHLIGHT_COMPARATOR_SUFFIX}|${HIGHLIGHT_STATUS_SUFFIX}|${HIGHLIGHT_FIELD_SUFFIX}`;
