---
title: 'Fluent DataGrid fill-the-rest column: per-viewer autoFitColumns plus containerWidthOffset for row padding'
date: 2026-08-19
category: ui-bugs
module: app-core
problem_type: ui_bug
component: tooling
severity: medium
symptoms:
    - 'Signals tab value column clips at exactly 500px with empty space to its right'
    - 'After enabling autoFitColumns, a ~10px horizontal scrollbar appears on a table that fits'
root_cause: wrong_api
resolution_type: code_fix
related_components:
    - debug-area
    - data-table
    - signal-viewer
tags:
    - fluent-ui
    - datagrid
    - autofitcolumns
    - containerwidthoffset
    - column-sizing
    - debug-pane
    - signal-viewer
    - rdt-migration
---

# Fluent DataGrid fill-the-rest column: per-viewer `autoFitColumns` plus `containerWidthOffset`

## Problem

After `DataTableViewer` moved from react-data-table-component (rdt) to Fluent UI `DataGrid`
(#723), the debug pane's Signals tab value column stopped filling the available width and
clipped at a fixed 500px. rdt's `grow: 5` weight had no equivalent once auto-fit was disabled
grid-wide.

## Symptoms

- Value cell starts at x≈235 and clips at x≈735 — exactly `SIGNAL_VALUE_COLUMN_WIDTH` (500).
- First fix attempt (autofit on) produced a phantom horizontal scrollbar of ~10px on a table
  that visibly fits its container.

## What Didn't Work

- **Cell-level CSS (`flex: 1`, `width: 100%` on the value cell).** Fluent tracks column widths
  in DataGrid's own sizing state (`node_modules/@fluentui/react-table/lib/utils/columnResizeUtils.js`)
  and applies them as inline `width/minWidth/maxWidth`; class-level CSS on the cell is not the
  lever.
- **Just flipping `autoFitColumns` on for everyone.** The dataset viewer depends on
  worker-measured widths overflowing horizontally (see the 2026-07-20 landmines doc, item 4);
  autofit would compress those to `minWidth`.
- **Autofit alone.** `adjustColumnWidthsToFitContainer` makes column widths sum to the
  _measured grid width_, but our header/body rows carry `paddingLeft: DATA_TABLE_ROW_PADDING_LEFT`
  (10px). Fitted row = container + 10px → scrollbar.

## Solution

1. Opt-in prop on `DataTableViewer` (`data-table-viewer-types.ts`), default `false`; the signal
   viewer passes it:

    ```tsx
    // data-table.tsx — was hard-coded { autoFitColumns: false }
    resizableColumnsOptions={{ autoFitColumns }}

    // signal-viewer.tsx
    <DataTableViewer columns={columns} data={values} autoFitColumns />
    ```

    With autofit on, Fluent stretches the **last** column to absorb remaining width and
    compresses toward `minWidth` when the container is narrower — the `grow` semantics we lost.

2. Tell autofit about the row padding using DataGrid's `containerWidthOffset` (documented as
   "make sure the columns don't overflow the table"):

    ```tsx
    containerWidthOffset={-DATA_TABLE_ROW_PADDING_LEFT}
    ```

    Set once in `data-table.tsx`; inert for non-autofit viewers (only autofit consumes the
    container width).

Shipped in `4ff259d9`.

## Why This Works

Fluent's autofit is a reducer over `containerWidth` (from `useMeasureElement` on the grid) plus
`containerWidthOffset`. Subtracting exactly our own row padding makes the fitted row land
flush; there is no need for an artificial cap. Keeping the flag per-viewer preserves the
dataset viewer's honour-measured-widths behaviour while giving two-column "key / value" tables
the fill behaviour they had under rdt.

## Prevention

- **Rule:** any `DataGrid`/`DataTableViewer` instance that turns on `autoFitColumns` must also
  account for our row chrome via `containerWidthOffset` (currently `-DATA_TABLE_ROW_PADDING_LEFT`
  from `packages/app-core/src/features/debug-area/constants.ts`). If row padding changes, the
  offset changes with it — keep them referencing the same constant.
- Keep `autoFitColumns` opt-in at the viewer level, never grid-wide; the dataset/source tabs'
  horizontal overflow is load-bearing.
- Diagnose Fluent width issues from the sizing state, not CSS: read
  `columnResizeUtils.js` (`adjustColumnWidthsToFitContainer`, `getTotalWidth` includes 16px
  per-column padding) and check for exact-pixel matches against your `idealWidth`.

## Related Issues

- `docs/solutions/ui-bugs/fluent-datagrid-migration-landmines-2026-07-20.md` — item 4 is the
  "disable autofit" rule this doc refines to per-viewer.
- `docs/solutions/tooling-decisions/debug-table-fluent-datagrid-over-rdt-v8-2026-07-20.md` —
  the migration decision that created `DataTableViewer`.
