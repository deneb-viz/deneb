import { describe, expect, it } from 'vitest';

import {
    getCollapsedToggleCorner,
    isPaneAlongWidth,
    resolveIsPaneCollapsed
} from '../bindings-pane-state';

describe('resolveIsPaneCollapsed', () => {
    it('follows the collapsed setting until the reader chooses', () => {
        expect(
            resolveIsPaneCollapsed({ collapsible: true, collapsed: true }, null)
        ).toBe(true);
        expect(
            resolveIsPaneCollapsed(
                { collapsible: true, collapsed: false },
                null
            )
        ).toBe(false);
    });

    it('follows the choice of the reader over the setting', () => {
        expect(
            resolveIsPaneCollapsed(
                { collapsible: true, collapsed: false },
                true
            )
        ).toBe(true);
        expect(
            resolveIsPaneCollapsed(
                { collapsible: true, collapsed: true },
                false
            )
        ).toBe(false);
    });

    it('is never collapsed when the pane is not collapsible', () => {
        expect(
            resolveIsPaneCollapsed(
                { collapsible: false, collapsed: true },
                null
            )
        ).toBe(false);
        expect(
            resolveIsPaneCollapsed(
                { collapsible: false, collapsed: true },
                true
            )
        ).toBe(false);
    });
});

describe('isPaneAlongWidth', () => {
    it('runs a pane on the top or bottom edge along the width', () => {
        expect(isPaneAlongWidth('top')).toBe(true);
        expect(isPaneAlongWidth('bottom')).toBe(true);
    });

    it('stacks a pane on the left or right edge along the height', () => {
        expect(isPaneAlongWidth('left')).toBe(false);
        expect(isPaneAlongWidth('right')).toBe(false);
    });
});

describe('getCollapsedToggleCorner', () => {
    it('puts the toggle of a collapsed pane in the corner nearest its edge', () => {
        expect(getCollapsedToggleCorner('bottom')).toBe('bottomRight');
        expect(getCollapsedToggleCorner('top')).toBe('topRight');
        expect(getCollapsedToggleCorner('right')).toBe('topRight');
        expect(getCollapsedToggleCorner('left')).toBe('topLeft');
    });
});
