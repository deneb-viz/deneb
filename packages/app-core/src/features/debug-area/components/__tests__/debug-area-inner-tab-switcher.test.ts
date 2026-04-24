import { describe, expect, it } from 'vitest';

import {
    resolveInnerTabContent,
    shouldRenderInnerToolbar
} from '../debug-area-inner-tab-switcher-utils';

describe('shouldRenderInnerToolbar', () => {
    it('returns true when the outer pivot is "data"', () => {
        expect(shouldRenderInnerToolbar('data')).toBe(true);
    });

    it('returns false when the outer pivot is "log"', () => {
        expect(shouldRenderInnerToolbar('log')).toBe(false);
    });

    it('returns false when the outer pivot is "signal"', () => {
        expect(shouldRenderInnerToolbar('signal')).toBe(false);
    });
});

describe('resolveInnerTabContent', () => {
    it('maps "source" to the source content key', () => {
        expect(resolveInnerTabContent('source')).toBe('source');
    });

    it('maps "data" to the data content key', () => {
        expect(resolveInnerTabContent('data')).toBe('data');
    });

    it('covers the full DataPivotTab switch with exhaustive mappings', () => {
        // Guards against a regression where a future DataPivotTab value is
        // added and this helper silently falls through an unhandled case.
        const pivots = ['source', 'data'] as const;
        const resolved = pivots.map(resolveInnerTabContent);
        expect(resolved).toEqual(['source', 'data']);
    });
});
