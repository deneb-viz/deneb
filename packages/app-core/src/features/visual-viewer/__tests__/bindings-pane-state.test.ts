import { describe, expect, it } from 'vitest';

import {
    getCollapsedToggleCorner,
    getPaneOffset,
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

describe('getPaneOffset', () => {
    const space = { width: 1300, height: 733 };

    it('moves a bottom pane up to a chart shorter than its space', () => {
        expect(
            getPaneOffset('bottom', space, { width: 1300, height: 705 })
        ).toBe(28);
    });

    it('moves a right pane left to a chart narrower than its space', () => {
        expect(
            getPaneOffset('right', space, { width: 1000, height: 600 })
        ).toBe(300);
    });

    it('leaves a pane on its edge when the chart fills its space', () => {
        expect(getPaneOffset('bottom', space, space)).toBe(0);
        expect(getPaneOffset('right', space, space)).toBe(0);
    });

    it('leaves a pane on its edge when the chart overflows towards it', () => {
        expect(
            getPaneOffset('bottom', space, { width: 1300, height: 900 })
        ).toBe(0);
        expect(
            getPaneOffset('right', space, { width: 1500, height: 600 })
        ).toBe(0);
    });

    it('leaves a pane on its edge when the chart overflows the other way, where the scrollbar runs', () => {
        expect(
            getPaneOffset('bottom', space, { width: 1500, height: 600 })
        ).toBe(0);
        expect(
            getPaneOffset('right', space, { width: 1000, height: 900 })
        ).toBe(0);
    });

    it('never moves a pane on the top or left edge, which a chart is drawn from', () => {
        const smallChart = { width: 400, height: 200 };
        expect(getPaneOffset('top', space, smallChart)).toBe(0);
        expect(getPaneOffset('left', space, smallChart)).toBe(0);
    });

    it('leaves a pane on its edge while the chart has not been drawn', () => {
        expect(getPaneOffset('bottom', space, { width: 0, height: 0 })).toBe(0);
        expect(getPaneOffset('right', space, { width: 0, height: 0 })).toBe(0);
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
