import { describe, expect, it } from 'vitest';
import { getStatusBarLayoutState } from '../use-status-bar-breakpoint';

describe('getStatusBarLayoutState', () => {
    it('should return "wide" for widths >= 350', () => {
        expect(getStatusBarLayoutState(350)).toBe('wide');
        expect(getStatusBarLayoutState(800)).toBe('wide');
        expect(getStatusBarLayoutState(1920)).toBe('wide');
    });

    it('should return "medium" for widths >= 250 and < 350', () => {
        expect(getStatusBarLayoutState(250)).toBe('medium');
        expect(getStatusBarLayoutState(300)).toBe('medium');
        expect(getStatusBarLayoutState(349)).toBe('medium');
    });

    it('should return "narrow" for widths >= 140 and < 250', () => {
        expect(getStatusBarLayoutState(140)).toBe('narrow');
        expect(getStatusBarLayoutState(180)).toBe('narrow');
        expect(getStatusBarLayoutState(249)).toBe('narrow');
    });

    it('should return "veryNarrow" for widths < 140', () => {
        expect(getStatusBarLayoutState(139)).toBe('veryNarrow');
        expect(getStatusBarLayoutState(50)).toBe('veryNarrow');
        expect(getStatusBarLayoutState(0)).toBe('veryNarrow');
    });
});
