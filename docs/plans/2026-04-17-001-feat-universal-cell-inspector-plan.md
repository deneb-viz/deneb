---
title: 'feat: Universal cell inspector for debug area'
type: feat
status: active
date: 2026-04-17
origin: docs/brainstorms/2026-04-17-universal-cell-inspector-requirements.md
---

# feat: Universal cell inspector for debug area

## Overview

Extend the existing complex-object inspector (read-only Monaco editor in a Fluent UI Popover) to work on any cell in the debug area's data table and signal viewer. Clicking any cell value opens a popover rendering the pruned cell value in a read-only Monaco editor with adaptive sizing — the same depth-limited representation shown inline, but pretty-printed with syntax highlighting and easy copy support. A single shared popover instance coordinates which cell is active, ensuring only one inspector is open at a time. The truncation limit is reduced from 250 to 125 characters since the inspector is now universally available. Cells use roving tabindex for accessible keyboard navigation.

## Problem Frame

The debug area's data table and signal viewer rely on native `title` tooltips and manual text selection for accessing cell values. Only cells exceeding the 250-character limit or containing complex objects get the rich Monaco inspector. This creates copy friction, inconsistent inspection, and accessibility gaps — no focusable, keyboard-accessible path to inspect or copy any cell value. Note: the inspector shows the same pruned representation as the cell (depth-limited at `DATA_TABLE_VALUE_MAX_DEPTH = 4`); it improves _presentation_ and _interaction_ over inline text, not data depth. (see origin: `docs/brainstorms/2026-04-17-universal-cell-inspector-requirements.md`)

## Requirements Trace

- R1. Any cell in the data table or signal viewer can be clicked to open a read-only Monaco editor popover
- R2. Keyboard-accessible: cells use roving tabindex — Tab enters/exits the table, arrow keys navigate within, Enter/Space activates the inspector
- R3. Adaptive sizing: compact (200×80px) for scalars, full (450×350px) for objects/arrays
- R4. Reduce truncation limit from 250 to 125 characters
- R5. Consistent experience across data table and signal viewer
- R6. Special field tooltips (cross-filter, highlight) still appear on hover; clicking opens inspector
- R7. Signal viewer key column (signal names) excluded from click-to-inspect
- R8. Only one inspector popover is open at a time — a single shared popover instance hoisted to the DataTableViewer, coordinated via context

## Scope Boundaries

- Read-only inspector only — no cell editing
- No change to pruning depth (`DATA_TABLE_VALUE_MAX_DEPTH = 4`) — inspector shows same pruned representation as the cell, with Monaco's pretty-printing and copy support
- No copy button chrome — Monaco's built-in Ctrl+A/Ctrl+C is sufficient
- Column headers are not inspectable — only data cells
- Signal value snapshots: popover shows value at time of click, does not update live

## Context & Research

### Relevant Code and Patterns

- `packages/app-core/src/features/debug-area/components/data-table/complex-value-cell.tsx` — existing Popover+Monaco inspector pattern to generalize
- `packages/app-core/src/features/debug-area/components/data-table/data-table-cell.tsx` — central cell renderer, currently branches between complex and regular cells
- `packages/app-core/src/features/debug-area/components/data-table/data-table-tooltip-context.tsx` — tooltip portal context (`useDataTableTooltip()` provides `mountNode`)
- `packages/app-core/src/features/debug-area/components/signal-viewer/signal-viewer.tsx` — signal table column definitions (key column and value column)
- `packages/app-core/src/features/debug-area/components/signal-viewer/signal-value.tsx` — live signal value rendering via `DataTableCell`
- `packages/app-core/src/features/debug-area/constants.ts` — `DATA_TABLE_VALUE_MAX_LENGTH = 250`
- `packages/app-core/src/features/debug-area/workers/types.ts` — `WorkerDatasetViewerValueType` union: `'invalid' | 'number' | 'date' | 'array' | 'object' | 'string' | 'boolean' | 'key'`
- `packages/app-core/src/components/code-editor/editor-configuration.ts` — `buildEditorProps()` utility
- `packages/utils/src/lib/object.ts` — `formatJson()` uses `JSON.stringify(value, null, indent)`
- `src/index.ts` — `bindTabCycling()` intercepts all Tab events, yields for `[role="dialog"]`
- `src/lib/keyboard-focus.ts` — `handleTabWrapAround()` and `TABBABLE_SELECTOR`

### Institutional Learnings

