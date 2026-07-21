# Universal Cell Inspector for Debug Area — Requirements

**Date:** 2026-04-17
**Status:** Draft
**Builds on:** PR #597 (complex object debugging capabilities)

## Problem

The debug area's data table and signal viewer currently only allow value inspection for cells that exceed the 250-character truncation limit or contain complex objects (`{...}`, `[Object]`, `[Circular]`). Regular cell values rely on native `title` tooltips for full-value access and require fiddly text selection for copying.

This creates three problems:

1. **Copy friction** — Users cannot easily copy any cell value; they must manually select text within the table, which is error-prone in dense data grids
2. **Inconsistent inspection** — Some cells have a rich Monaco editor inspector while most have only a basic tooltip, creating an uneven experience
3. **Accessibility gaps** — The tooltip-based approach is not accessible to screen readers or keyboard-only users; there is no focusable, actionable path to a cell's full value

## Goals

1. **Universal inspection**: Any cell in the data table or signal viewer can be clicked to open a read-only Monaco editor popover showing the full value
2. **Accessibility**: Provide a focusable, keyboard-accessible interaction path for inspecting and copying any cell value
3. **Tighter inline display**: Reduce the truncation limit from 250 to 175 characters, since the inspector is now always available as the full-value escape hatch
4. **Consistent experience**: The same click-to-inspect pattern applies to both the data table and signal viewer

## Non-Goals

- Editable values in the inspector — this is strictly read-only
- Inline editing of cell values in the data table
- Changing the existing pruning depth (`DATA_TABLE_VALUE_MAX_DEPTH = 4`) for the raw data available to the inspector
- Adding copy buttons or other chrome to the inspector popover (Monaco's built-in Ctrl+A / Ctrl+C is sufficient)

## Behavior

### Trigger

- **Click on any cell value** opens the inspector popover
- This replaces the current behavior where regular cells are inert and only complex-value cells have the `[···]` button trigger
- The `ComplexValueCell` component and its icon-button trigger are retired; all cells use the same click-to-inspect interaction

### Inspector Display

- **Always uses the Monaco editor** in read-only mode, consistent with the existing complex value inspector
- **Adaptive sizing**: The popover sizes to fit the content
  - Short scalar values (numbers, short strings): compact popover
  - Objects/arrays/long strings: larger popover, up to the current maximum (450×350px)
- **Formatting**: Values are formatted appropriately for their type:
  - Objects/arrays: pretty-printed JSON via `formatJson()`
  - Strings: displayed as-is (no JSON wrapping quotes)
  - Numbers, booleans, dates: displayed as their string representation
  - Special values (NaN, Infinity): displayed with their translated labels
- **Theme-aware**: Uses the current editor theme (light/dark)
- **Font size**: Uses the current editor font size preference

### Dismissal

- Clicking outside the popover closes it
- Scrolling outside the editor area closes it (existing behavior from `ComplexValueCell`)
- Only one inspector popover can be open at a time

### Truncation Change

- `DATA_TABLE_VALUE_MAX_LENGTH` reduced from 250 to 175
- Truncated values still display the existing placeholder text (`{...}`, `[Object]`, `[Circular]`) — no change to the placeholder mechanism
- The reduced limit tightens column widths for a cleaner table layout

### Scope

Applies to:
- **Data table** (`DataTableCell` in dataset viewer)
- **Signal viewer** (`SignalValue` component, which already uses `DataTableCell`)

## Key Implementation Notes

- `DataTableCell` is the central component to modify — it already handles the branch between complex and regular cells
- The `ComplexValueCell` component's popover+Monaco logic should be generalized rather than duplicated
- The click handler needs to work on the cell's `<div>` wrapper, not require a separate button element
- Cell cursor should indicate clickability (e.g., `cursor: pointer`)
- Special field tooltips (cross-filter status, highlight comparator) should still appear as hover tooltips; clicking still opens the inspector with the raw value

## Success Criteria

1. Any cell in the data table or signal viewer opens a read-only Monaco editor on click
2. Short values produce a compact popover; long/complex values produce a larger one
3. The table displays tighter columns with the 175-character limit
4. Keyboard users can tab to cells and activate the inspector
5. The existing complex value inspection behavior is preserved (same quality of JSON formatting and display)
