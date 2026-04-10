# TabList for Editor Toolbars

## Problem

The command bar (Spec/Config/Settings) and debug toolbar (Data/Signals/Logs) use `ToolbarRadioButton` for mode selection. This works functionally but doesn't provide a VS Code-like tab experience with a clear active indicator. Replacing with Fluent UI `TabList` gives underline indicators and a more familiar tab interaction pattern.

## Scope

Replace `ToolbarRadioGroup`/`ToolbarRadioButton` with `TabList`/`Tab` in two components. Same-row layout preserved. No changes to state management, handlers, or action buttons.

## Changes

### Command bar (`packages/app-core/src/features/command-bar/components/command-bar.tsx`)

Replace the `ToolbarRadioGroup` containing Spec/Config/Settings radio buttons with a `TabList` (size `small`, appearance `transparent`). The `TabList` sits at the left of the toolbar row. `onTabSelect` dispatches to the existing handlers (`handleEditorPaneSpecification`, `handleEditorPaneConfig`, `handleEditorPaneSettings`). `selectedValue` binds to `editorSelectedOperation`.

The two remaining `ToolbarGroup`s (Apply/Auto-apply and New/Export/Theme/Help) stay inside a `Toolbar` on the right side of the same flex row.

Remove the dead `toolbarDebug` style (lines 84-91) and the `toolbarGroupAdvancedEditor` style used only by the radio group wrapper.

### Debug toolbar (`packages/app-core/src/features/debug-area/components/debug-toolbar.tsx`)

Replace the `ToolbarRadioGroup` containing Data/Signals/Logs radio buttons with a `TabList` (size `small`, appearance `transparent`). `LogErrorIndicator` renders inside the Logs `Tab` label. `onTabSelect` dispatches to `handleDebugPaneData`, `handleDebugPaneSignal`, `handleDebugPaneLog`. `selectedValue` binds to `editorPreviewAreaSelectedPivot`.

Zoom controls stay in a `ToolbarGroup` on the right of the same row.

### Underline indicator

Both `TabList` components use the default underline indicator style (Fluent UI's `transparent` appearance renders an underline on the selected tab). This provides the active tab visual on both toolbars.

## Files Modified

| File | Change |
|------|--------|
| `packages/app-core/src/features/command-bar/components/command-bar.tsx` | Replace radio group with TabList; remove dead styles |
| `packages/app-core/src/features/debug-area/components/debug-toolbar.tsx` | Replace radio group with TabList; LogErrorIndicator in Tab label |

## Verification

- Spec/Config/Settings tabs switch editor pane with underline indicator
- Data/Signals/Logs tabs switch debug pane with underline indicator
- LogErrorIndicator still shows inside Logs tab when errors/warnings present
- Action buttons (Apply, Export, zoom controls, etc.) unchanged
- Dark mode: tabs respect theme tokens
- Keyboard: Tab/Arrow keys navigate tabs (Fluent TabList built-in)
