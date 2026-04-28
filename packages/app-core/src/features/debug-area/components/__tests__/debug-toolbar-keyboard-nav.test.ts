import { describe, expect, it } from 'vitest';

import { HOTKEY_BINDINGS } from '../../../../lib/commands/constants';
import type { DebugPaneRole } from '../../../../lib';
import {
    ARIA_KEYSHORTCUTS_BY_PIVOT,
    TOOLTIP_KEY_BY_PIVOT
} from '../debug-toolbar-lookups';

/**
 * Maps each pivot role to the `HOTKEY_BINDINGS` command name. Lets the
 * cross-check test below derive the expected ARIA shortcut from the live
 * binding instead of duplicating the hotkey number — if anyone renumbers
 * a binding, the test catches the drift.
 */
const HOTKEY_COMMAND_BY_PIVOT: Record<
    DebugPaneRole,
    keyof typeof HOTKEY_BINDINGS
> = {
    source: 'debugPaneShowSource',
    data: 'debugPaneShowData',
    signal: 'debugPaneShowSignals',
    log: 'debugPaneShowLogs'
};

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

    it.each(['source', 'data', 'signal', 'log'] satisfies DebugPaneRole[])(
        'aria-keyshortcuts for "%s" matches the live HOTKEY_BINDINGS combination',
        (role) => {
            // Extract the digit from the react-hotkeys-hook combination string
            // (e.g. "ctrl|alt|6,ctrl|alt|num_6" → "6"). If a future change
            // renumbers a binding without updating ARIA_KEYSHORTCUTS_BY_PIVOT,
            // the announced shortcut would silently drift from the installed
            // handler — this test catches that.
            const command = HOTKEY_COMMAND_BY_PIVOT[role];
            const combination = HOTKEY_BINDINGS[command].combination;
            const match = combination.match(/ctrl\|alt\|(\d)/);
            expect(
                match,
                `Unexpected combination shape: ${combination}`
            ).not.toBeNull();
            const digit = match![1];
            expect(ARIA_KEYSHORTCUTS_BY_PIVOT[role]).toBe(
                `Control+Alt+${digit}`
            );
        }
    );
});
