import type { HighlightRange } from './types';

/**
 * Compute non-overlapping, merged highlight ranges for every occurrence
 * of `query` within `text`. Case-insensitive substring match.
 *
 * Returns an empty array when either side is empty or there are no
 * matches.
 */
export const computeHighlightRanges = (
    text: string,
    query: string
): HighlightRange[] => {
    if (!text || !query) return [];
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    if (!lowerQuery) return [];

    const ranges: HighlightRange[] = [];
    let fromIndex = 0;
    while (fromIndex <= lowerText.length - lowerQuery.length) {
        const hit = lowerText.indexOf(lowerQuery, fromIndex);
        if (hit === -1) break;
        ranges.push({ start: hit, end: hit + lowerQuery.length });
        fromIndex = hit + lowerQuery.length;
    }
    return mergeAdjacentRanges(ranges);
};

/**
 * Merge adjacent or overlapping ranges into single spans. Input must be
 * sorted by `start` ascending (which `computeHighlightRanges` guarantees).
 */
const mergeAdjacentRanges = (
    ranges: readonly HighlightRange[]
): HighlightRange[] => {
    if (ranges.length <= 1) return ranges.slice();
    const merged: HighlightRange[] = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
        const last = merged[merged.length - 1];
        const next = ranges[i];
        if (next.start <= last.end) {
            last.end = Math.max(last.end, next.end);
        } else {
            merged.push({ ...next });
        }
    }
    return merged;
};