- **Tab cycling handler traps popover focus** (`docs/solutions/ui-bugs/modal-dialog-tab-trapped-by-keyboard-focus-handler-2026-04-10.md`): The document-level `bindTabCycling` in `src/index.ts` intercepts ALL Tab events and currently only yields for `[role="dialog"], [role="alertdialog"]`. Fluent UI `PopoverSurface` renders with `role="note"`, not `role="dialog"`. Any new focusable overlay must be detected by this handler. The established fix pattern: add a DOM query for the overlay element to the early-return check.

### Key Codebase Facts

- **Monaco is not lazy-loaded** — `loader.init()` runs at editor startup. No loading state needed for the popover.
- **No row-click handlers exist** on `react-data-table-component` — no click conflict to resolve.
- **`rawValue` is already available** at every cell via the worker output (`IWorkerDatasetViewerDataTableFormattedValue.rawValue`) and signal value processing.
- **`valueType` is available** per cell from the worker — can be used to determine popover sizing tier.
- **All existing Popovers** use `POPOVER_Z_INDEX = 1000` from `packages/app-core/src/lib/interface/constants.ts`.
- **react-data-table-component v7.7.0** has no cell-click API — clicks are handled in the `cell` render function.

## Key Technical Decisions

- **Single shared popover with context coordination**: One `InspectorPopover` instance is hoisted to `DataTableViewer`. A `DataTableInspectorProvider` context exposes `openInspector(anchorRef, rawValue, valueType, cellId)` and `closeInspector()`. Cell clicks dispatch to this shared popover, passing their own anchor ref and value. This ensures only one popover is open at a time, eliminates per-cell Popover state duplication, and avoids the Fluent UI nesting conflict (Tooltip → Popover vs. Popover → Tooltip → PopoverTrigger). Fluent's `Popover` uses `positioning={{ target: anchorRef.current }}` to retarget dynamically.
- **Cell div as click target (not a Button)**: Each cell `<div>` has `onClick` and `onKeyDown` to dispatch to the shared popover. No per-cell `PopoverTrigger`. Visual cell stays lean. (see origin: user chose "click on any cell" over icon buttons)
- **Two-tier adaptive sizing**: Determined by `valueType` passed when opening. Scalars (`string`, `number`, `boolean`, `date`, `key`, `invalid`) get compact (200×80px). Structured types (`object`, `array`) get full (450×350px). Simple, predictable, no threshold logic.
- **Roving tabindex for cells**: Only one cell has `tabIndex={0}` at a time (the "active" cell); all others are `tabIndex={-1}`. Tab enters the table at the active cell and exits to the next focusable element below — not hundreds of tab stops. Arrow keys move focus within the grid (←/→ columns, ↑/↓ rows, Home/End row start/end). Enter/Space opens the inspector on the focused cell. Standard W3C ARIA grid pattern. Tracked via a `DataTableKeyboardProvider` context shared with the inspector provider (or combined).
- **Migrate native `title` tooltips to Fluent `<Tooltip>`**: Regular cells currently use `<div title={...}>`. Native `title` cannot be programmatically dismissed and will conflict with the shared popover. Migrate to Fluent `<Tooltip>` using the existing `DataTableTooltipProvider` `mountNode` pattern. The Tooltip wraps the cell div directly; the shared popover is a separate sibling instance, so there is no nesting conflict.
- **Extend `bindTabCycling` for PopoverSurface**: Add `.fui-PopoverSurface` (Fluent's stable class name) to the DOM query in `bindTabCycling`, following the established pattern for `[role="dialog"]`. Also fixes the pre-existing gap for `zoom-level-popover.tsx`.
- **Value formatting by type**:
    - `object` / `array`: `formatJson()` (pretty JSON), Monaco language `json`
    - All other types: `String(rawValue)` as plain text, Monaco language `plaintext` (avoids false JSON syntax errors on bare strings, dates, NaN/Infinity)
    - Null/undefined display as `"null"` / `"undefined"` literal strings
- **Signal value snapshot**: Popover captures `rawValue` at click time. Does not update live while open. The popover is for inspection, not monitoring.

## Open Questions

### Resolved During Planning

- **What keyboard key activates the inspector?** Enter and Space. Since the trigger is a `<div role="button">` (not a native `<button>`), the browser does NOT synthesize click events for Space automatically. Both Enter and Space must be handled explicitly via `onKeyDown`: `if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openInspector(cellRef, rawValue, valueType, cellId); }`. The `preventDefault()` on Space also prevents page scrolling.
- **Does the popover need `trapFocus`?** No. The Monaco editor inside the popover manages its own focus. `bindTabCycling` yields when PopoverSurface is detected. Escape key is handled by Fluent Popover's default behavior (closes on Escape), which triggers `closeInspector()` and returns focus to the last-active cell.
- **Where does focus return on dismiss?** Focus returns to the triggering cell element. Since the shared popover stores the anchor ref of the opening cell, the provider restores focus to that element on close.
- **What ARIA attributes for clickable cells?** `role="button"`, `tabIndex={0}` (only for the active roving cell, others `tabIndex={-1}`), `aria-haspopup="dialog"`, `aria-expanded={isOpenForThisCell}`. With `trapFocus` on the Popover, Fluent UI's `PopoverSurface` renders with `role="dialog"`, so `aria-haspopup="dialog"` is the accurate match.
- **Should the Monaco language be JSON or plaintext?** Conditional: `json` for objects/arrays (useful pretty-printing and highlighting), `plaintext` for scalars (avoids false syntax errors on bare strings, dates, `NaN`, `Infinity`).
- **What about `null`/`undefined` values?** Display as the literal string `"null"` or `"undefined"` via `String(rawValue)`. Current `ComplexValueCell` shows empty for null — the new behavior is an improvement. Do NOT carry over the null guard.
- **How is multi-popover prevented?** Single shared `InspectorPopover` instance at the `DataTableViewer` level. `openInspector()` replaces the current target; there is structurally no way to have two open.
- **How does roving tabindex work?** A `DataTableKeyboardProvider` tracks `activeCellId` (row index + column ID). The active cell renders with `tabIndex={0}`; all others use `tabIndex={-1}`. Arrow keys update `activeCellId` and call `.focus()` on the newly active cell via a ref map. Tab/Shift+Tab move focus out of the table to the next/previous external focusable element (browser default behavior, since no other cells are in the tab order).

### Deferred to Implementation

- Exact CSS for compact popover (200×80px is directional — may need minor adjustment when seeing it rendered)
- Whether the PopoverSurface detection in `bindTabCycling` should use `.fui-PopoverSurface` class or a `data-` attribute — verify at implementation time which is most stable

## Implementation Units

- [ ] **Unit 1: Extend bindTabCycling for PopoverSurface detection**

**Goal:** Prevent the document-level Tab interceptor from trapping focus inside popover overlays.

**Requirements:** R2

**Dependencies:** None

**Files:**

- Modify: `src/index.ts`
- Test: `src/lib/__test__/keyboard-focus.test.ts`

**Approach:**

- Add PopoverSurface detection to the early-return check in `bindTabCycling`, alongside the existing `[role="dialog"], [role="alertdialog"]` query
- Use `.fui-PopoverSurface` class selector (Fluent UI v9's stable internal class)
- This is a prerequisite for keyboard accessibility in all subsequent units
- Also fixes the pre-existing gap for `zoom-level-popover.tsx` (which uses PopoverSurface and is currently affected by the same Tab-cycling trap)

**Patterns to follow:**

- Existing dialog role check pattern at `src/index.ts:290`
- Test patterns in `src/lib/__test__/keyboard-focus.test.ts`

**Test scenarios:**

- Happy path: Tab key while PopoverSurface is in DOM → `bindTabCycling` yields (returns early), focus not wrapped
- Happy path: Tab key with no PopoverSurface or dialog → `bindTabCycling` wraps focus as before
- Edge case: Both a dialog and a PopoverSurface present → yields (early return)
- Integration: Open `zoom-level-popover` → Tab inside the popover is no longer trapped (verifies the pre-existing gap fix)

**Verification:**

- Tab key works inside a Popover's Monaco editor without being intercepted
- Existing dialog tab-cycling behavior unchanged

---

- [ ] **Unit 2: Reduce truncation limit to 125**

**Goal:** Tighten inline column widths now that the inspector is universally available.

**Requirements:** R4

**Dependencies:** None

**Files:**

- Modify: `packages/app-core/src/features/debug-area/constants.ts`

**Approach:**

- Change `DATA_TABLE_VALUE_MAX_LENGTH` from `250` to `125`
- This constant is consumed by the web worker (via `IWorkerDatasetViewerMessage.valueMaxLength`) and by `SignalValue` directly — both will pick up the change automatically

**Test expectation:** none — pure constant change with no behavioral logic to test

**Verification:**

- Values between 125-250 characters now display placeholder text instead of inline text
- Column widths are visually tighter in the data table

---

- [ ] **Unit 3: Create InspectorPopover component and DataTableInspectorProvider context**

**Goal:** Build the shared Popover+Monaco inspector as a single hoisted instance, coordinated via context. Generalizes the pattern from `ComplexValueCell` and ensures only one inspector is open at a time.

**Requirements:** R1, R3, R8

**Dependencies:** Unit 1

**Files:**

- Create: `packages/app-core/src/features/debug-area/components/data-table/inspector-popover.tsx`
- Create: `packages/app-core/src/features/debug-area/components/data-table/inspector-popover-context.tsx`
- Test: `packages/app-core/src/features/debug-area/components/data-table/__test__/inspector-popover.test.tsx`
- Test: `packages/app-core/src/features/debug-area/components/data-table/__test__/inspector-popover-context.test.tsx`

**Approach:**

**`inspector-popover-context.tsx`** — `DataTableInspectorProvider` exposing via `useDataTableInspector()`:

- State: `{ isOpen: boolean, anchorRef: RefObject<HTMLElement> | null, rawValue: unknown, valueType: WorkerDatasetViewerValueType | null, cellId: string | null }`
- Actions:
    - `openInspector(anchorRef, rawValue, valueType, cellId)` — sets state and opens
    - `closeInspector()` — clears state, returns focus to `anchorRef.current` if still in DOM
    - `isOpenForCell(cellId)` — convenience for cells to compute `aria-expanded`

**`inspector-popover.tsx`** — `<InspectorPopover />` with no props:

- Consumes `useDataTableInspector()` for current state
- Renders Fluent `<Popover open={isOpen} onOpenChange={(_, d) => !d.open && closeInspector()} withArrow positioning={{ target: anchorRef?.current ?? null }}>` — retargets dynamically as `anchorRef` changes between cells
- `<PopoverSurface>` with `POPOVER_Z_INDEX`
- Container div with size determined by `valueType`:
    - Compact (200×80px): `'string' | 'number' | 'boolean' | 'date' | 'key' | 'invalid'`
    - Full (450×350px): `'object' | 'array'`
- Monaco via `buildEditorProps({ theme, fontSize, readOnly: true, showLineNumbers: false, wordWrap: false, language })`
    - `language = 'json'` for `object`/`array`
    - `language = 'plaintext'` for all other types
- Value formatting:
    - `object` / `array`: `formatJson(rawValue) ?? ''`
    - All other types: `String(rawValue)` as plain text (number `42` → `42`, not `"42"`)
    - `null` / `undefined`: `String(null)` → `"null"`, `String(undefined)` → `"undefined"`
    - Do NOT carry over the null guard from `ComplexValueCell`
- Scroll-dismiss: capture-phase window scroll listener, ignoring scrolls inside the editor container (pattern from `ComplexValueCell`). On dismiss, call `closeInspector()`

**Patterns to follow:**

- `ComplexValueCell` at `packages/app-core/src/features/debug-area/components/data-table/complex-value-cell.tsx` — scroll dismiss and Monaco config
- `DataTableTooltipProvider` at `packages/app-core/src/features/debug-area/components/data-table/data-table-tooltip-context.tsx` — context-with-mountNode pattern to follow
- `buildEditorProps` at `packages/app-core/src/components/code-editor/editor-configuration.ts`
- Fluent Popover with dynamic `positioning.target` — see Fluent UI v9 `usePositioning` docs

**Test scenarios:**

_Context:_

- Happy path: `openInspector(ref, {a:1}, 'object', 'cell-1')` → `isOpen: true`, state populated, `isOpenForCell('cell-1')` → `true`, `isOpenForCell('cell-2')` → `false`
- Happy path: `openInspector(...)` then `openInspector(newRef, newValue, ...)` → state replaced; previous cell no longer `isOpenForCell`
- Happy path: `closeInspector()` → `isOpen: false`, state cleared, focus restored on the prior `anchorRef.current`
- Edge case: `closeInspector()` called when anchor element has been unmounted → no throw; focus silently skipped

_Component:_

- Happy path: Provider state set for `valueType: 'object'` and object value → Monaco rendered with `language: 'json'`, formatted JSON, full dimensions (450×350px)
- Happy path: Provider state set for `valueType: 'number'` and value `42` → Monaco rendered with `language: 'plaintext'`, content `42`, compact dimensions (200×80px)
- Happy path: Provider state set for `valueType: 'string'` → language `plaintext`, string displayed as-is
- Edge case: `rawValue: null` → editor shows `"null"`
- Edge case: `rawValue: undefined` → editor shows `"undefined"`
- Edge case: `valueType: 'array'` and empty array `[]` → full size, editor shows `"[]"`
- Happy path: Opening for cell A then cell B without closing in between → popover repositions to cell B's anchor; cell A no longer targeted
- Edge case: Popover open → ancestor container scrolls → popover dismisses, but scroll inside Monaco editor does not dismiss popover
- Integration: Opening then pressing Escape → popover closes, focus returns to the opening cell

**Verification:**

- Only one popover exists in the DOM at any time
- Opening a new cell while one is already open retargets the popover to the new cell
- Popover dimensions and Monaco language match the two-tier scalar/structured split
- Scroll dismiss works (popover closes on ancestor scroll, not on editor-internal scroll)
- Focus returns correctly on close

---

- [ ] **Unit 4: Create DataTableKeyboardProvider and refactor DataTableCell**

**Goal:** Replace the complex/regular cell branching in `DataTableCell` with a unified path. Every cell dispatches to the shared inspector via context. Introduce roving tabindex so only one cell is tabbable at a time.

**Requirements:** R1, R2, R6, R7, R8

**Dependencies:** Unit 3

**Files:**

- Create: `packages/app-core/src/features/debug-area/components/data-table/data-table-keyboard-context.tsx`
- Modify: `packages/app-core/src/features/debug-area/components/data-table/data-table-cell.tsx`
- Test: `packages/app-core/src/features/debug-area/components/data-table/__test__/data-table-cell.test.tsx`
- Test: `packages/app-core/src/features/debug-area/components/data-table/__test__/data-table-keyboard-context.test.tsx`

**Approach:**

**`data-table-keyboard-context.tsx`** — `DataTableKeyboardProvider` exposing via `useDataTableKeyboard()`:

- State: `{ activeCellId: string | null, rowCount: number, colOrder: string[] }`
- Actions:
    - `registerCell(cellId, ref)` / `unregisterCell(cellId)` — cells register their refs on mount so arrow keys can refocus them
    - `setActiveCell(cellId)` — called on focus/click
    - `moveActive(direction: 'up'|'down'|'left'|'right'|'home'|'end')` — computes next cell ID and calls `.focus()` on its ref
    - `isActive(cellId)` → boolean, used for `tabIndex={isActive ? 0 : -1}`
- Initial active cell: first cell of first row when cells register, so Tab into the table lands somewhere sensible
- Cell IDs: `${rowIndex}:${fieldName}` format

**`data-table-cell.tsx` refactor:**

- Remove the `isValuePlaceholderComplex` branching — all cells now get the same treatment
- Remove `ComplexValueCell` rendering path entirely (cleanup happens in Unit 7)
- Add props: `valueType: WorkerDatasetViewerValueType`, `rowIndex: number`, `inspectable?: boolean` (default `true`)
- Render structure per cell:
    ```
    <Tooltip content={getCellTooltip(field, rawValue)} mountNode={tooltipMountNode}>
      <div
        ref={cellRef}
        role="button"
        tabIndex={isActive ? 0 : -1}
        aria-haspopup="true"
        aria-expanded={isOpenForCell(cellId)}
        cursor: pointer
        onClick={() => { setActiveCell(cellId); openInspector(cellRef, rawValue, valueType, cellId); }}
        onKeyDown={handleCellKeyDown}
        onFocus={() => setActiveCell(cellId)}
      >
        {displayValue}
      </div>
    </Tooltip>
    ```
- `handleCellKeyDown`:
    - `Enter` or `' '` (Space) → `preventDefault()`, open inspector
    - `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` → `preventDefault()`, call `moveActive()`
    - `Home` / `End` → `preventDefault()`, jump to row start/end
    - Tab is NOT intercepted — browser handles it, focus escapes the table because no other cells have `tabIndex={0}`
- `registerCell` / `unregisterCell` via `useEffect` for cleanup
- `inspectable={false}` branch: render plain `<Tooltip><div>{displayValue}</div></Tooltip>` with no click/key handlers and no tabIndex — stays out of the keyboard cell registry
- Preserve existing special-field tooltip logic (`getCellTooltip`) — works through the same Fluent `<Tooltip>` wrapper for both inspectable and non-inspectable cells
- No more native `title` attribute anywhere

**Patterns to follow:**

- `DataTableTooltipProvider` at `packages/app-core/src/features/debug-area/components/data-table/data-table-tooltip-context.tsx` — context-with-consumer pattern
- W3C ARIA grid pattern for roving tabindex — <https://www.w3.org/WAI/ARIA/apg/patterns/grid/>
- Existing `getCellTooltip` function in current `data-table-cell.tsx`

**Test scenarios:**

_Context:_

- Happy path: Cells register → first cell of first row becomes the initial active cell
- Happy path: `setActiveCell('0:foo')` → `isActive('0:foo')` → `true`, `isActive('0:bar')` → `false`
- Happy path: `moveActive('right')` from `'0:foo'` when `colOrder = ['foo', 'bar', 'baz']` → active becomes `'0:bar'`, focus called on its ref
- Happy path: `moveActive('down')` from `'0:foo'` → active becomes `'1:foo'`
- Edge case: `moveActive('right')` from the last column → clamps (stays on last cell, does NOT wrap to next row — keeps behavior predictable)
- Edge case: `moveActive('up')` from row 0 → clamps (stays)
- Happy path: `moveActive('home')` → jumps to first cell of current row; `moveActive('end')` → last cell of current row
- Edge case: Cell unmounts (pagination changes pages) → `unregisterCell` clears the ref; if active cell unmounted, active resets to first cell

_Cell component:_

- Happy path: Cell renders with `role="button"`, `aria-haspopup="true"`
- Happy path: Active cell renders with `tabIndex={0}`; inactive cells render with `tabIndex={-1}`
- Happy path: Click on cell → `setActiveCell` called AND `openInspector` called with cell's ref, rawValue, valueType, cellId
- Happy path: Focus cell via Tab → `setActiveCell` called (via `onFocus`)
- Happy path: Keyboard: focus active cell, press Enter → inspector opens
- Happy path: Keyboard: press Space → `preventDefault` called, inspector opens
- Happy path: Keyboard: press ArrowRight → `moveActive('right')` called, focus moves to next cell, inspector does NOT open
- Happy path: Keyboard: press Home → `moveActive('home')` called
- Happy path: Cross-filter status cell → tooltip shows translated status on hover, click opens inspector with raw value
- Happy path: `inspectable={false}` → no role, no tabIndex, no click handler; only tooltip wrapper
- Edge case: Tab from active cell → focus exits table (no other cells are tabbable), lands on next external focusable
- Edge case: Pressing Escape while popover is open → inspector's onOpenChange fires, popover closes, focus returns to cell

**Verification:**

- Exactly one cell has `tabIndex={0}` at any time (verified via `document.querySelectorAll('[role="button"][tabindex="0"]').length === 1` in the table)
- Arrow keys navigate within the grid; Tab exits the table
- All cells are clickable and dispatch to the shared inspector
- Tooltips appear on hover and dismiss when popover opens
- Special field tooltips still show their contextual content

---

- [ ] **Unit 5: Mount shared providers at DataTableViewer and thread valueType/rowIndex**

**Goal:** Wrap the `DataTableViewer` with the new `DataTableInspectorProvider` and `DataTableKeyboardProvider`, mount the single `<InspectorPopover />` instance, and thread `valueType` and `rowIndex` from the worker output to `DataTableCell`.

**Requirements:** R1, R3, R8

**Dependencies:** Unit 4

**Files:**

- Modify: `packages/app-core/src/features/debug-area/components/data-table/data-table.tsx`
- Modify: `packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx`

**Approach:**

**`data-table.tsx`:**

- Wrap the existing `<DataTableTooltipProvider>` tree with `<DataTableInspectorProvider>` and `<DataTableKeyboardProvider>`
- Render `<InspectorPopover />` once inside the provider subtree, outside the scrollable table container
- Pass a `colOrder: string[]` prop to `DataTableKeyboardProvider` so arrow-key navigation knows column sequence (derive from `columns` prop)
- Pass `rowCount` so `moveActive('down')` can clamp correctly

**`dataset-viewer.tsx`:**

- The column `cell` render function currently passes `displayValue`, `field`, `rawValue`
- Add `valueType` from `row[c]?.valueType` and `rowIndex` (available from react-data-table-component's cell render args) to the `DataTableCell` props
- The worker already provides `valueType` in `IWorkerDatasetViewerDataTableFormattedValue` — no worker changes needed

**Patterns to follow:**

- `DataTableTooltipProvider` wrapping in existing `data-table.tsx`

**Test scenarios:**

_DataTableViewer:_

- Happy path: Renders with inspector and keyboard providers wrapping the table; exactly one `<InspectorPopover />` present in the DOM
- Happy path: `colOrder` prop matches the column IDs in order

_Dataset viewer integration (via DataTableCell):_

- Integration: Click a cell with `valueType: 'object'` → popover opens with full dimensions
- Integration: Click a cell with `valueType: 'number'` → popover opens with compact dimensions
- Integration: Arrow-key navigation works across the rendered dataset

**Verification:**

- Only one `InspectorPopover` exists in the DOM regardless of cell count
- DataTableCell receives `valueType` and `rowIndex`; popover sizes correctly per value type
- Roving tabindex works across the real dataset

---

- [ ] **Unit 6: Update signal viewer to pass valueType, rowIndex, and exclude key column**

**Goal:** Thread `valueType` and `rowIndex` to signal value cells. Mark signal key column cells as non-inspectable so they stay out of click-to-inspect and out of the keyboard grid.

**Requirements:** R5, R7

**Dependencies:** Units 4, 5

**Files:**

- Modify: `packages/app-core/src/features/debug-area/components/signal-viewer/signal-viewer.tsx`
- Modify: `packages/app-core/src/features/debug-area/components/signal-viewer/signal-value.tsx`

**Approach:**

**Extract a shared `getValueType()` helper** — first, move the worker's type-classification logic to a shared, importable utility so both the worker and `SignalValue` can use the same function. Options:

- Create `packages/app-core/src/features/debug-area/workers/get-value-type.ts` (pure function, no worker-only imports)
- Worker imports from this module; `SignalValue` imports from it too
- This eliminates the "reimplemented inline" concern from the earlier plan draft

**`signal-viewer.tsx` — key column:**

- Pass `inspectable={false}` to `DataTableCell` for the signal name column
- Omit `valueType` (or pass `'key'` — doesn't matter, unused when `inspectable={false}`)
- Pass `rowIndex` from react-data-table-component's render args

**`signal-value.tsx`:**

- Compute `valueType` via the shared `getValueType()` on the unpruned signal value (before pruning)
- Pass `valueType` and `rowIndex` to `DataTableCell`
- `rowIndex` is available via a prop added when `SignalValue` is rendered from the column `cell` render function

**Patterns to follow:**

- Existing `SignalValue` value processing at `signal-value.tsx` (current `getSignalValues` flow)
- Worker's `getValueType()` in `data-viewer.worker.ts` — now extracted to shared module

**Test scenarios:**

_Shared `getValueType()` helper:_

- Test coverage moved with the extraction. At minimum: `{a:1}` → `'object'`, `[1,2]` → `'array'`, `42` → `'number'`, `new Date()` → `'date'`, `'hi'` → `'string'`, `true` → `'boolean'`, `null` → `'invalid'` (match worker's current classification)

_Signal viewer integration:_

- Happy path: Signal key column cell has no `role="button"`, no `tabIndex`, is not registered in the keyboard grid
- Happy path: Signal key column is skipped by arrow-key navigation (focus moves between value cells only)
- Happy path: Signal value cell is clickable and dispatches to the shared inspector
- Happy path: Signal value that is an object → full-size popover
- Happy path: Signal value that is a number → compact popover
- Edge case: Signal value that is `null` → compact popover showing `"null"`

**Verification:**

- Clicking a signal name does nothing
- Arrow keys in the signal viewer skip the key column
- Clicking a signal value opens the inspector with the correct value and sizing
- `getValueType()` is implemented once and reused; no duplicated classification logic

---

- [ ] **Unit 7: Remove ComplexValueCell component**

**Goal:** Clean up the now-unused `ComplexValueCell` component and its references.

**Requirements:** R1

**Dependencies:** Units 4, 5, 6

**Files:**

- Delete: `packages/app-core/src/features/debug-area/components/data-table/complex-value-cell.tsx`
- Modify: `packages/app-core/src/features/debug-area/components/data-table/data-table-cell.tsx` (remove import if still present)

**Approach:**

- Remove the component file
- Remove any remaining imports or references
- Verify no other consumers exist via grep

**Test expectation:** none — pure deletion of dead code

**Verification:**

- No import errors or broken references
- `isValuePlaceholderComplex` helper is also removed if no longer used

---

- [ ] **Unit 8: Update i18n translations**

**Goal:** Update or add translation keys for the universal inspector interaction.

**Requirements:** R2, R6

**Dependencies:** Unit 4

**Files:**

- Modify: `packages/app-core/src/i18n/en-US.json`

**Approach:**

- Delete the existing `Table_Tooltip_TooLong` key — it references the old icon-button interaction and is no longer triggered
- Add a new key `Table_Aria_InspectCell` with copy like `"Inspect value for {field}"` — used as the `aria-label` on each clickable cell div. The `{field}` placeholder is substituted with the column's field name at render time (use the existing translate() pattern with interpolation)
- The cell's hover tooltip content continues to use the existing field-specific tooltip logic from `getCellTooltip` (dates, cross-filter status, highlight comparator, etc.). The aria-label is a separate, always-present accessibility name that describes the _action_, not the value
- When `inspectable={false}`, omit the aria-label (the cell is not interactive)

**Test expectation:** none — translation text + wiring; behavior verified in Unit 4 tests.

**Verification:**

- No broken translation key references in the build
- Inspector-capable cells render with a field-aware `aria-label` via the `Table_Aria_InspectCell` key
- Screen reader announces the cell as "Inspect value for [field name], button, collapsed"

## System-Wide Impact

- **Interaction graph:**
    - `DataTableViewer` hosts the `DataTableInspectorProvider`, `DataTableKeyboardProvider`, and a single `<InspectorPopover />` instance
    - `DataTableCell` consumes both contexts: registers itself for roving tabindex, dispatches clicks/keypresses to the shared inspector
    - `bindTabCycling` in `src/index.ts` must yield when PopoverSurface is detected (also fixes the pre-existing gap for `zoom-level-popover.tsx`)
    - `DataTableTooltipProvider` portal context is consumed by the Fluent `<Tooltip>` wrapper on every cell
- **Error propagation:** `formatJson` / `String()` failures are caught within `InspectorPopover` (carry over try/catch from `ComplexValueCell`). Empty string fallback on formatting errors.
- **State lifecycle risks:**
    - Single shared popover means no duplicate state — opening cell B while cell A is open simply retargets the popover
    - Active-cell tracking persists across pagination: when pagination changes the visible page, the previous active cell unmounts. `unregisterCell` cleans up; the keyboard provider resets `activeCellId` to the first registered cell on the new page
    - Closing the inspector must guard against the anchor element no longer being in the DOM (e.g., the row scrolled out or pagination changed) — if so, skip focus restoration silently
- **API surface parity:** Both dataset viewer and signal viewer consume `DataTableCell` and are wrapped by `DataTableViewer` — the change propagates to both via the shared component tree.
- **Unchanged invariants:**
    - The pruning depth (`DATA_TABLE_VALUE_MAX_DEPTH = 4`) and the worker's value processing pipeline
    - The overall debug area layout and react-data-table-component wrapper
    - Dataset and signal data flow — the inspector consumes existing `rawValue`/`valueType` surfaced from the worker; no new data pipelines
    - Existing `bindTabCycling` behavior for `[role="dialog"]` — only extended, not replaced

## Risks & Dependencies

| Risk                                                                                   | Mitigation                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PopoverSurface class selector (`.fui-PopoverSurface`) may change in Fluent UI updates  | Use a `data-` attribute instead if the class proves unstable; verify at implementation time. Add a unit test that rerenders an open Popover and asserts `bindTabCycling` yields — will catch silent regressions |
| Compact popover (200×80px) may be too small for Monaco to render usably                | Dimensions are directional — adjust during implementation if Monaco renders poorly at that size. Monaco's minimum practical render height is ~40px; 80px allows for one line of text plus padding               |
| Roving tabindex may conflict with react-data-table-component's internal event handling | Verify during Unit 4 implementation that `onFocus`/`onKeyDown` on cell div aren't swallowed by the library; if they are, use capture-phase listeners                                                            |
| Dynamic `positioning.target` retargeting in Fluent Popover may flicker between cells   | If visible flicker occurs, close first (next tick) then open on the new anchor, rather than retargeting an already-open popover                                                                                 |
| Pagination changes cause active cell to unmount while inspector is open                | Popover's `anchorRef.current` becomes null — inspector provider detects this via `isConnected` check and closes itself                                                                                          |
| Users expect the inspector to show deeper nesting than the cell                        | Plan explicitly acknowledges pruning parity. If feedback shows real demand, add a follow-up that bypasses pruning for inspector display by re-fetching from Vega at click time                                  |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-17-universal-cell-inspector-requirements.md](docs/brainstorms/2026-04-17-universal-cell-inspector-requirements.md)
- **PR #597:** Complex object debugging capabilities (the foundation this extends)
- **Learning:** `docs/solutions/ui-bugs/modal-dialog-tab-trapped-by-keyboard-focus-handler-2026-04-10.md`
- Related code: `packages/app-core/src/features/debug-area/components/data-table/`
