---
title: 'Debug-pane data table: Fluent DataGrid over react-data-table-component v8 (decision record)'
date: 2026-07-20
category: tooling-decisions
module: app-core
problem_type: tooling_decision
component: tooling
severity: medium
applies_when:
    - 'Choosing or replacing a table/grid library for editor-side (non-certified-render-path) UI'
    - 'Evaluating any dependency upgrade whose payoff depends on bundle size near the ~2MB certified ceiling'
    - 'A dependency reads browser storage (localStorage/sessionStorage) anywhere in its mount path'
related_components:
    - debug-area
    - data-table
tags:
    - react-data-table-component
    - fluent-ui
    - datagrid
    - bundle-size
    - sandbox
    - dependency-selection
---

# Debug-pane data table: Fluent DataGrid over rdt v8

## Context

The debug-pane table ran on `react-data-table-component` (rdt) v7.7.0 + styled-components.
An upgrade to rdt v8 (PR #719) was attempted for its new `cellNavigation` ARIA grid, then
abandoned; a rebuild on Fluent UI v9 `DataGrid` (PR #723) replaced it instead. This records
why, and the criteria for ever revisiting rdt.

## Guidance

**Why rdt v8 was abandoned** (full record in the #719 close comment):

1. **Bundle grew** 1,997 → 2,011 KB gz against the ~2MB certified ceiling — v8 ships
   filtering/pinning/resize/inline-edit/context-menu/localization the debug pane never uses,
   outweighing the styled-components removal it enabled.
2. **Sandbox crash**: v8's `useColorMode` reads `localStorage.getItem('theme')` in a
   `useState` initializer with only an SSR guard. Power BI visuals run in a sandboxed iframe
   without `allow-same-origin`, where ANY `localStorage` access throws `SecurityError` — the
   table crashed into the editor error boundary on mount. (Workaround existed: probe the
   accessor and shadow it with an inert stub via `Object.defineProperty` — permitted even in
   sandboxed documents — but it is a shim to carry forever.)
3. **Layout regressions**: v8's DOM/CSS restructure broke the status-bar flex pinning and
   introduced a persistent horizontal scrollbar.
4. The headline `cellNavigation` benefit was blocked upstream anyway: no cell-activation
   callback (Enter hardwired to inline-edit), no `aria-rowcount`, no PageUp/PageDown.

**Why Fluent DataGrid won**: already installed (zero new dependencies — the "already-paid-for
dependency" rung), natively themed (the entire token-translation `customStyles` block
disappeared), proven inside the PBI sandbox by the rest of the app, and the old equal-width
objection is obsolete — `columnSizingOptions` takes declarative per-column pixel widths.
Pagination isn't built in, but Deneb always owned the pagination UI; only a ~10-line slice
was needed. Measured outcome: bundle ~1,787 KB gz (−210 KB vs baseline), rdt AND
styled-components removed.

**Costs accepted**: column drag-reorder dropped (no DataGrid equivalent); signal-viewer
`grow` weights became fixed pixel widths; no built-in "no records" empty-grid text;
header Enter-to-sort deferred to the ARIA-grid follow-up.

## Why This Matters

Two generalizable lessons:

- **Smoke-test dependency upgrades against the real host early.** Three of the four
  abandonment reasons (sandbox crash, layout, bundle) were only visible in the Power BI
  harness, not in unit tests — and the bundle prediction ("removing styled-components will
  shrink it") was wrong until measured.
- **A dependency you already ship beats a better-featured one you don't**, especially under
  a hard bundle ceiling: the marginal cost of Fluent DataGrid was near zero because it
  shares primitives already in the bundle.

## When to Apply

- Revisit rdt only if ALL hold: upstream guards the `useColorMode` storage read;
  `cellNavigation` gains a cell-activation callback; the bundle delta re-measures
  acceptably. (Branch `chore/data-table-v8` was retained as a head start.)
- Treat any dependency that touches `localStorage`/`sessionStorage` during mount as
  sandbox-hostile until proven otherwise — grep the dist for `localStorage` before adopting.

## Examples

The one-line sandbox repro heuristic used in #719 triage:

```
grep -c "localStorage" node_modules/<candidate>/dist/*.js
```

Any hit in a mount/initializer path is a crash in the PBI sandbox unless guarded.
