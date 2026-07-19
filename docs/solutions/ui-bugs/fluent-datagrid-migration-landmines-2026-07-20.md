---
title: 'Fluent UI v9 DataGrid migration landmines: arity-sniffed sortability, size-variant border drop, auto-fit compression'
date: 2026-07-20
category: ui-bugs
module: app-core
problem_type: ui_bug
component: tooling
severity: high
symptoms:
    - 'Column header clicks silently do nothing despite grid-level `sortable` and controlled `sortState`'
    - 'No divider line between the header row and the first body row'
    - 'Rows render 44px tall despite `minHeight` overrides targeting 24px'
    - 'Columns compress/wrap to fit the container instead of honouring configured widths and overflowing horizontally'
root_cause: wrong_api
resolution_type: code_fix
related_components:
    - debug-area
    - data-table
tags:
    - fluent-ui
    - datagrid
    - sorting
    - column-sizing
    - griffel
    - react
---

# Fluent UI v9 DataGrid migration landmines

## Problem

Rebuilding the debug-pane `DataTableViewer` on Fluent UI v9 `DataGrid` (PR #723) hit four
non-obvious library behaviors that each produced a silent visual or functional regression.
All were diagnosed by reading the installed library source under
`node_modules/@fluentui/react-table/lib/` — none are documented prominently upstream.

## Symptoms

- Header clicks never fired `onSortChange`, with no error or warning.
- The header/body divider vanished while body-row dividers (explicitly styled) survived.
- Rows stayed at 44px despite Griffel `minHeight: 24px` overrides.
- Columns squeezed below their configured widths, wrapping header/cell text, instead of
  overflowing with a horizontal scrollbar.

## What Didn't Work

- **Sorting:** grid-level `sortable`, controlled `sortState`, and per-column definitions were
  all correct; the header still rendered inert. Nothing in the props surface hinted why.
- **Row height:** `minHeight` on row/cell classes can only raise, never lower, the size
  variant's own height.
- **Widths:** `columnSizingOptions` `idealWidth`/`minWidth` were set correctly but appeared
  to be ignored under space pressure.

## Solution

1. **Sortability is decided by the declared arity of `compare`.**
   `isColumnSortable(column)` is literally `column.compare.length > 0`. An inert
   `compare: () => 0` (arity 0) marks the column unsortable and header clicks are dropped.
   When sorting is handled externally (the grid only ever receives one page of rows, so its
   internal compare must not be used), the no-op must still declare two parameters:

   ```ts
   compare: column.sortable
       ? (_a: unknown, _b: unknown) => 0 // arity 2 → header sortable
       : () => 0 // arity 0 → suppresses the sort affordance entirely
   ```

2. **The `extra-small` size variant drops the built-in row border.** `medium` and `small`
   `TableRow` variants carry `borderBottom`; `extra-small` sets only `fontSize`. Any divider
   styling must be restated on both body rows AND the header row.

3. **Row height comes from the size variant, not your CSS.** `TableCell` styles pin
   `medium: 44px / small: 34px / extra-small: 24px`. Pass `size='extra-small'` on the
   DataGrid (it flows into Table context via `...props`) instead of fighting it with CSS.

4. **`resizableColumns` auto-fits (compresses) columns by default.**
   `resizableColumnsOptions.autoFitColumns` defaults to `true`, shrinking columns toward
   `minWidth` to fit the container. To honour pre-measured pixel widths with horizontal
   overflow (classic data-table behavior): `resizableColumnsOptions={{ autoFitColumns: false }}`.

## Why This Works

Fluent's DataGrid conflates "has a usable comparator" with "is sortable" via function arity
— defensible for its internal-sorting design, hostile to external sorting. The size variants
are applied at the cell level through Table context, so component-level CSS loses. Auto-fit
is designed for app-chrome tables that should never scroll horizontally, which inverts the
expectation of a data-inspection table.

## Prevention

- When a Fluent component ignores correct-looking props, read the installed source under
  `node_modules/@fluentui/*/lib/` — the `.styles.raw.js` files are human-readable and show
  exactly what each variant sets.
- Keep the in-code comments on the arity-based `compare` pair in `data-table.tsx`; a future
  reader will otherwise "simplify" the arity-2 no-op back to `() => 0` and silently kill
  sorting.
- External sorting with DataGrid must sort the FULL dataset before pagination; the grid's
  internal compare would sort only the visible page.
