---
title: "Data Viewer Tab Refinements"
date: 2026-04-28
type: requirements
status: ready-for-planning
origin: post-ship dogfooding of feat/data-source-table
related:
  - docs/brainstorms/2026-04-24-data-viewer-source-tab-split-requirements.md
  - docs/plans/2026-04-24-001-feat-data-viewer-source-tab-split-plan.md
---

# Data Viewer Tab Refinements

## Summary

Polish pass on the Source/Data tab split that shipped via [`feat/data-source-table`](docs/plans/2026-04-24-001-feat-data-viewer-source-tab-split-plan.md). Three improvements (tooltips, default tab, loading-flicker mitigation). One pre-emptive concern (renaming) was evaluated and rejected; it is documented under "Evaluated and Rejected" rather than as a deliverable so planning isn't ambiguous about whether it ships.

## Context

The data-viewer tab split is functioning as designed. After dogfooding, the user identified four candidate refinements. This brainstorm interviewed each candidate, challenged the framing where appropriate, and produced a set of decisions ready for planning.

## Goals

- Improve discoverability of what each debug-pane tab does, without depending on naming alone (R1).
- Reduce the load-state flicker that occurs when fast worker jobs cycle the table's loading indicator (R4).
- Make the most informative first-load view the default for new visuals (R2).
- Close the cross-cutting accessibility gaps the original tab split left implicit — loading state, hotkey announcement, tab navigation (R5).

## Non-goals

- Renaming the Source / Data tabs (evaluated and rejected — see "Evaluated and Rejected" below).
- Adding persistence for the inner-tab selection (deliberately omitted in the original plan; not revisiting).
- Reassigning hotkeys (verified already aligned with visual order; no change needed).
- Reworking the loading visual to a fully custom modal-overlay pattern that keeps the prior grid visible behind a translucent layer (deferred — see R4 "Known limitation").

## Default-vs-persistence distinction

R2 changes a slice's *initial value*. The original plan deliberately did not add persistence for the debug pivot (per the focus-mode-viewport-overwrites-persisted-dimensions learning). These are different mechanisms:

- **Initial value** (this brainstorm, R2): the value the slice loads with on every fresh state. Affects every visual on every reload.
- **Persistence** (out of scope): a mechanism that survives reloads by writing through to `stateManagement`. Not added.

The persistence non-goal does not preclude R2; it precludes a different change.

## Requirements

### R1 — Tooltips on all four debug-pane tabs

Add Fluent UI tooltips to the four toolbar buttons in [`debug-toolbar.tsx`](packages/app-core/src/features/debug-area/components/debug-toolbar.tsx). Definition-style copy explaining what each tab shows, with hotkey hints. Host-agnostic phrasing on Source so the copy survives non-Power-BI use cases (e.g. `apps/web-client-sample`).

**Drafted English copy** (final wording at planning time, but tone register and content shape match these):

| Tab | Tooltip | Hotkey |
|---|---|---|
| Source | The processed data your visual receives, before Vega transforms it. | Ctrl+Alt+6 |
| Data | Datasets produced by your compiled Vega spec, after transforms. | Ctrl+Alt+7 |
| Signals | Signal values from the active Vega view. | Ctrl+Alt+8 |
| Logs | Parse errors, warnings, and runtime errors. | Ctrl+Alt+9 |

**Hotkey verification:** Mapping confirmed against [`constants.ts`](packages/app-core/src/lib/commands/constants.ts) lines 63-76. Bindings already match visual order Source/Data/Signals/Logs → 6/7/8/9.

**Hotkey rendering:** R1 owns the *visible* hotkey hint inside the tooltip (e.g. a `<kbd>`-styled element after or below the description). R5.2 owns the *accessible* hotkey announcement via `aria-keyshortcuts` on the button. The two are complementary — sighted users see the hint; assistive tech reads the attribute.

