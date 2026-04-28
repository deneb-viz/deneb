---
date: 2026-04-24
topic: data-viewer-source-tab-split
---

# Data viewer: split source vs. Vega datasets into two tabs

## Problem Frame

The Debug Area's `data` pivot conflates two distinct concerns behind a single viewer:

1. **The source dataset** — the rows Vega receives from the visual (post-categorical-data extraction, with support fields like `__highlight__`, `__format__`, `__formatted__` present, pre-transform).
2. **The Vega view's named datasets** — the same source plus any derived datasets produced by the spec's `data` and transform definitions.

Today, a single `DatasetViewer` component shows whichever named dataset the user picked, but silently falls back to the source under three conditions inside [`getDatasetValues`](packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx#L378-L406):

- `logAttention === true` (compilation or runtime errors pulled attention to the log)
- `datasetName` is empty
- `VegaViewServices.getDataByName()` returns null or throws

A spec author debugging a rendering issue cannot tell whether the rows they see are what Vega is working with or the raw source Vega never consumed. The fallback chain has also accumulated carrying cost: it couples the dataset viewer to `state.debug.logAttention`, re-derives data-access semantics at every render, and turns what should be two orthogonal questions ("what did I give Vega?" and "what has Vega done with it?") into one ambiguous answer.

The intent of this change is to surface both views explicitly — as two tabs inside the `data` pivot — and remove the fallback layer entirely. A Vega tab with no Vega view is a visible error state, not a silent substitution.

## Requirements

**Tab structure and navigation**

- R1. The `data` pivot renders a two-tab layout: a new **Source** tab and the existing **Data** tab (unchanged naming). The Data tab preserves the current viewer behaviour minus the fallback paths (R7). The outer pivot value (`editorPreviewAreaSelectedPivot === 'data'`) does not change.
- R2. The Source tab uses the `DatabaseLinkRegular` Fluent icon. The Data tab's visual treatment is unchanged (no icon additions required for this work).
- R3. The dataset selector that lives at the Debug Area toolbar level stays at that level and remains active on both tabs. On the Source tab it displays the single currently-available source entry today — rendered as a visibly-inert control (disabled select or plain label) so the user isn't offered a choice that doesn't exist, with the control becoming interactive when multi-source eventually lands (see R12). On the Data tab it enumerates every named dataset in the active Vega view.
- R4. Switching tabs preserves each tab's own sort column, sort direction, and scroll position independently. Switching back to a tab restores the state the user last saw there.

**Source tab content**

- R5. The Source tab displays the dataset as Vega receives it: post-categorical-data extraction from the Power BI dataView, post-support-field processing, pre-Vega-transform. Support fields (`__highlight__`, `__format__`, `__formatted__`, etc.) are present and visible — they are part of what was handed to Vega.
- R6. The Source tab's metadata strip displays (a) row count and (b) a support-field summary indicating which support fields are present across the dataset (e.g. a compact list of field names or a badge row). Error state on the Source tab is limited to "source dataset unavailable" — a condition that should rarely happen in practice and indicates a genuine upstream failure, not a Vega-side issue.

**Data tab content**

- R7. The Data tab consumes the Vega view's named datasets directly via `VegaViewServices.getDataByName()` (or an equivalent provenance-safe accessor) with **no fallback to the source dataset** under any condition. `getDatasetValues`'s three-way fallback chain is removed.
- R8. When the Vega view is unavailable (pre-compile, compilation error, runtime error, missing named dataset), the Data tab remains enabled and renders an explicit empty-state message naming the condition (e.g. "Vega view unavailable — see Log tab", "Dataset `<name>` is not registered in the current view"). The tab is never silently populated with source data.
- R9. The Data tab's metadata strip displays (a) row count and (b) an error badge when the dataset cannot be resolved or has a transform failure. Transform lineage is explicitly deferred (see Scope Boundaries).

**State decoupling**

- R10. The dataset viewer stops reading `state.debug.logAttention`. The flag survives in state for other consumers (log viewer, badge styling), and its setters in [`compilation.ts`](packages/app-core/src/state/compilation.ts#L315) remain unchanged. This brainstorm explicitly does not delete the flag.
- R11. The Signal viewer adopts the same explicit empty-state messaging pattern used by the Data tab (R8) when the Vega view is unavailable. This is an **additive** change: today the signal viewer renders the generic `NoDataMessage` component with no dedicated view-unavailable handling, so R11 introduces new messaging rather than harmonising existing copy. No structural change to the signal viewer; no tab split.

**Future readiness**

- R12. The Source tab should not actively hard-code single-source assumptions in ways that would require the selector contract to be reshaped when multi-source lands (ref: [`docs/brainstorms/2026-04-14-multi-dataset-template-structure-requirements.md`](docs/brainstorms/2026-04-14-multi-dataset-template-structure-requirements.md)). This does *not* require building array-shaped state, per-entry selection UI, or pluralised copy today; those land with multi-source. The ask is narrow: avoid `[0]`-indexing and avoid scalar-only type signatures where a collection signature would cost the same to write.

## Success Criteria

- A spec author viewing the `data` pivot during normal rendering can, without inspecting code or logs, say definitively whether they are looking at source rows or Vega's post-transform rows.
- Breaking the Vega compilation produces an explicit empty state on the Data tab within the same render cycle it produces the log error — never a silent substitution with source data.
- Switching between Source and Data tabs feels instant; sort and scroll state in each tab survive the switch.
- `getDatasetValues`'s fallback chain is removed from the codebase. A grep for `storeDs()` inside the dataset viewer returns no matches after the change.
- Opening the Source tab for a spec that uses `__highlight__`, `__format__`, or `__formatted__` immediately surfaces the presence of those fields without the user having to scroll the table.
- Signal viewer's pre-compile / compilation-error empty state is indistinguishable in tone and phrasing from the Data tab's equivalent state.

## Scope Boundaries

- **Out of scope — transform lineage in the Data tab metadata strip.** Walking Vega's compiled spec to show "this dataset is derived from X via aggregate" is a deferred follow-up. MVP metadata is row count + error badge only.
- **Out of scope — tab split for the Signal viewer.** Signals are Vega-view-only with no source equivalent; only the empty-state messaging is harmonised (R11).
- **Out of scope — deleting `state.debug.logAttention`.** The flag is decoupled from the dataset viewer (R10) but remains in state for other consumers.
- **Out of scope — a raw (pre-support-field) view of the Power BI dataset.** Earlier in the interview this was considered as a toggle within the Source tab and rejected. Source tab shows the dataset exactly as Vega receives it, support fields and all. A future brainstorm can revisit if support-field-stripped inspection becomes a real need.
- **Out of scope — multi-source dataset support.** Tracked separately; the Source tab's structure must be compatible (R12) but this brainstorm does not ship multi-source.
- **Out of scope — changes to the outer pivot set.** `log` / `data` / `signal` remain the three pivots at the Debug Area level.

## Key Decisions

- **Tabs, not side-by-side panels or an inline toggle.** Tabs give each view its own sort/scroll state cleanly (R4), match user expectation for "switch views of the same concern", and leave the existing toolbar layout intact.
- **No fallback, ever.** The fallback chain is the root of the ambiguity; extracting it behind a strategy pattern would preserve the ambiguity under a cleaner name. Deleting it is simpler and the empty-state messages (R8) give the user better information than silent substitution did.
- **Selector stays at debug-area root rather than moving into each tab.** Preserves muscle memory for existing users; on the Source tab the single-entry selector doubles as a label and is future-ready for multi-source (R12).
- **`logAttention` survives as a flag.** Decoupling the dataset viewer from it is sufficient; removing it entirely would require auditing every consumer and is not justified by this brainstorm's goal.
- **Per-tab state over shared state.** A source table sorted by one column and a Vega-derived table sorted by another is the genuine comparison workflow. Shared state would force one to lose context whenever the user switched.

## Dependencies / Assumptions

- **Verified (by feasibility reviewer):** the dataset as Vega receives it is materialised in the Zustand store as `state.dataset.values` (`TabularDataset.values: VegaDatum[]`), populated by `getMappedDataset` in [`src/lib/dataset/processing.ts:468-523`](src/lib/dataset/processing.ts) from the output of `buildDataRow`. This is post-categorical-extraction and post-support-field processing — R5 is satisfiable against existing state with no new accessor or embed-time persistence.
- **Selection-state caveat.** `getUpdatedDatasetSelectors` ([`src/lib/dataset/processing.ts:534`](src/lib/dataset/processing.ts)) mutates `dataset.values` after cross-filter selection (`__selected__` rewritten, `dataset.version` bumped). Source tab rows will therefore shift on user selection. Planning should decide whether "the dataset Vega receives" for the Source tab includes that post-selection mutation (it *is* what Vega sees) or should show a pre-selection snapshot.
- `VegaViewServices.getDataByName()` is the canonical accessor for Vega's named datasets today; the Data tab will continue to use it, minus the null/throw fallback that wraps it currently.
- Per-tab sort and scroll state implies duplicating state the single viewer holds today (`sortColumnId`, `sortAsc`) and adding capture-and-restore for scroll (not tracked today). `react-data-table-component` is paginated, so "scroll position" likely resolves to current page number rather than pixel offset — planning must confirm and, if pixel-offset restoration proves impractical via the library's public API, fall back to sort-only persistence (see Deferred Questions).

## Outstanding Questions

### Resolve Before Planning

*(none — decisions above are complete for planning handoff)*

### Deferred to Planning

- [Affects R1, R4] Which Fluent UI primitive best implements the Source | Data tab bar inside the `data` pivot — `TabList`, `Pivot`-style switching, or something lighter-weight. No existing `TabList` usage in the repo; the toolbar uses `ToolbarRadioGroup`. Choice affects vertical-space budget in the compact debug pane.
- [Affects R8][Technical] The existing [`NoDataMessage`](packages/app-core/src/features/debug-area/components/no-data-message.tsx) reads `state.editorPreviewAreaSelectedPivot` to dispatch between two i18n keys. The Data tab's three distinct empty-state conditions (view unavailable / dataset not registered / transform failure) need either (a) a new sub-tab axis of state, (b) an explicit condition prop, or (c) a new component per condition. Planning decides the dispatch shape.
- [Affects R9][Technical] Detecting "transform failure for a named dataset" as distinct from "view missing entirely" — does Vega expose a per-dataset error signal, or does planning need to derive it? Affects the error-badge implementation. Consider reuse of [`LogErrorIndicator`](packages/app-core/src/features/debug-area/components/log-viewer/log-error-indicator.tsx) as the badge primitive rather than introducing a new one.
- [Affects R10][Technical][Needs research] `logAttention` currently appears in the `useEffect` dependency array at [`dataset-viewer.tsx:326`](packages/app-core/src/features/debug-area/components/dataset-viewer/dataset-viewer.tsx#L326) and drives listener re-cycling on error transitions. Removing it from the effect deps changes listener-cycle behaviour; planning must verify that `renderId` changes alone (which accompany compile/runtime error transitions) are sufficient to refresh the data listener on error recovery.
- [Affects R4][Needs research] "Scroll position" in the paginated `react-data-table-component` resolves to current page number, not pixel offset. Planning must confirm the library exposes page-state accessors for capture-and-restore. If scroll restoration is impractical via the public API, fall back to persisting sort only — success criteria remain satisfied.
- [Affects R1, R4] **Active inner tab persistence across outer pivot switches.** When the user switches from `data` → `log` → `data`, which inner tab should be active on return? Default options: reset to Source, restore last-active within-session, persist across sessions. Recommended: last-active within-session (preserves context without the carrying cost of cross-session persistence).
- [Affects R6][Product decision] Exact visual treatment of the support-field summary (badge row with count, comma-separated name list, disclosure/collapsible list). Each implies a different affordance: badge-count is scannable but hides names; name list is scannable but takes horizontal space; disclosure hides until asked. Pick before metadata-strip implementation.
- [Affects R1-R3, R12] The existing [`state.debug.datasetName`](packages/app-core/src/state/debug.ts) is a scalar string. With two tabs each potentially wanting a selected dataset, planning decides: keep scalar and derive tab state implicitly, lift to per-tab scalars, or widen to a structure. R12's "avoid hard-coding single-source" applies to the Source tab's consumer of this value, not the slice shape itself.

## Review Challenges Carried Forward

Document-review raised six challenges to decisions made during the brainstorm interview. Each is accepted for now (user elected to proceed to planning) but recorded here so planning can re-surface any that look load-bearing once the implementation shape is clearer. None block planning; all are re-openable with user consent.

- [Affects Problem Frame, R7, R8][Challenged by: adversarial, product-lens] **Is the tab split disproportionate to the ambiguity?** A label on the existing viewer ("Source (Vega view unavailable)") would arguably solve the epistemic problem without removing the fallback. Current behaviour — showing source during compile error — is defensible as a feature: when the spec is broken, source is the only thing worth inspecting. Accepted because the interview established the goal as both UI clarity and removal of the fallback layer's carrying cost; a label alone addresses only the first.
- [Affects R4][Challenged by: adversarial, product-lens, scope-guardian] **Per-tab sort/scroll state vs. shared.** Three reviewers argue shared state is the cheaper default — sequential exploration ("source right? ok, now Vega's transform right?") is more common than side-by-side comparison, and per-tab state compounds with any future multi-source entry. Accepted because the user picked per-tab explicitly; revisit if scroll-restoration proves impractical (see Deferred Questions).
- [Affects R6][Challenged by: product-lens, scope-guardian] **Support-field summary may exceed MVP.** Row count earns its keep; the support-field summary accelerates a secondary concern (support-field visibility) whose problem statement isn't in the primary Problem Frame. Suggested split: R6a (row count, required) + R6b (summary, defer). Accepted in current form; revisit if the visual-treatment decision (see Deferred Questions) adds non-trivial scope.
- [Affects R11][Challenged by: product-lens, scope-guardian] **Signal viewer parallel treatment is arguably scope creep.** Neither stated goal requires the signal viewer to change. Accepted because the interview surfaced it as a cohesiveness concern; demote to a follow-up if planning reveals the additive messaging cost is more than a trivial copy addition.
- [Affects R1, R2][Challenged by: product-lens] **Tab naming may not self-explain pre-transform vs post-transform** for variably-experienced spec authors. Accepted ("Source" / "Data" locked in) but planning should consider a one-line inline description on each tab to close the literacy gap without changing the tab labels.
- [Affects Problem Frame overall][Challenged by: adversarial] **Unconsidered alternative — keep one viewer, add "Source" as an entry in the selector.** Single state, ambiguity made explicit via naming, no R4 duplication, no R12 debt. Rejected implicitly by the interview's "two tabs" framing but never evaluated head-to-head. Worth acknowledging so planning doesn't rediscover it as a mid-implementation pivot question.

## Next Steps

`-> /ce:plan` for structured implementation planning.
