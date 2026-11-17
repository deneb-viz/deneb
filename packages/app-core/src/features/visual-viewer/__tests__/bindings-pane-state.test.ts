import { describe, expect, it } from 'vitest';

import { resolveIsPaneCollapsed } from '../bindings-pane-state';

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
