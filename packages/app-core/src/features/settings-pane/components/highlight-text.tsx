import { Fragment, memo } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

import type { HighlightRange } from '../search/types';

/** A single segment of text emitted by the splitter. */
export type TextSegment = {
    text: string;
    isMatch: boolean;
};

/**
 * Split `text` into non-overlapping segments based on `ranges`. Pure —
 * no React, no styling, no assumptions about rendering. Extracted so it
 * can be unit-tested without a DOM test environment.
 *
 * Ranges are treated as half-open intervals `[start, end)`. Ranges are
 * assumed to already be non-overlapping and sorted ascending by `start`
 * (which `computeHighlightRanges` guarantees). Out-of-bounds / inverted
 * ranges are defensively skipped rather than thrown.
 */
export const splitTextIntoSegments = (
    text: string,
    ranges: readonly HighlightRange[] | undefined
): TextSegment[] => {
    if (!text) return [];
    if (!ranges || ranges.length === 0) {
        return [{ text, isMatch: false }];
    }
    const segments: TextSegment[] = [];
    let cursor = 0;
    for (const range of ranges) {
        const start = Math.max(cursor, range.start);
        const end = Math.min(text.length, range.end);
        if (end <= start) continue;
        if (start > cursor) {
            segments.push({
                text: text.slice(cursor, start),
                isMatch: false
            });
        }
        segments.push({ text: text.slice(start, end), isMatch: true });
        cursor = end;
    }
    if (cursor < text.length) {
        segments.push({ text: text.slice(cursor), isMatch: false });
    }
    return segments;
};

const useHighlightStyles = makeStyles({
    mark: {
        backgroundColor: tokens.colorBrandBackground2,
        color: tokens.colorNeutralForeground1,
        padding: 0,
        borderRadius: tokens.borderRadiusSmall
    }
});

type HighlightTextProps = {
    text: string;
    ranges?: readonly HighlightRange[];
    /** Optional override for the surrounding container class. */
    className?: string;
    /** Optional class applied to matched segments (appended after tokens). */
    markClassName?: string;
};

/**
 * Render `text` with `ranges` wrapped in `<mark>` elements. When
 * `ranges` is undefined or empty, renders plain text. Pure presentation;
 * no hooks besides the Fluent style hook.
 */
export const HighlightText = memo(function HighlightText({
    text,
    ranges,
    className,
    markClassName
}: HighlightTextProps) {
    const classes = useHighlightStyles();
    const segments = splitTextIntoSegments(text, ranges);
    if (segments.length === 0) {
        return <span className={className} />;
    }
    if (segments.length === 1 && !segments[0].isMatch) {
        return <span className={className}>{segments[0].text}</span>;
    }
    return (
        <span className={className}>
            {segments.map((segment, index) =>
                segment.isMatch ? (
                    <mark
                        key={index}
                        className={mergeClasses(classes.mark, markClassName)}
                    >
                        {segment.text}
                    </mark>
                ) : (
                    <Fragment key={index}>{segment.text}</Fragment>
                )
            )}
        </span>
    );
});
