import { type RefObject } from 'react';
import useResizeObserver from 'use-resize-observer';

export type StatusBarLayoutState = 'wide' | 'medium' | 'narrow' | 'veryNarrow';

type Breakpoints = { wide: number; medium: number; narrow: number };

const WITH_CENTER: Breakpoints = { wide: 360, medium: 250, narrow: 140 };
const WITHOUT_CENTER: Breakpoints = { wide: 200, medium: 170, narrow: 80 };

export const getStatusBarLayoutState = (
    width: number,
    hasCenterContent: boolean
): StatusBarLayoutState => {
    const bp = hasCenterContent ? WITH_CENTER : WITHOUT_CENTER;
    if (width >= bp.wide) return 'wide';
    if (width >= bp.medium) return 'medium';
    if (width >= bp.narrow) return 'narrow';
    return 'veryNarrow';
};

export const useStatusBarBreakpoint = (
    ref: RefObject<HTMLDivElement | null>,
    hasCenterContent: boolean
): StatusBarLayoutState => {
    const { width = Infinity } = useResizeObserver({
        ref: ref as RefObject<HTMLDivElement>
    });
    return getStatusBarLayoutState(width, hasCenterContent);
};
