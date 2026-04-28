import type { DebugPaneRole } from '../../../lib';

/**
 * Maps each debug pane pivot role to the i18n key for its discoverability
 * tooltip. Defined in this dependency-light module (no Fluent UI / Monaco
 * imports) so it can be unit-tested in a node-env vitest run without pulling
 * in browser-only globals via the toolbar component's transitive imports.
 *
 * `Record<DebugPaneRole, string>` enforces exhaustive coverage — adding a
 * new role to the union forces a corresponding entry here.
 */
export const TOOLTIP_KEY_BY_PIVOT: Record<DebugPaneRole, string> = {
    source: 'Tooltip_Pivot_Debug_Source',
    data: 'Tooltip_Pivot_Debug_Data',
    signal: 'Tooltip_Pivot_Debug_Signals',
    log: 'Tooltip_Pivot_Debug_Logs'
};

/**
 * Maps each debug pane pivot role to the value rendered on the corresponding
 * `<ToolbarRadioButton>`'s `aria-keyshortcuts` attribute. Per W3C ARIA 1.1
 * §6.6, modifier names use the unabbreviated `Control` (not `Ctrl`). This
 * string is purely declarative — it announces the binding declared in
 * `lib/commands/constants.ts` HOTKEY_BINDINGS but does not install a handler.
 */
export const ARIA_KEYSHORTCUTS_BY_PIVOT: Record<DebugPaneRole, string> = {
    source: 'Control+Alt+6',
    data: 'Control+Alt+7',
    signal: 'Control+Alt+8',
    log: 'Control+Alt+9'
};
