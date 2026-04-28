---
title: "feat: Split data-viewer into Source and Data tabs; remove silent fallback"
type: feat
status: completed
date: 2026-04-24
origin: docs/brainstorms/2026-04-24-data-viewer-source-tab-split-requirements.md
---

# feat: Split data-viewer into Source and Data tabs; remove silent fallback

## Overview

Split the Debug Area's existing `data` pivot into two inner tabs — **Source** (the dataset Vega receives, pre-transform, with support fields intact) and **Data** (the existing Vega-view-named-dataset viewer, minus the fallback chain). Delete the silent source-for-Vega substitution inside `getDatasetValues`; replace it with explicit empty-state messages. Decouple the dataset viewer from `state.debug.logAttention` while preserving the flag for other consumers. Add a metadata strip to each tab (row count universally; support-field badges on Source; error badge on Data). Apply the same explicit empty-state pattern to the Signal viewer.

The existing pivot value `'data'` at the outer level is unchanged; the new split lives *inside* that pivot.

## Problem Frame

Today the `data` pivot's `DatasetViewer` silently substitutes source rows for Vega-view rows under three conditions (`logAttention` true, empty `datasetName`, or `VegaViewServices.getDataByName()` null/throw). Users looking at the viewer during compilation errors cannot tell whether they are seeing what they handed Vega or what Vega produced. The substitution lives inside [`getDatasetValues`](packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx) at lines 378-406 and couples the viewer to `state.debug.logAttention`, accumulating carrying cost. (See origin: [docs/brainstorms/2026-04-24-data-viewer-source-tab-split-requirements.md](docs/brainstorms/2026-04-24-data-viewer-source-tab-split-requirements.md).)

## Requirements Trace

- **R1-R2** — Two-tab layout, `DatabaseLinkRegular` icon on the Source inner-tab button. The Data tab retains the existing root-level `DatasetSelect`.
- **R3** — *Revised from origin:* The Source tab does not include a selector today. Reviewers identified that `state.dataset` has no source-name field to render, so a selector would display either a meaningless constant (`DATASET_DEFAULT_NAME = 'dataset'`) or a placeholder — neither of which advances the stated goals. When multi-source lands (see R12), a Source-tab selector is introduced at that point with a real data source to drive it.
- **R4** — Per-tab independent sort and scroll state.
- **R5** — Source tab renders `state.dataset.values` (verified provenance; see origin Dependencies).
- **R6** — Source metadata strip: row count + support-field name badges.
- **R7-R8** — Data tab consumes `VegaViewServices.getDataByName()` with no fallback; explicit empty-state messages for the distinguishable conditions (view-unavailable vs dataset-unavailable — see Key Technical Decisions).
- **R9** — Data metadata strip: row count + error badge.
- **R10** — Dataset viewer stops reading `state.debug.logAttention`; flag stays in state for other consumers.
- **R11** — Signal viewer adopts the same explicit empty-state messaging pattern (additive, not harmonising — signal viewer has no dedicated empty state today).
- **R12** — Source tab component contract must not hard-code single-source assumptions but does not require widening state shape today.

## Scope Boundaries

- No transform-lineage display in the Data metadata strip (deferred per origin).
- No tab split for the Signal viewer (only empty-state messaging consistency).
- `state.debug.logAttention` flag stays in state; only the dataset viewer's consumption of it is removed.
- No raw pre-support-field view of the Power BI dataset.
- No multi-source ingestion (Source tab carries one entry today).
- `editorPreviewAreaSelectedPivot` outer-pivot set (`log | data | signal`) is unchanged.
- Inner-tab state is transient (in-memory Zustand); **not** persisted in `stateManagement` (per institutional learning — avoid the focus-mode-viewport-overwrites class of bug).

## Context & Research

### Relevant Code and Patterns

- [`packages/app-core/src/features/debug-area/components/debug-area.tsx`](packages/app-core/src/features/debug-area/components/debug-area.tsx) — outer pivot switch host. New inner-tab rendering fits the same `useMemo` + `switch` pattern.
- [`packages/app-core/src/features/debug-area/components/debug-toolbar.tsx`](packages/app-core/src/features/debug-area/components/debug-toolbar.tsx) — existing `Toolbar` + `ToolbarRadioGroup` + `ToolbarRadioButton`. **Strongest precedent** for the new inner switch. Reuse the same primitive rather than introducing `TabList` (no `TabList` usage anywhere in `@deneb-viz/app-core`).
- [`packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx`](packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx) — current viewer. Split into Source + Data components; drop `getDatasetValues` fallback (lines 378-406).
- [`packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-select.tsx`](packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-select.tsx) — selector wired to `state.debug.datasetName`. Must render inert on Source tab, interactive on Data tab.
- [`packages/app-core/src/features/debug-area/components/no-data-message.tsx`](packages/app-core/src/features/debug-area/components/no-data-message.tsx) — current empty-state dispatches on `state.editorPreviewAreaSelectedPivot` (two branches). Needs restructuring to accept an explicit empty-state **reason** argument with distinct messages per condition; the current pivot-based dispatch becomes one call site among many.
- [`packages/app-core/src/features/debug-area/components/log-viewer/log-error-indicator.tsx`](packages/app-core/src/features/debug-area/components/log-viewer/log-error-indicator.tsx) — existing badge precedent. Reuse for the Data-tab error badge; do not introduce a new badge primitive.
- [`packages/app-core/src/features/debug-area/components/signal-viewer/signal-viewer.tsx`](packages/app-core/src/features/debug-area/components/signal-viewer/signal-viewer.tsx) — currently renders the generic `NoDataMessage` with no view-unavailable handling; R11 is additive.
- [`packages/app-core/src/state/debug.ts`](packages/app-core/src/state/debug.ts) — slice to extend. Existing pattern: `StateCreator` + named devtools actions like `'debug.setDatasetName'`.
- [`packages/app-core/src/state/compilation.ts`](packages/app-core/src/state/compilation.ts) lines 315, 382 — `logAttention` setters. Unchanged.
- [`packages/app-core/src/state/dataset.ts`](packages/app-core/src/state/dataset.ts) — `TabularDataset.values` holds the Source-tab content. Verified provenance: populated by [`getMappedDataset` in `src/lib/dataset/processing.ts`](src/lib/dataset/processing.ts) (lines 468-523) from `buildDataRow` output — post-categorical-extraction, post-support-field processing.
- [`packages/app-core/src/i18n/en-US.json`](packages/app-core/src/i18n/en-US.json) — i18n catalog. Existing keys follow `Text_Debug_<Area>_<Purpose>` and `Pivot_<Area>_<Column>` patterns.
- Icon library: `@fluentui/react-icons` (already in use via `Table16Regular`, `Communication16Regular`, etc.). `DatabaseLinkRegular` from the same package.

### Institutional Learnings

