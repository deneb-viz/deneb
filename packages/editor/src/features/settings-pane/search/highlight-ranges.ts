import type { HighlightRange } from './types';

/**
 * Compute non-overlapping, merged highlight ranges for every occurrence
 * of `query` within `text`. Case-insensitive substring match.
 *
 * Returns an empty array when either side is empty or there are no
 * matches.
 *
 * Convenience wrapper over {@link computeHighlightRangesLowered} for
 * callers that have raw-case strings in hand (e.g. one-off consumers,
 * tests). Hot-path callers on the match engine have pre-lowered both
 * surface strings and the query at resolve time and should use
 * {@link computeHighlightRangesLowered} directly to avoid redundant
 * folding on every keystroke.
 */
export const computeHighlightRanges = (
    text: string,
    query: string
): HighlightRange[] => {
    if (!text || !query) return [];
    return computeHighlightRangesLowered(
        text.toLowerCase(),
        query.toLowerCase()
    );
};

/**
 * Compute non-overlapping, merged highlight ranges for every occurrence
 * of `queryLower` within `textLower`.
 *
 * Unlike {@link computeHighlightRanges}, this entry point performs NO
 * case folding — both inputs MUST already be lowercased by the caller.
 * Passing a raw-case string here will yield a mismatch if the folded
 * form differs (e.g. `"Format"` against `"format"` returns no match).
 *
 * Designed for the match engine's hot path where resolved descriptors
 * carry pre-lowered surface strings (`labelLower`, `headingLower`, …)
 * and the query has already been folded once by `resolveQuery`. At
 * 1,000 fields × 7 flags this saves ~15k redundant `.toLowerCase()`
 * calls per keystroke on constant translated text.
 *
 * Returns an empty array when either side is empty or there are no
 * matches.
 *
 * Length-preservation invariant. Output offsets are computed against
 * `textLower` and applied verbatim to the original unfolded string.
 * This relies on `String.prototype.toLowerCase()` being length-preserving
 * — true for BMP Latin and the locales Deneb currently ships, but
 * *not* universally true. Known violators include U+0130 LATIN CAPITAL
 * LETTER I WITH DOT ABOVE (lowers to the two code units `i\u0307` in
 * most engines) and the Turkish locale forms reached via
 * `toLocaleLowerCase('tr-TR')`. Supplementary-plane casemap pairs are
 * mostly length-preserving today but not guaranteed by spec.
 * Introducing new locales or switching to a locale-aware folder would
 * require revisiting this helper.
 */
export const computeHighlightRangesLowered = (
    textLower: string,
    queryLower: string
): HighlightRange[] => {
    if (!textLower || !queryLower) return [];
    const ranges: HighlightRange[] = [];
    let fromIndex = 0;
    while (fromIndex <= textLower.length - queryLower.length) {
        const hit = textLower.indexOf(queryLower, fromIndex);
        if (hit === -1) break;
        ranges.push({ start: hit, end: hit + queryLower.length });
        fromIndex = hit + queryLower.length;
    }
    return mergeAdjacentRanges(ranges);
};

/**
 * Merge adjacent or overlapping ranges into single spans. Input must be
 * sorted by `start` ascending (which the indexOf loop guarantees).
 */
const mergeAdjacentRanges = (
    ranges: readonly HighlightRange[]
): HighlightRange[] => {
    if (ranges.length <= 1) return ranges.slice();
    const merged: HighlightRange[] = [{ ...ranges[0] }];
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