**i18n keys:** New keys following the existing `Tooltip_*` namespace convention (verified — [`en-US.json`](packages/app-core/src/i18n/en-US.json) already has `Tooltip_Collapse_Debug_Pane`, `Tooltip_Expand_Debug_Pane`). Use `Tooltip_Pivot_Debug_Source`, `Tooltip_Pivot_Debug_Data`, `Tooltip_Pivot_Debug_Signals`, `Tooltip_Pivot_Debug_Logs`.

**Fluent v9 mount considerations:** Existing tooltips in this codebase that attach to toolbar buttons use a `TooltipCustomMount` companion (a paired `<div ref={setRef}>` with `mountNode={ref}` on the `<Tooltip>`) due to a Fluent UI 9.20.0 DOM-mounting change. The implementation must follow this pattern. The mount div needs careful placement relative to `ToolbarRadioGroup` to avoid breaking the radio group's DOM invariants — planning should grep existing usage (e.g. the debug-pane collapse/expand toggle) for the established placement.

**Active-tab tooltip behavior:** Tooltip still shows on the active tab (the description still has informational value when keyboard-focused without clicking; users may pause on the active tab to remind themselves what they're looking at). This is an explicit decision, not a default fallthrough.

### R2 — Default the debug pivot to Source

Change the slice initial value of `editorPreviewAreaSelectedPivot` from `'data'` to `'source'`.

**File and line:** [`packages/app-core/src/state/editor.ts`](packages/app-core/src/state/editor.ts) line 219, inside `createEditorSlice`. The current value is `'data'`.

**Scope (verified):** `editorPreviewAreaSelectedPivot` is a transient runtime slice value — NOT persisted to `stateManagement` (verified: the field does not appear in any `persistProperties` write or read path). This means **every visual on every reload uses the slice's initial value.** The change therefore affects all visuals, not just fresh ones. The earlier brainstorm framing of "existing visuals with persisted preference are unaffected" was incorrect; persistence does not exist on this field.

The user-experience impact is mild: a returning user who previously preferred the Data tab will see Source on next reload and click once to switch. Within a session, the chosen tab persists in the slice (not across reloads).

**Why Source as the default first-load view:** the Source tab reveals the dataset the visual receives from the host environment — the most informative starting point for "did I bind the right fields / is the support-field config correct." Data, Signals, and Logs are downstream diagnostics. This is a hypothesis based on the most common debugging entry point for new templates; not measured. Low decision risk (one-click penalty per reload for users who prefer Data).

### R4 — Debounce the table loading indicator

The flicker users observe comes from this guard, present in both [`source-tab.tsx`](packages/app-core/src/features/debug-area/components/dataset-viewer/source-tab.tsx) and [`data-tab.tsx`](packages/app-core/src/features/debug-area/components/dataset-viewer/data-tab.tsx):

```tsx
if (tableState.processing || !tableState.values?.length) {
    return <ProcessingDataMessage />;
}
```

When the worker reports `processing: true`, the component returns the `ProcessingDataMessage` early — the table is unmounted. When processing completes, the table remounts. On fast worker jobs (sort, page, cross-filter, debounced compile), this flashes in and out. The `progressPending` prop passed to `<DataTableViewer />` is currently dead code along the loading path because the early-return runs first.

**The fix:** debounce the `processing` boolean that gates the early-return guard, so fast loads (under ~150ms) never unmount the table at all.

```tsx
// Both tabs, same shape:
const debouncedProcessing = useDebounce(tableState.processing, 150);
if (debouncedProcessing || !tableState.values?.length) {
    return <ProcessingDataMessage />;
}
```

**Implementation notes:**

- `useDebounce` from `@uidotdev/usehooks` is already imported in `data-tab.tsx`. Two inline call sites are simpler than a custom `useDebouncedProgressPending` hook — extract only if a third consumer appears.
- `data-tab.tsx` already has a separate `DATA_LISTENER_DEBOUNCE_INTERVAL = 100` on the data-listener pipeline. The two debounces are independent (one gates worker dispatch; this one gates indicator display) but interact: total time from listener fire → worker dispatch → indicator decision is ~100ms + worker time + 150ms debounce. Planning should measure typical worker round-trip on a representative dataset (500-1000 rows) before locking in 150ms — if measured median exceeds ~50ms, a higher threshold may be warranted.
- **Rapid-toggle semantics:** `useDebounce` from `@uidotdev/usehooks` uses trailing-edge: it returns the most recent value after `delay` ms of stillness. So `false → true → false → true` within 150ms ends with whatever value is last; intermediate transitions are coalesced. This is the desired behavior — rapid cross-filter clicks coalesce into one indicator decision.
- **First-load behavior:** when no prior table exists (`!tableState.values?.length`), the early-return still fires regardless of debounce — the centered spinner shows immediately. Debounce only affects the *transition* from populated table to processing state.

**Known limitation (not a success criterion):** for genuinely-long worker jobs (>150ms), the table still unmounts and the centered spinner replaces it — the original "less jarring" goal is only partly met. The fully custom modal-overlay pattern (loading indicator floating over the still-visible prior grid) is deferred. Revisit trigger: if friction surfaces post-debounce on long loads, scope in the modal overlay as a follow-up.

### R5 — Cross-cutting accessibility pass on the debug pane

The original tab-split work and items R1/R2/R4 above all left some accessibility concerns implicit. R5 makes them explicit and addresses them in this same ship.

**R5.1 — Loading state announcement.** When `processing` becomes `true` post-debounce and the table unmounts to render `<ProcessingDataMessage />`, screen reader users currently get silence — the table disappears from the accessibility tree without any announcement. Add:

- `aria-busy="true"` on the container that wraps the table during the long-load state.
- A `role="status"` (polite live region) inside `<ProcessingDataMessage />` that announces "Loading…" (i18n key — likely `Aria_Debug_Loading` or similar; planning picks the namespace).

The live-region announcement should fire on the *post-debounce* edge, not on every flip of `processing`, so rapid cross-filter clicks don't spam the screen reader.

**R5.2 — Hotkey announcement.** Picks up the open question from R1: how is the keyboard shortcut exposed to assistive tech? The current draft tooltip copy renders the hotkey visually, but a screen reader needs the shortcut surfaced via `aria-keyshortcuts` on each `ToolbarRadioButton`, not as parenthesized text inside the description. Implementation:

- Set `aria-keyshortcuts="Control+Alt+6"` (etc.) on each tab's button. W3C-recommended; assistive tech parses this as a discoverable shortcut.
- The visible hotkey hint inside the tooltip can use a `<kbd>` element or be visually-styled separately from the description text. Either way, it's *redundant* to the `aria-keyshortcuts` attribute — visible affordance for sighted users; the attribute is the authoritative source for AT.

**R5.3 — Tab navigation verification.** Fluent UI's `ToolbarRadioGroup` should already provide arrow-key navigation between the four tabs and Tab/Shift+Tab to enter/exit the group. Verify this works correctly post-flatten (the toolbar was flattened from a nested arrangement during the original feature work), with no focus traps or skipped tabs. No code change expected; this is a verification + test addition.

**Scope boundary:** R5 explicitly does NOT cover audit of every a11y concern in the broader Deneb visual — that is a separate, larger effort. R5 is bounded to the four loose ends above, all of which are touched by R1/R4 work and worth closing in the same ship.

## Evaluated and Rejected

### Tab naming reconsideration

The user reconsidered "Source / Data" as a pre-emptive polish, with no specific incident driving the concern. After evaluation, the current names are retained.

**Alternatives considered:**

- **Source / Vega** — drops the "Data inside the Data row" redundancy but introduces brand-name asymmetry: Vega becomes the odd-one-out among Data/Signals/Logs which are all Vega-domain terms.
- **Mapping / Data** — uses Power BI domain language for the source side. Adds chars; doesn't fix Data's redundancy with the row category.
- **Inputs / Outputs** — symmetric and pretty, but misleading: Vega doesn't *output* the data, it transforms or proxies it.
- **Pre-Transform / Vega** — technically accurate. Long, jargon-heavy, fails compactness.

**Decision rationale:** No alternative was clearly better than the current pair, and the cost/benefit of renaming (i18n key churn, doc updates, user re-learning) is clearly negative when R1's tooltips already carry the disambiguation work. This is not a deferral — it is a deliberate retention.

**Revisit trigger (concrete, not passive):** reopen this question if (a) any user, teammate, or beta tester reports actual confusion about the labels, OR (b) the next major version is being scoped and a redesign opportunity makes a bundled rename cheap.

## Open Questions / Deferred to Implementation

- **Hotkey rendering primitive** — `<kbd>` element vs `aria-keyshortcuts` attribute (R1). Planning picks one based on Fluent v9 primitives.
- **Exact debounce value** — 150ms is the recommendation; planning may tune based on a one-time measurement of worker round-trip on a representative dataset.
- **TooltipCustomMount placement relative to `ToolbarRadioGroup`** — implementation pattern question; grep existing tooltip usage in the debug-pane to find the established convention.

## Out of Scope

- Migration for existing users (no migration is needed — the pivot is transient, not persisted).
- Custom modal-overlay loading pattern (deferred per R4's known limitation).
- Renaming the tabs (decided; see "Evaluated and Rejected").
- Hotkey realignment (verified already aligned).
- Adding persistence for the inner-tab selection (per the original plan's deliberate omission).
- Verifying the `renderId`-on-compilation-recovery invariant has test coverage from Unit 6 of the original plan (orthogonal to this brainstorm; flagged for separate verification if not yet covered).

## Success Criteria

- All four toolbar tabs show contextual tooltips on hover or keyboard focus, with appropriate `Tooltip_Pivot_Debug_*` i18n keys in `en-US.json`.
- Tooltips render via the Fluent v9 `TooltipCustomMount` pattern, matching the existing convention in this codebase.
- Each tab's button carries `aria-keyshortcuts` reflecting its hotkey, parseable by assistive tech as a keyboard-shortcut affordance (R5.2).
- New visuals open with the Source tab selected by default; returning users (with no persistence on the field) see the new default on their next reload — tradeoff explicitly acknowledged.
- Quick worker jobs (sort, page, cross-filter, debounced compile) on populated tables produce no visible flicker (centered spinner is suppressed for sub-150ms loads).
- Long worker jobs (>150ms) set `aria-busy="true"` on the table container and announce "Loading…" via a polite live region inside `ProcessingDataMessage` (R5.1).
- Tab keyboard navigation (arrow keys within the radio group; Tab/Shift+Tab to enter/exit) functions correctly post-flatten with no focus traps (R5.3).
- Existing characterization tests for the debug-pane and dataset-viewer continue to pass; new tests cover the debounce behavior on the early-return guard.

## References

- Original split work: [`docs/plans/2026-04-24-001-feat-data-viewer-source-tab-split-plan.md`](docs/plans/2026-04-24-001-feat-data-viewer-source-tab-split-plan.md)
- Original brainstorm: [`docs/brainstorms/2026-04-24-data-viewer-source-tab-split-requirements.md`](docs/brainstorms/2026-04-24-data-viewer-source-tab-split-requirements.md)
- Implementation surfaces:
  - [`packages/app-core/src/features/debug-area/components/debug-toolbar.tsx`](packages/app-core/src/features/debug-area/components/debug-toolbar.tsx)
  - [`packages/app-core/src/features/debug-area/components/dataset-viewer/source-tab.tsx`](packages/app-core/src/features/debug-area/components/dataset-viewer/source-tab.tsx)
  - [`packages/app-core/src/features/debug-area/components/dataset-viewer/data-tab.tsx`](packages/app-core/src/features/debug-area/components/dataset-viewer/data-tab.tsx)
  - [`packages/app-core/src/state/editor.ts`](packages/app-core/src/state/editor.ts) — slice with `editorPreviewAreaSelectedPivot` initial value at line 219
  - [`packages/app-core/src/lib/commands/constants.ts`](packages/app-core/src/lib/commands/constants.ts) — hotkey bindings (verified)
  - [`packages/app-core/src/i18n/en-US.json`](packages/app-core/src/i18n/en-US.json) — i18n catalog (existing `Tooltip_*` keys at lines 191-212)
