import { type RefObject } from 'react';
import useResizeObserver from 'use-resize-observer';

export type StatusBarLayoutState = 'wide' | 'medium' | 'narrow' | 'veryNarrow';

const WIDE = 350;
const MEDIUM = 250;
const NARROW = 140;

export const getStatusBarLayoutState = (
    width: number
): StatusBarLayoutState => {
    if (width >= WIDE) return 'wide';
    if (width >= MEDIUM) return 'medium';
    if (width >= NARROW) return 'narrow';
    return 'veryNarrow';
};

export const useStatusBarBreakpoint = (
    ref: RefObject<HTMLDivElement | null>
): StatusBarLayoutState => {
    const { width = 0 } = useResizeObserver({
        ref: ref as RefObject<HTMLDivElement>
    });
    return getStatusBarLayoutState(width);
};
