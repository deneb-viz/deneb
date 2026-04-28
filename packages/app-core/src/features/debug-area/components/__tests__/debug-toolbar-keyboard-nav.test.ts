import { describe, expect, it } from 'vitest';

import {
    ARIA_KEYSHORTCUTS_BY_PIVOT,
    TOOLTIP_KEY_BY_PIVOT
} from '../debug-toolbar-lookups';

/**
 * Keyboard navigation verification (Unit 5 of
 * `docs/plans/2026-04-28-001-feat-debug-pane-tab-refinements-plan.md`).
 *
 * The load-bearing verification for R5.3 is a manual keyboard QA pass — vitest
 * runs in node env without jsdom, so React-rendered keyboard-event tests are
 * not feasible in this workspace.
 *
 * The automated cross-coverage below asserts the data feeding the toolbar's
 * `aria-keyshortcuts` and tooltip wrappers is intact. If a future change
 * accidentally drops one of the four pivot roles from the lookup tables, the
 * tooltip / hotkey announcement for that tab silently disappears — these
 * tests catch that.
 *
 * Manual QA checklist (run before merging Unit 5):
 *
 *   1. Open the debug pane in a real Power BI host (or the web-client-sample).
 *   2. `Tab` into the debug toolbar; the first tab (Source) receives focus
 *      with a visible focus ring.
 *   3. Press the right-arrow key three times: focus and selection should
 *      cycle through Source → Data → Signals → Logs in visual order.
 *   4. Press the left-arrow key three times: cycle reverses to Source.
 *   5. Press `Tab` from Logs: focus exits the toolbar to the next focusable
 *      element (the zoom-out button).
 *   6. Press `Shift+Tab` from the zoom-out button: focus returns to the
 *      last-focused tab (Logs), not jumping past the radio group.
 *   7. Press `Ctrl+Alt+6 / 7 / 8 / 9` from anywhere in the visual: the
 *      corresponding tab activates.
 *   8. Hover and keyboard-focus each tab: the tooltip renders via the
 *      `<TooltipCustomMount>` mount node (no DOM-position regressions, no
 *      truncation against the toolbar edge).
 *
 * If any of the above fails, the most likely culprit is the
 * `<TooltipCustomMount>` siblings disturbing the `<ToolbarRadioGroup>`'s
 * roving-tabindex behavior. Reopen Unit 1's mount-node placement and consider
 * moving the mount nodes outside the radio group as siblings of the group.
 */
describe('debug toolbar keyboard navigation (regression cross-coverage)', () => {
    const expectedRoles = ['data', 'log', 'signal', 'source'];

    it('TOOLTIP_KEY_BY_PIVOT covers all four pivot roles', () => {
        expect(Object.keys(TOOLTIP_KEY_BY_PIVOT).sort()).toEqual(expectedRoles);
    });

    it('ARIA_KEYSHORTCUTS_BY_PIVOT covers all four pivot roles', () => {
        expect(Object.keys(ARIA_KEYSHORTCUTS_BY_PIVOT).sort()).toEqual(
            expectedRoles
        );
    });

    it('every aria-keyshortcuts value follows the W3C ARIA 1.1 modifier+key format', () => {
        // ARIA 1.1 §6.6 specifies modifier names: Alt, Control, Shift, Meta.
        // Match "<Modifier>+<Modifier>+<Key>" where Modifier ∈ that set.
        const ariaShortcutPattern =
            /^(Alt|Control|Shift|Meta)(\+(Alt|Control|Shift|Meta))*\+[\w]+$/;
        for (const value of Object.values(ARIA_KEYSHORTCUTS_BY_PIVOT)) {
            expect(value).toMatch(ariaShortcutPattern);
        }
    });
});