- [`docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md`](docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — **Rule applied**: Source and Data tabs will render the same table primitive with overlapping contract (sort/scroll state key, empty-state predicate, metadata-strip composition). Extract the shared contract into a pure helper module both tabs import. No "mirrors the logic in…" comments.
- [`docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md`](docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md) — **Rule applied**: Any Zustand fragment that becomes a keyed record (per-tab sort, per-tab scroll) requires every writer to be audited. Grep every `set(s => ({ …, <field>: x }))` that treats the field as scalar and rewrite to merge into the keyed record preserving sibling tab's state.
- [`docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — **Rule applied**: Per-tab sort/scroll reducers are pure `(prev) => next`. Scroll restoration on tab switch runs in `useLayoutEffect` keyed on active tab, not inside the setState callback.
- [`docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md`](docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md) — **Rule applied**: Keep per-tab UI state in transient Zustand. Do not persist inner-tab selection, sort, or scroll into `stateManagement` — same overwrite-on-mode-change class of bug.
- [`docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md`](docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md) — **Rule applied**: Removing `logAttention` from the dataset viewer's `useEffect` deps changes the listener rebind trigger. Verify `renderId` alone covers the error-recovery path; add a characterization test before removing the dep (see Unit 6).

### External References

None used — local patterns and institutional learnings covered the plan.

## Key Technical Decisions

- **Inner-tab primitive: reuse `ToolbarRadioGroup`, not adopt `TabList`.** Visual consistency with the outer pivot, zero new Fluent primitive adoption. Accepts the tradeoff that a traditional tab-strip affordance (underline-active) is replaced by radio-button-like buttons — which the outer pivot already establishes as the debug-area convention.
- **State shape: add `state.debug.dataPivot: 'source' | 'data'` scalar; keep `state.debug.datasetName` scalar for now.** Resolves the origin doc's Deferred Question about slice shape. The Source tab reads from `state.dataset.values` directly and does not consume `datasetName`, so widening `datasetName` is not required today. R12 is satisfied because the Source tab's component contract (metadata-strip props, selector-disabled-when-N=1) does not hard-code single-source assumptions.
- **Per-tab sort and scroll: lifted to the Zustand slice as keyed-by-tab records.** Keeps the data tab's current sort-persistence behaviour while adding an independent axis for the Source tab. Scroll "position" resolves to current page number (react-data-table-component is paginated); pixel-offset restoration is deferred as not-worth-it.
- **Empty-state component: restructure `NoDataMessage` to accept an explicit reason prop.** Current dispatch on `state.editorPreviewAreaSelectedPivot` is too coarse for the Data tab's distinct conditions. Callers pass the reason; the component renders the appropriate message. After Unit 3, every remaining caller (Source tab, Data tab, Signal viewer) passes a `reason`; the pivot-based back-compat shim is dead code and is removed as part of this work.
- **Empty-state reasons reflect what `VegaViewServices` actually exposes.** `getDataByName()` catches errors internally and returns `undefined` for both "dataset not registered" and "transform failure" (verified by feasibility review against [`packages/vega-runtime/src/lib/view/service.ts`](packages/vega-runtime/src/lib/view/service.ts)). The distinguishable states at the call site are therefore two, not three: `'view-unavailable'` (when `VegaViewServices.getView()` returns null) and `'dataset-unavailable'` (view exists but `getDataByName(name)` returns undefined OR `datasetName` is empty). Separating transform failure from dataset-not-registered requires either modifying the service to propagate errors or inspecting `view.data(name)` directly — deferred as a potential follow-up, not shipped here. A generic dataset-unavailable message is acceptable per the origin's Risk row.
- **Shared tab contract: extracted into `source-and-data-tab-utils.ts`** (pure, no hooks). Both tab components import the metadata-strip composition, row-count helper, and support-field detector. Applies the dual-maintenance learning.
- **`EmptyStateReason` enum lives in a separate module next to `no-data-message.tsx`**, not in `source-and-data-tab-utils.ts`. The enum includes reasons for all three pivots (`source-unavailable`, `source-loading`, `view-unavailable`, `dataset-unavailable`, `no-signals`); placing it inside a `dataset-viewer/`-scoped utils file would create a surprising import path for the signal viewer.
- **Loading vs error distinction on Source tab.** `state.dataset.values` is empty both during normal initial load (before the first Power BI `update()` fills it) and in the rare "source unavailable" genuine-error case. These are semantically distinct: the reason enum carries a dedicated `'source-loading'` so the copy during load doesn't lie to the user with "source unavailable" text.
- **Data tab error badge: thin wrapper over `Warning20Filled`, not direct `LogErrorIndicator` reuse.** Feasibility review found that [`LogErrorIndicator`](packages/app-core/src/features/debug-area/components/log-viewer/log-error-indicator.tsx) reads `state.compilation.result?.errors` and runtime errors directly via `useDenebState` — it would trigger on any compilation error regardless of the current dataset's actual resolution state. Instead, create a small `ErrorBadge` component (or pass an explicit `errors/warnings` prop into a refactored `LogErrorIndicator`) that renders the same Fluent icon primitive driven by local state. The visual is shared; the state coupling is not.
- **Toolbar radio-group isolation.** Fluent UI's `<Toolbar>` manages a single `checkedValues` map and `onCheckedValueChange` handler. Two sibling `ToolbarRadioGroup`s inside one `<Toolbar>` would cross-contaminate. Render the inner tab switcher in a **nested `<Toolbar>`** with its own `checkedValues` / handler, or equivalently split by unique `name` keys per group. Pick nested — cleaner isolation. Add `aria-label` to both toolbars (WCAG 1.3.1) — `"Debug view"` on the outer, `"Data source view"` on the inner.
- **Support-field indicators use `Badge`, not `Tag`.** Fluent `Tag` is interactive / dismissable / focusable; `Badge` is a non-interactive visual indicator. Support-field indicators are informational — using `Tag` leaks keyboard stops and dismiss affordances that make no sense for the use case.
- **`logAttention` decoupling approach.** Unit 6 removes `logAttention` from the viewer's `useEffect` deps. The load-bearing invariant is that compilation error → success transitions bump `renderId` (which lives in `state.interface`, not `state.compilation`). Feasibility review confirmed `renderId` is not currently written from `compilation.ts`; Unit 6 therefore adds the necessary `handleGenerateRenderId` dispatch (or equivalent action) to the compilation slice's error-clear paths before removing the `logAttention` dep.

## Open Questions

### Resolved During Planning

- **Source-tab selector.** *(Resolved via review:)* The Source tab ships without a selector today. `DatasetSelect` derives options from `VegaViewServices.getAllData()` and cannot serve the Source tab's content; adding a new selector would render either a meaningless constant (`DATASET_DEFAULT_NAME = 'dataset'`) or a static placeholder. When multi-source lands, a Source-tab selector is introduced at that point with a real data source.
- **Source tab data mutation on cross-filter selection.** *(Resolved:)* Accept and document. `state.dataset.values` is rewritten by [`getUpdatedDatasetSelectors`](src/lib/dataset/processing.ts) on selection; the Source tab reflects this live behaviour. Release notes call out that Source shows Vega's current input including post-selection `__selected__` rewrites. A pre-selection snapshot would itself misrepresent what Vega actually sees and reintroduce the "show something nicer than reality" pattern the plan set out to remove.
- **Which Fluent primitive for the inner tab bar?** Reuse `ToolbarRadioGroup` rendered in a **nested `<Toolbar>`** (not a sibling inside the outer toolbar). Each toolbar manages its own `checkedValues` / `onCheckedValueChange` to avoid cross-contamination. Both toolbars carry distinct `aria-label` strings.
- **NoDataMessage dispatch shape?** Replace the pivot-based dispatch with a required `reason` prop. All callers after Unit 3 pass `reason`; the old pivot-based code path is removed outright.
- **Inner tab persistence across outer pivot switches?** Lifted to Zustand slice, so naturally persists within-session. Default on first entry is Source. Not persisted across sessions.
- **Scroll position definition?** Page number for MVP (react-data-table-component pagination).
- **`state.debug.datasetName` slice shape?** Keep scalar; Source tab does not read it.
- **Support-field summary visual?** Compact badge row using Fluent `Badge` (non-interactive visual indicator) rather than `Tag` (interactive, dismissable, focusable). The accessibility contract differs.
- **Retiring old i18n keys (`Text_Debug_Data_No_Data`, `Text_Debug_Signal_No_Data`)?** Leave orphaned. Deletion is cheap to skip; external consumers (`capabilities.json`, `pbiviz.json`, docs, downstream templates) may reference them. New keys coexist with the old; the old simply stop being used.

### Deferred to Implementation

- Exact names for new Zustand actions (`setDataPivot`, `setDataTabSort`, `setSourceTabSort`, etc.) — follow existing `'debug.setX'` naming convention at write time.
- Exact i18n key names (`Text_Debug_Source_No_Data`, `Text_Debug_Source_Loading`, `Text_Debug_Data_View_Unavailable`, `Text_Debug_Data_Dataset_Unavailable`, `Text_Debug_Signal_View_Unavailable`, `Text_Debug_Signal_No_Signals`).
- Whether to expose the current page number via react-data-table-component's ref (if unavailable, fall back to sort-only persistence — success criteria remain satisfied).
- The set of writer call-sites that must be audited when adding per-tab keyed state (grepped at implementation time per the type-widening learning).
- Whether the `ErrorBadge` is a new component or a refactor of `LogErrorIndicator` that accepts an explicit `errors`/`warnings` prop — decide at implementation time based on how disruptive the refactor is.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
Outer pivot (existing):
  state.editorPreviewAreaSelectedPivot: 'log' | 'data' | 'signal'
  └─ DebugArea renders: LogViewer | <InnerDataArea /> | SignalViewer

New inner structure (inside the 'data' pivot):
  state.debug.dataPivot: 'source' | 'data'
  │
  ├─ <Toolbar aria-label="Data source view">  (nested inside DebugToolbar's
  │    existing <Toolbar>; its own checkedValues/onCheckedValueChange so the
  │    outer pivot's toolbar state isn't contaminated)
  │    └─ ToolbarRadioGroup (visible only when outer pivot === 'data')
  │         ├─ Source  [icon: DatabaseLinkRegular]
  │         └─ Data
  │
  └─ InnerDataArea switches on state.debug.dataPivot:
       ├─ SourceTab                              reads → state.dataset
       │    ├─ MetadataStrip (row count + support-field Badges)
       │    │    (no selector today — see Resolved During Planning)
       │    └─ DataTableViewer
       │         ↓ reason mapping at call site:
       │         ├─ state.dataset.values === undefined     → reason="source-loading"
       │         ├─ state.dataset.values === [] (post-load) → reason="source-unavailable"
       │         └─ populated                               → render table
       │         <NoDataMessage reason="..." />
       │
       └─ DataTab                                reads → VegaViewServices
            ├─ MetadataStrip (row count + ErrorBadge — wrapper over
            │    Warning20Filled, driven by local reason state; NOT the
            │    compilation-coupled LogErrorIndicator)
            ├─ DatasetSelect (interactive, Vega view's named datasets)
            └─ DataTableViewer
                 ↓ reason mapping at call site (2-way, not 3-way —
                   getDataByName swallows errors, returns undefined):
                 ├─ getView() === null          → reason="view-unavailable"
                 └─ datasetName === '' OR
                    getDataByName(name) === undefined  → reason="dataset-unavailable"
                 <NoDataMessage reason="..." />

Shared contract (new pure module — source-and-data-tab-utils.ts):
  • empty-state reason enum
  • metadata-strip composition helpers
  • support-field-name detection (Object.keys matching /^__.+__$/)
  • row-count calculator
  • per-tab-state key derivation

Per-tab sort/scroll (new in state.debug):
  dataPivotSort: { source: {colId, asc}, data: {colId, asc} }
  dataPivotPage: { source: number, data: number }
  (scalars → keyed records — audit all writers per type-widening learning)

Removed:
  getDatasetValues fallback chain (dataset-viewer.tsx:378-406)
  logAttention prop passed DebugArea → DatasetViewer
  logAttention from dataset-viewer's useEffect deps
```

## Implementation Units

- [x] **Unit 1: Extend debug slice with inner-tab state**

**Goal:** Add `dataPivot` and per-tab sort/page records to `state.debug` with action creators. Run a call-site audit for every writer of the widened fragment.

**Requirements:** R1, R4 (state-layer foundation).

**Dependencies:** None.

**Files:**
- Modify: `packages/app-core/src/state/debug.ts`
- Modify: `packages/app-core/src/lib/commands/actions.ts` (add `handleDataInnerSource` / `handleDataInnerData` action creators, consistent with the existing `handleDebugPaneData` pattern)
- Test: `packages/app-core/src/state/__tests__/debug.test.ts` (new or extend existing)

**Approach:**
- Add scalar `dataPivot: 'source' | 'data'` defaulted to `'source'`.
- Add `dataPivotSort: { source: {colId, asc} | null, data: {colId, asc} | null }` defaulted to both `null`.
- Add `dataPivotPage: { source: number, data: number }` defaulted to `{source: 1, data: 1}`.
- Reducer setters must merge into the keyed record preserving sibling state (per type-widening learning).
- Action names follow `'debug.setDataPivot'`, `'debug.setDataTabSort'`, `'debug.setSourceTabSort'`, `'debug.setDataTabPage'`, `'debug.setSourceTabPage'` — mirror existing `'debug.setDatasetName'` naming.

**Execution note:** Before writing the setters, grep every existing `set(s => ({ …s.debug, … }))` writer and confirm none will inadvertently clobber the new fields. Test-first for the setters themselves — behaviour-level assertions per the project's coverage standard.

**Patterns to follow:**
- [`packages/app-core/src/state/debug.ts`](packages/app-core/src/state/debug.ts) — existing slice shape, `StateCreator` + named devtools actions.
- [`docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md`](docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md) — audit-on-widen checklist.
- [`docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — pure reducers.

**Test scenarios:**
- Happy path: `setDataPivot('data')` updates the scalar and leaves other `debug` fields untouched.
- Happy path: `setDataTabSort({colId: 'foo', asc: true})` updates `dataPivotSort.data` without mutating `dataPivotSort.source`.
- Edge case: setting one tab's sort to `null` (clearing) does not null the other tab's sort.
- Edge case: `setDataPivot` called with the already-active value is idempotent and does not trigger a shallow-equal change.
- Integration: after `setDataTabSort` + `setSourceTabSort`, both values coexist.
- Integration: pre-existing `setDatasetName` continues to work post-widening (no accidental clobber by the new setters).

**Verification:** New fields exist with correct defaults; existing debug-slice tests still pass; writer-audit grep returns no unaddressed call sites.

---

- [x] **Unit 2: Shared tab-contract helpers + empty-state reason enum**

**Goal:** Two pure modules — one scoped to Source/Data tab shared helpers, one for the cross-pivot empty-state reason enum. Splitting them prevents the signal viewer from having to import from a `dataset-viewer/` subdirectory.

**Requirements:** R5, R6, R8, R9, R11 (cross-tab shared contract + cross-pivot empty-state semantics).

**Dependencies:** None (parallelisable with Unit 1).

**Files:**
- Create: `packages/app-core/src/features/debug-area/components/empty-state-reason.ts` (new module co-located with `no-data-message.tsx`, exports the `EmptyStateReason` enum consumed by the dataset-viewer tabs, the signal viewer, and `NoDataMessage`)
- Create: `packages/app-core/src/features/debug-area/components/dataset-viewer/source-and-data-tab-utils.ts` (support-field detector, row-count helper, metadata-strip composition type — dataset-viewer-scoped only)
- Test: `packages/app-core/src/features/debug-area/components/__tests__/empty-state-reason.test.ts`
- Test: `packages/app-core/src/features/debug-area/components/dataset-viewer/__tests__/source-and-data-tab-utils.test.ts`

**Approach:**
- `empty-state-reason.ts` exports `type EmptyStateReason = 'source-loading' | 'source-unavailable' | 'view-unavailable' | 'dataset-unavailable' | 'no-signals'`. Data-tab mapping is two-way (not three) because `VegaViewServices.getDataByName()` swallows internal errors and returns `undefined` — "dataset not registered" and "transform failure" collapse at the call site (verified by feasibility review). Source-tab mapping distinguishes `source-loading` (pre-first-update empty) from `source-unavailable` (post-load empty) so the copy doesn't lie during normal load.
- `source-and-data-tab-utils.ts` exports `detectSupportFields(row: Record<string, unknown> | undefined): string[]` — returns sorted names matching `/^__.+__$/`. Pure; handles undefined/empty-object inputs.
- Export `getRowCount(dataset: VegaDatum[] | null | undefined): number` — trivial but centralised for future provenance changes.
- Export a `MetadataStripSpec` type that both tabs consume (row count value, optional support-field list, optional error-badge indicator).
- No React imports; no hooks; no store access.

**Patterns to follow:**
- [`docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md`](docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — extraction pattern.
- Existing pure-utility style in [`packages/app-core/src/features/debug-area/components/data-table/data-table-keyboard-utils.ts`](packages/app-core/src/features/debug-area/components/data-table/data-table-keyboard-utils.ts) — module shape, JSDoc conventions, test-file location.

**Test scenarios:**
- Happy path: `detectSupportFields` on a row with `{__highlight__, __format__, name}` returns `['__format__', '__highlight__']` sorted alphabetically.
- Edge case: `detectSupportFields` on `undefined` returns `[]`.
- Edge case: `detectSupportFields` on `{}` returns `[]`.
- Edge case: `detectSupportFields` ignores single-underscore keys (`_foo`, `foo_`) and double-underscore non-bookend keys (`__foo`).
- Happy path: `getRowCount` on a 10-item array returns 10.
- Edge case: `getRowCount` on `null`, `undefined`, and `[]` all return 0.
- Enum test: `EmptyStateReason` values are stable strings matching the i18n key suffixes (prevents accidental renames from silently desyncing i18n dispatch).

**Verification:** Both modules are pure (no React or store imports); the enum module is imported by dataset-viewer, signal-viewer, and `NoDataMessage` (three consumers prove it earned its co-location); 100% of helper branches covered.

---

- [x] **Unit 3: Empty-state component restructure**

**Goal:** Refactor `NoDataMessage` to accept an explicit `reason` prop; add new i18n keys; apply the new component to the Signal viewer's view-unavailable path (R11). Preserve existing pivot-based behaviour for any current callers not covered by the tab split.

**Requirements:** R8, R11.

**Dependencies:** Unit 2 (imports `EmptyStateReason`).

**Files:**
- Modify: `packages/app-core/src/features/debug-area/components/no-data-message.tsx`
- Modify: `packages/app-core/src/features/debug-area/components/signal-viewer/signal-viewer.tsx`
- Modify: `packages/app-core/src/i18n/en-US.json` (new keys only — existing keys are left orphaned per Resolved During Planning; non-English translations deferred)
- Test: `packages/app-core/src/features/debug-area/components/__tests__/no-data-message.test.tsx` (new — no current test file)

**Approach:**
- Replace the current pivot-based dispatch with a required `reason: EmptyStateReason` prop. Every caller after Unit 3 passes `reason` (Source tab, Data tab, Signal viewer); the old pivot-based code path stops being reachable.
- Today the data-pivot empty state embeds a `DatasetSelect` inside the `StatusBarContainer` ([`no-data-message.tsx:34`](packages/app-core/src/features/debug-area/components/no-data-message.tsx)). The new component embeds a selector only when `reason` is a Data-tab reason (`'view-unavailable'` / `'dataset-unavailable'`). **User-visible change:** the signal viewer's empty state currently also shows the data-pivot's embedded `DatasetSelect` via the pivot-based dispatch today; after this change the signal-viewer empty state no longer carries a `DatasetSelect`. Acceptable — a dataset selector on the signals empty state was never semantically meaningful, and no test or user flow depends on it.
- Signal viewer detects view-unavailable via `VegaViewServices.getView() !== null` and passes `reason='view-unavailable'`; otherwise the existing "no signals" path passes `reason='no-signals'`.
- New i18n keys added: `Text_Debug_Source_No_Data`, `Text_Debug_Source_Loading`, `Text_Debug_Data_View_Unavailable`, `Text_Debug_Data_Dataset_Unavailable`, `Text_Debug_Signal_View_Unavailable`, `Text_Debug_Signal_No_Signals`. Existing `Text_Debug_Data_No_Data` and `Text_Debug_Signal_No_Data` are **left orphaned** (external consumers may reference them; keys are cheap to keep).
- **Copy tone guidance** (one example per reason — prevents generic "No data available" AI-slop at implementation time; the exact strings are an implementation decision, but the tone should match):
  - `Text_Debug_Source_Loading` — neutral, transient: *"Loading dataset…"*
  - `Text_Debug_Source_No_Data` — informational, persistent: *"No source dataset available. Ensure fields are bound in the visual."*
  - `Text_Debug_Data_View_Unavailable` — points at cause + next action: *"Vega view is not available. See the Log tab for details."*
  - `Text_Debug_Data_Dataset_Unavailable` — points at cause + next action: *"Dataset {datasetName} is not available in the current Vega view."*
  - `Text_Debug_Signal_View_Unavailable` — same tone as data-tab view-unavailable: *"Vega view is not available. See the Log tab for details."*
  - `Text_Debug_Signal_No_Signals` — informational: *"This Vega view has no signals."*

**Patterns to follow:**
- Current [`no-data-message.tsx`](packages/app-core/src/features/debug-area/components/no-data-message.tsx) — keep the `StatusBarContainer` shape; swap the dispatch axis.
- i18n catalog style in [`packages/app-core/src/i18n/en-US.json`](packages/app-core/src/i18n/en-US.json).

**Test scenarios:**
- Happy path: `reason='view-unavailable'` renders the view-unavailable message.
- Happy path: `reason='dataset-unavailable'` renders the dataset-unavailable message.
- Happy path: `reason='source-unavailable'` renders the Source-tab-specific message and does *not* embed a `DatasetSelect`.
- Happy path: `reason='source-loading'` renders the loading message (transient tone, distinct from source-unavailable).
- Happy path: `reason='no-signals'` renders the signal-viewer "no signals" message.
- Edge case: Data-tab reasons (`'view-unavailable'` / `'dataset-unavailable'`) render with an embedded `DatasetSelect` in the `StatusBarContainer`.
- Integration: signal viewer calls `NoDataMessage` with `reason='view-unavailable'` when `VegaViewServices.getView()` returns null; embedded `DatasetSelect` does not appear in this case (user-visible change from today).
- Integration: signal viewer calls `NoDataMessage` with `reason='no-signals'` when the view exists but has no signals.

**Verification:** All three callers (Source tab, Data tab, Signal viewer) always pass `reason`; the old pivot-based dispatch has no remaining callers; new i18n keys present in `en-US.json`; old keys still present (orphaned).

---

- [x] **Unit 4: Inner tab switcher in the Debug Area toolbar**

**Goal:** Render a `ToolbarRadioGroup` inside `DebugToolbar` that's visible only when the outer pivot is `'data'`. Source button uses `DatabaseLinkRegular`; Data button uses an appropriate existing icon (e.g. `Table16Regular`) or no icon for visual asymmetry that emphasises which is which.

**Requirements:** R1, R2, R3.

**Dependencies:** Unit 1 (reads/writes `state.debug.dataPivot`). Unit 5 and Unit 6 stubs (exports only — empty component bodies or placeholder text) required to complete `debug-area.tsx` routing without breaking imports; production component bodies land in Units 5 and 6.

**Files:**
- Modify: `packages/app-core/src/features/debug-area/components/debug-toolbar.tsx`
- Modify: `packages/app-core/src/features/debug-area/components/debug-area.tsx` (route inner content based on `state.debug.dataPivot` when outer pivot is `'data'`)
- Test: `packages/app-core/src/features/debug-area/components/__tests__/debug-area-inner-tab-switcher.test.tsx` (new)

**Approach:**
- Wrap the new inner tab switcher in a conditional render block inside `DebugToolbar`: `{editorPreviewAreaSelectedPivot === 'data' && <InnerDataTabSwitcher />}`.
- `InnerDataTabSwitcher` renders a **nested `<Toolbar>`** (not a sibling `ToolbarRadioGroup` inside the existing toolbar). Each `<Toolbar>` manages its own `checkedValues` / `onCheckedValueChange` to avoid cross-contamination of the outer pivot's state (Fluent UI `Toolbar` manages a single `checkedValues` map across all radio groups inside it).
- Add `aria-label="Debug view"` to the outer `<Toolbar>` in `debug-toolbar.tsx` (currently unlabelled — WCAG 1.3.1) and `aria-label="Data source view"` to the inner nested `<Toolbar>`.
- `DebugArea`'s `data` case becomes `<InnerDataArea />` which switches on `state.debug.dataPivot` to render `<SourceTab />` (Unit 5) or `<DataTab />` (Unit 6).
- Actions fire via the action creators defined in Unit 1.

**Patterns to follow:**
- [`packages/app-core/src/features/debug-area/components/debug-toolbar.tsx`](packages/app-core/src/features/debug-area/components/debug-toolbar.tsx) — `ToolbarRadioGroup` / `ToolbarRadioButton` composition, action-dispatch pattern.
- `@fluentui/react-icons` imports — same style as existing `Table16Regular` imports in the debug-area module.

**Test scenarios:**
- Happy path: with outer pivot `'data'`, inner tab switcher is rendered; with outer pivot `'log'` or `'signal'`, it is not.
- Happy path: clicking the Source radio updates `state.debug.dataPivot` to `'source'`; clicking Data updates to `'data'`.
- Edge case: default state (`dataPivot === 'source'`) renders Source as active.
- Integration: switching from outer pivot `'data'` to `'log'` and back preserves the user's last-chosen inner tab (within-session persistence via slice).
- Integration: `debug-area.tsx` routes to `SourceTab` / `DataTab` components based on slice state (stubs acceptable while Units 5 and 6 are in progress).
- Integration: changing the inner tab's `checkedValues` does **not** affect the outer pivot's `checkedValues` (nested `<Toolbar>` isolation test — guards against Fluent's single-map-per-toolbar contract causing cross-contamination).
- Accessibility: both outer and inner `<Toolbar>` elements carry `aria-label` attributes with distinct values; a screen reader can distinguish the two radio groups.

**Verification:** Inner tab switcher appears only in the data pivot; keyboard navigation works (inherited from `ToolbarRadioGroup`); default selection is Source; `DatabaseLinkRegular` icon renders on the Source button; both toolbars have `aria-label`; outer pivot state does not leak into inner switcher state.

---

- [x] **Unit 5: Source tab component**

**Goal:** New `SourceTab` component that reads from `state.dataset.values`, renders a metadata strip (row count + support-field badges), and renders the table via `DataTableViewer`. No selector on the Source tab today. No fallback; if `state.dataset.values` is `undefined` render `NoDataMessage reason='source-loading'`; if `[]` render `NoDataMessage reason='source-unavailable'`.

**Requirements:** R5, R6, R12.

**Dependencies:** Units 1, 2, 3.

**Files:**
- Create: `packages/app-core/src/features/debug-area/components/dataset-viewer/source-tab.tsx`
- Create: `packages/app-core/src/features/debug-area/components/dataset-viewer/metadata-strip.tsx` (shared between Source and Data tabs; owned by this unit)
- Modify: `packages/app-core/src/features/debug-area/components/debug-toolbar.tsx` (hide the root-level `DatasetSelect` when `state.debug.dataPivot === 'source'` — the Source tab has no selector today; `DatasetSelectInitializer` placement unchanged)
- Test: `packages/app-core/src/features/debug-area/components/dataset-viewer/__tests__/source-tab.test.tsx`
- Test: `packages/app-core/src/features/debug-area/components/dataset-viewer/__tests__/metadata-strip.test.tsx`

**Approach:**
- `SourceTab` subscribes to `state.dataset.values` via `useDenebState`; derives support-field names once per render via `detectSupportFields` on the first row (cheap, unless dataset is empty).
- Distinguish `undefined` (pre-first-update loading state) from `[]` (post-load empty) at the call site — maps to `reason='source-loading'` and `reason='source-unavailable'` respectively.
- `MetadataStrip` takes a `spec: MetadataStripSpec` prop and composes children declaratively. Support-field badges use **Fluent `Badge`** (non-interactive visual indicator — per Key Technical Decisions, not `Tag`, which is interactive/dismissable/focusable).
- **No selector on the Source tab.** The root-level `DatasetSelect` is hidden when `dataPivot === 'source'` because there is no Source-tab content it could meaningfully switch between. When multi-source lands, a Source-tab selector is added with a real data source driving it (see R12).
- Per-tab sort and page state reads/writes via `state.debug.dataPivotSort.source` and `state.debug.dataPivotPage.source`.
- Scroll-state persistence via current page number only (not pixel offset) — see Deferred Questions.
- Source tab shows rows including any `__selected__` rewrite from cross-filter selection (per Resolved During Planning).
- Component contract: the metadata-strip, support-field detection, and row-count calculator accept dataset + name arguments; they are not hard-coded to single-source inputs. A future multi-source consumer iterates the same primitives.

**Patterns to follow:**
- [`packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx`](packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx) — existing component style (hooks at top, render body, exported as named const, logRender call).
- [`packages/app-core/src/features/debug-area/components/data-table/data-table.tsx`](packages/app-core/src/features/debug-area/components/data-table/data-table.tsx) — `DataTableViewer` props contract (re-used unchanged).
- [`docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — scroll restoration via `useLayoutEffect` keyed on active tab, not inside setState.

**Test scenarios:**
- Happy path: `state.dataset.values` with 10 rows including `__highlight__` and `__format__` renders a `DataTableViewer` with 10 rows, a metadata strip showing "10 rows" and two support-field badges.
- Happy path: support-field badges render in alphabetical order (from `detectSupportFields`).
- Edge case: `state.dataset.values === undefined` (pre-first-update) renders `NoDataMessage` with `reason='source-loading'` and *does not* mount `DataTableViewer`.
- Edge case: `state.dataset.values === []` (post-load empty) renders `NoDataMessage` with `reason='source-unavailable'`.
- Edge case: `state.dataset.values` with no support-field keys renders metadata strip with row count only — no badge row.
- Edge case: on the Source tab, the toolbar does *not* render `DatasetSelect` (the root-level selector is hidden when `dataPivot === 'source'`).
- Edge case: on cross-filter selection, `state.dataset.values` is rewritten and the Source table re-renders with the new `__selected__` values — documented expected behaviour.
- Integration: sorting a column writes to `state.debug.dataPivotSort.source` but leaves `state.debug.dataPivotSort.data` untouched.
- Integration: switching inner tab to Data and back preserves the Source tab's sort column.
- Integration: row index and value cells still invoke the `DataTableCell` / `DataTableHeaderCell` components with correct props (no regression in cell rendering).
- Accessibility: support-field badges are rendered with `Badge` (non-interactive, no focus stop) — assert the rendered elements do not have `tabindex` or interactive role.

**Verification:** Source tab mounts cleanly with real Power BI data; support-field badges appear when relevant; sort persists across inner-tab round-trips; no selector appears in the toolbar on the Source tab; loading state and post-load empty state render distinct copy.

---

- [x] **Unit 6: Data tab refactor — remove fallback; decouple `logAttention`; characterize listener rebind**

**Goal:** Rename the current `DatasetViewer` to `DataTab`, delete the `getDatasetValues` fallback chain (lines 378-406), stop reading `state.debug.logAttention`, wire per-tab sort/page state, and render empty-state messages via `NoDataMessage` with the appropriate reason. Characterize the listener rebind behaviour **before** removing `logAttention` from the `useEffect` deps.

**Requirements:** R1, R4, R7, R8, R9, R10.

**Dependencies:** Units 1, 2, 3.

**Files:**
- Rename + modify: `packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx` → `data-tab.tsx` (preserve git-blame via `git mv` at implementation time)
- Modify: `packages/app-core/src/features/debug-area/components/debug-area.tsx` (stop passing `logAttention` prop; route to `DataTab` via the new `InnerDataArea` container)
- Modify: `packages/app-core/src/state/compilation.ts` (dispatch `handleGenerateRenderId` — or equivalent `renderId` bump — from the two recovery paths at lines 315 and 382 so the dataset-viewer listener re-binds on compile recovery)
- Test: `packages/app-core/src/features/debug-area/components/dataset-viewer/__tests__/data-tab.test.tsx`
- Test (characterization): `packages/app-core/src/features/debug-area/components/dataset-viewer/__tests__/data-tab-listener-rebind.test.tsx`
- Test: `packages/app-core/src/state/__tests__/compilation-render-id.test.ts` (new — asserts the compilation recovery paths bump `renderId`)

**Approach:**
- **Test discipline: characterization + new assertion, framed separately.**
  - *Characterization tests* capture existing behaviour as a regression guard that stays green across the change: `renderId` change cycles the listener; `datasetName` change cycles the listener. These are behaviour-preserving — the post-change code must still cycle on those triggers.
  - *A new assertion* captures the intentional behaviour change: with `renderId` and `datasetName` held constant, toggling `logAttention: true → false` today cycles the listener; after the change, it must **not**. This test's expected value inverts across the refactor — it is not characterization (which would be green-to-green); it is the assertion that proves the dep removal is intentional. Author it after the characterization suite is green, flip the expectation as part of the production change, and land the flip in the same commit as the dep removal.
- **Add `renderId` increment to compilation-recovery paths.** Feasibility review confirmed `renderId` is not written anywhere in [`packages/app-core/src/state/compilation.ts`](packages/app-core/src/state/compilation.ts) today — it lives in [`packages/app-core/src/state/interface.ts`](packages/app-core/src/state/interface.ts) (writers at lines 106, 183, 198 via `setType` / `handleGenerateRenderId`). As written, recovery paths at `compilation.ts:315` and `:382` flip `logAttention: true → false` but do not bump `renderId`, so the dep removal would break the listener-refresh-on-recovery invariant the plan relies on. Unit 6 dispatches `handleGenerateRenderId` (or an equivalent action) from those two recovery paths **before** removing the `logAttention` dep. This is a prerequisite, not an audit — the fix is already known.
- Delete `getDatasetValues` function entirely; replace the single call site (line 265) with direct calls to `VegaViewServices`: check `getView() !== null` first, then read `getDataByName(datasetName)`. The service catches errors internally and returns `undefined` on both "dataset not registered" and "transform failure" (verified by feasibility review), so the reason mapping at the call site is two-way, not three:
  - `VegaViewServices.getView() === null` → `reason='view-unavailable'`
  - view exists AND (`datasetName === ''` OR `getDataByName(datasetName) === undefined`) → `reason='dataset-unavailable'`
- Render `NoDataMessage` with the mapped reason instead of data table when any reason is set.
- Remove `logAttention` from the component's props interface and the `useEffect` dep array. Update `DebugArea` to not pass it.
- Per-tab sort and page read/write via `state.debug.dataPivotSort.data` / `state.debug.dataPivotPage.data`.
- Metadata strip: row count + error-badge (reuse `LogErrorIndicator` or a thin wrapper; when `emptyStateReason !== null`, show the badge).

**Execution note:** Characterization-first. Start with `data-tab-listener-rebind.test.tsx` that exercises the current (pre-change) behaviour on a fixture view, confirm green, *then* make the production change, *then* confirm still-green. Preserves behavioural invariant across the refactor (per stale-echo learning).

**Patterns to follow:**
- Current [`dataset-viewer.tsx`](packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx) — structure of the Vega listener useEffect, debounce pattern, worker dispatch. Preserve everything except the fallback and `logAttention` coupling.
- [`packages/app-core/src/features/debug-area/components/log-viewer/log-error-indicator.tsx`](packages/app-core/src/features/debug-area/components/log-viewer/log-error-indicator.tsx) — icon primitive (`Warning20Filled`) for the new `ErrorBadge` component. Per Key Technical Decisions, do *not* import `LogErrorIndicator` directly into the Data-tab metadata strip — it reads compilation state via `useDenebState` and would trigger on any compile error regardless of dataset state. The wrapper uses the same icon but is driven by the local Data-tab reason.
- [`docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md`](docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md) — listener-rebind hazard.

**Test scenarios:**
- Happy path: valid view + valid `datasetName` + non-undefined `getDataByName` result → `DataTableViewer` renders the Vega view's rows; metadata strip shows row count, no badge.
- Edge case: `VegaViewServices.getView()` returns null → `NoDataMessage` with `reason='view-unavailable'`; metadata strip shows error badge.
- Edge case: view exists but `datasetName === ''` → `NoDataMessage` with `reason='dataset-unavailable'`.
- Edge case: view exists but `getDataByName(datasetName) === undefined` → `NoDataMessage` with `reason='dataset-unavailable'`.
- Edge case (stale-name transition): previously-valid `datasetName` becomes invalid mid-session (e.g. spec recompiles without that name) — tab transitions from populated to `reason='dataset-unavailable'`; metadata strip shows error badge; the selector in `DebugToolbar` still displays the stale name (planning expectation, not a test assertion).
- Integration: `state.debug.logAttention` toggling between `false` and `true` does *not* affect what the tab renders (the component no longer reads the flag).
- Integration (characterization): when `renderId` changes, the data listener is cycled (removed from old view, added to new view). Green before AND after the refactor — regression guard.
- Integration (characterization): when `datasetName` changes, the listener is cycled. Green before AND after — regression guard.
- Integration (new assertion, inverts across the change): with `renderId` and `datasetName` held constant, toggling `logAttention: true → false` cycles the listener **today** (green before the refactor); after the refactor the same transition must **not** cycle. Flip the expectation in the production-change commit; both sides are green at their respective points in history.
- Integration (compilation-recovery): dispatching a compilation error then recovery through [`compilation.ts`](packages/app-core/src/state/compilation.ts) bumps `renderId` in `state.interface` (by Unit 6's add of `handleGenerateRenderId` to the recovery paths), which in turn cycles the listener. Covers the load-bearing invariant the `logAttention` dep used to carry implicitly.
- Integration: sorting writes to `state.debug.dataPivotSort.data` and does not mutate `dataPivotSort.source`.
- Integration: `grep -r "storeDs\|getDatasetValues" packages/app-core/src/features/debug-area` returns zero matches after the change.

**Verification:** All empty-state conditions render correct messages in the dev harness; sorting independent of Source tab; `logAttention` prop removed from `DatasetViewer` (now `DataTab`); characterization tests stay green across the refactor; the new `logAttention`-transition assertion flips as expected; `renderId` bump on compilation recovery verified; grep for `getDatasetValues` / `storeDs` returns no matches.

## System-Wide Impact

- **Interaction graph:** `state.debug.logAttention` — existing setters in [`state/compilation.ts`](packages/app-core/src/state/compilation.ts) (`:315`, `:382`) keep flipping the flag; only the dataset-viewer consumer is removed. Log viewer and any badge-styling consumer continue to read it. `state.debug.datasetName` scalar untouched; inner-tab state is additive. `DatasetSelectInitializer` behaviour unchanged. `DatasetSelect` rendering gains one conditional in `DebugToolbar` (hidden when `dataPivot === 'source'`); the component internals are unchanged.
- **Error propagation:** Previously, `VegaViewServices.getDataByName` nulls/throws were caught-and-substituted inside the dataset viewer (silent). After: the call site checks `getView()` explicitly, reads `getDataByName`, and converts undefined/null returns to explicit empty-state reasons. No substitution, no thrown errors leak — the service already swallows internal errors and returns undefined.
- **State lifecycle risks:** Inner-tab sort and page state are in-memory only — no persistence; clearing the visual state resets them. Not persisted in `stateManagement` (per focus-mode-viewport learning). Listener lifecycle on error-recovery depends on `renderId` incrementing whenever compilation transitions error→success — Unit 6 adds that increment to `compilation.ts` since it does not exist today.
- **API surface parity:** `DatasetViewer` → `DataTab` is a rename + internal refactor; no external API. `NoDataMessage` changes from a pivot-reading component to a `reason`-prop-driven component; internal to the debug area. Compilation slice gains a dispatch of `handleGenerateRenderId` (or equivalent) on error-clear paths — internal plumbing. No package public API changes.
- **Integration coverage:** Unit-test integration scenarios cover sort independence, listener rebind across `renderId` / `datasetName` triggers, the intentional `logAttention` decoupling, the compilation-recovery `renderId` invariant, and toolbar state isolation between outer and inner groups. A full-integration manual QA pass with a real Power BI visual is expected (not automated) — spec author flipping between tabs during a compile error, dataset with and without support fields, multi-dataset specs with transform failures on one dataset only, cross-filter clicks rewriting `__selected__` on the Source tab.
- **Unchanged invariants:**
  - `state.editorPreviewAreaSelectedPivot` values remain `'log' | 'data' | 'signal'`.
  - `state.debug.logAttention` value semantics unchanged (compilation.ts still flips it on error/recovery); only the dataset-viewer consumer is removed.
  - `state.dataset.values` content and mutation path (including `getUpdatedDatasetSelectors` selection rewrite at `src/lib/dataset/processing.ts:534`) are untouched.
  - `DataTableViewer` contract and `DataTableCell` rendering unchanged.
  - The existing `DatasetSelectInitializer` placement at debug-area root is unchanged.
  - `VegaViewServices` public methods are unchanged.
  - `DatasetSelect` internals (option derivation from `getAllData()`) unchanged; only its render conditionality changes.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Removing `logAttention` from the viewer's `useEffect` deps breaks listener rebind on error recovery because `renderId` is **not currently incremented on compile recovery**. | Unit 6 adds `handleGenerateRenderId` dispatch to compilation.ts recovery paths (lines 315, 382) **before** removing the dep. The "logAttention true→false" assertion test flips expected value across the refactor commit; characterization tests on `renderId` / `datasetName` triggers stay green both sides. Three-layered guard. |
| Widening `state.debug` fragments from scalars to keyed records clobbers sibling state in an unaudited writer. | Unit 1 includes a grep-and-audit step for all `set(s => ({ …s.debug, … }))` writers (per type-widening learning). Feasibility review confirms only three writers exist today (`debug.ts:50`, `compilation.ts:315`, `compilation.ts:382`) — audit is quick. |
| Source vs Data tabs drift apart in their metadata-strip or sort-key contract. | Unit 2 extracts the shared contract into a pure helper module imported by both (per dual-maintenance learning). `EmptyStateReason` enum lives separately, co-located with `no-data-message.tsx`, so the signal viewer isn't forced to import from a dataset-viewer subdirectory. |
| `react-data-table-component` does not expose a reliable public API for page-state capture. | Scroll persistence falls back to sort-only persistence per origin's Deferred Question — success criteria remain met. |
| `VegaViewServices.getDataByName()` swallows errors internally; the call site cannot distinguish "dataset not registered" from "transform failure." | Ship the two-way distinction (`view-unavailable` vs `dataset-unavailable`) that is observable. If the finer-grained distinction becomes valuable, a follow-up can modify the service to propagate errors or use `view.data(name)` directly. |
| The Source tab's `state.dataset.values` is mutated by `getUpdatedDatasetSelectors` on cross-filter selection — rows visibly shift on click. | **Resolved:** accept and document (per Resolved During Planning). The rewrite *is* what Vega sees; snapshotting a pre-selection view would itself misrepresent Vega's actual input. Release notes call this out. |
| Two sibling `ToolbarRadioGroup`s inside one `<Toolbar>` silently share `checkedValues` / `onCheckedValueChange` — outer pivot and inner tab state would cross-contaminate. | Unit 4 renders the inner tab switcher in a **nested `<Toolbar>`** with its own handler. Integration test in Unit 4 guards against regression by asserting outer state doesn't change when inner state flips. |
| `LogErrorIndicator` reads compilation state directly via `useDenebState`; reusing it in the Data-tab metadata strip would couple the badge to unrelated compile errors. | Unit 6 creates a thin `ErrorBadge` wrapper (or widens `LogErrorIndicator` with a prop) that reuses the `Warning20Filled` icon primitive but is driven by the Data-tab's local reason state. Plan acknowledges the "avoid parallel badge component" claim doesn't hold as written and adopts the wrapper explicitly. |
| Signal viewer's empty state currently embeds `DatasetSelect` (via the pivot-based dispatch); removing the pivot path strips this. | User-visible but not load-bearing — a dataset selector on the signals empty state was never semantically useful, and no flow depends on it. Called out in Unit 3's approach and tests. |
| Renaming `DatasetViewer` to `DataTab` via file rename loses git blame if done as delete + create. | Use `git mv` + minimal follow-up edits to preserve history. Feasibility review confirms only one external import site (`debug-area.tsx`) needs updating. |

## Documentation / Operational Notes

- New i18n keys land in `en-US.json`; non-English locales are out of scope for this plan (follow-up per settings-pane-search precedent).
- No user-facing release-note copy required beyond "Debug pane now shows Source and Data as separate tabs" — a one-liner in CHANGELOG at version-bump time.
- No rollout / monitoring / feature-flag concerns — UI-only, client-side.
- Update [`CLAUDE.md`](CLAUDE.md) Data Flow section if the prose describes the dataset-viewer fallback behaviour (grep-and-verify at implementation time).
- No bundle-size concerns (additive code is small; `DatabaseLinkRegular` is one icon from an already-imported package).

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-24-data-viewer-source-tab-split-requirements.md](docs/brainstorms/2026-04-24-data-viewer-source-tab-split-requirements.md)
- Institutional learning — dual-maintenance extraction: [docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md](docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md)
- Institutional learning — type widening audit: [docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md](docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md)
- Institutional learning — pure setState updaters: [docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md)
- Institutional learning — focus-mode persisted dimensions: [docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md](docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md)
- Institutional learning — stale-echo listener lifecycle: [docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md](docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md)
- Related plan (multi-source forward compatibility): [docs/brainstorms/2026-04-14-multi-dataset-template-structure-requirements.md](docs/brainstorms/2026-04-14-multi-dataset-template-structure-requirements.md)
- Related code:
  - [packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx](packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx)
  - [packages/app-core/src/features/debug-area/components/debug-toolbar.tsx](packages/app-core/src/features/debug-area/components/debug-toolbar.tsx)
  - [packages/app-core/src/features/debug-area/components/no-data-message.tsx](packages/app-core/src/features/debug-area/components/no-data-message.tsx)
  - [packages/app-core/src/state/debug.ts](packages/app-core/src/state/debug.ts)
  - [src/lib/dataset/processing.ts](src/lib/dataset/processing.ts)
