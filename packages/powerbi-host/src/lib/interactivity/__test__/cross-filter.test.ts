import { describe, expect, it, vi } from 'vitest';

// `./cross-filter` imports `@deneb-viz/app-core` and the visual `state`
// module, which pull a graph that fails to resolve under Node. Neither is
// used by the predicate under test.
vi.mock('@deneb-viz/app-core', () => ({ getDenebState: vi.fn() }));
vi.mock('../../../state', () => ({ getDenebVisualState: vi.fn() }));

import { isSelectionWithdrawn } from '../cross-filter';

const on = { enableSelection: true, selectionMode: 'simple' };

describe('isSelectionWithdrawn', () => {
    it('withdraws the selection when cross-filtering is turned off', () => {
        expect(
            isSelectionWithdrawn(on, { ...on, enableSelection: false })
        ).toBe(true);
    });

    it('withdraws the selection when the selection mode changes', () => {
        expect(
            isSelectionWithdrawn(on, { ...on, selectionMode: 'advanced' })
        ).toBe(true);
    });

    it('keeps the selection when the settings are unchanged or cross-filtering is turned on', () => {
        expect(isSelectionWithdrawn(on, { ...on })).toBe(false);
        expect(
            isSelectionWithdrawn({ ...on, enableSelection: false }, on)
        ).toBe(false);
    });
});
