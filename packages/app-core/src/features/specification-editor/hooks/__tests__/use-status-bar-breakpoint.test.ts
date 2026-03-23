import { describe, expect, it } from 'vitest';
import { getStatusBarLayoutState } from '../use-status-bar-breakpoint';

describe('getStatusBarLayoutState', () => {
    describe('with center content', () => {
        it('should return "wide" for widths >= 360', () => {
            expect(getStatusBarLayoutState(360, true)).toBe('wide');
            expect(getStatusBarLayoutState(800, true)).toBe('wide');
        });

        it('should return "medium" for widths >= 250 and < 360', () => {
            expect(getStatusBarLayoutState(250, true)).toBe('medium');
            expect(getStatusBarLayoutState(359, true)).toBe('medium');
        });

        it('should return "narrow" for widths >= 140 and < 250', () => {
            expect(getStatusBarLayoutState(140, true)).toBe('narrow');
            expect(getStatusBarLayoutState(249, true)).toBe('narrow');
        });

        it('should return "veryNarrow" for widths < 140', () => {
            expect(getStatusBarLayoutState(139, true)).toBe('veryNarrow');
            expect(getStatusBarLayoutState(0, true)).toBe('veryNarrow');
        });
    });

    describe('without center content', () => {
        it('should return "wide" for widths >= 200', () => {
            expect(getStatusBarLayoutState(200, false)).toBe('wide');
            expect(getStatusBarLayoutState(800, false)).toBe('wide');
        });

        it('should return "medium" for widths >= 170 and < 200', () => {
            expect(getStatusBarLayoutState(170, false)).toBe('medium');
            expect(getStatusBarLayoutState(199, false)).toBe('medium');
        });

        it('should return "narrow" for widths >= 80 and < 170', () => {
            expect(getStatusBarLayoutState(80, false)).toBe('narrow');
            expect(getStatusBarLayoutState(169, false)).toBe('narrow');
        });

        it('should return "veryNarrow" for widths < 80', () => {
            expect(getStatusBarLayoutState(79, false)).toBe('veryNarrow');
            expect(getStatusBarLayoutState(0, false)).toBe('veryNarrow');
        });
    });
});
