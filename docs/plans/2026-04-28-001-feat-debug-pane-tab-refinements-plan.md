---
title: "feat: Debug pane tab refinements (tooltips, default, debounce, a11y)"
type: feat
status: completed
date: 2026-04-28
origin: docs/brainstorms/2026-04-28-data-viewer-tab-refinements-requirements.md
---

# feat: Debug pane tab refinements (tooltips, default, debounce, a11y)

## Overview

Polish pass on the recently-shipped Source/Data tab split. Four refinements: (R1) Fluent UI tooltips with i18n on the four debug-pane tabs, (R2) change the default debug pivot from `'data'` to `'source'`, (R4) eliminate fast-load flicker by debouncing the early-return guard that controls table mount/unmount, and (R5) close the cross-cutting accessibility gaps the original split left implicit (`aria-busy` on loading state, `aria-keyshortcuts` on tabs, keyboard navigation verification).

R3 (renaming) was evaluated and rejected during the brainstorm — current names retained. (See origin: [docs/brainstorms/2026-04-28-data-viewer-tab-refinements-requirements.md](docs/brainstorms/2026-04-28-data-viewer-tab-refinements-requirements.md).)

## Problem Frame

The Source/Data tab split shipped via `feat/data-source-table` is functioning as designed, but post-ship dogfooding surfaced four quality-of-life gaps:

- **Discoverability:** the four tab labels work for users who already know what each shows, but require disambiguation for users learning Vega or new to the visual.
- **First-load default:** every visual currently lands on the Data tab. A hypothesis (not measured): the Source tab is the more informative starting point for the most common debugging entry point ("did I bind the right fields / is the support-field config correct"). Low decision risk — one-click penalty per reload for users who prefer Data.
- **Loading flicker:** every fast worker job (sort, page, cross-filter, debounced compile) momentarily replaces the populated table with `<ProcessingDataMessage />`, then restores it — a visible flash on every interaction.
- **Accessibility loose ends:** the long-load state silently disappears from the accessibility tree (no `aria-busy`); the keyboard shortcuts on each tab are not exposed as discoverable shortcuts via `aria-keyshortcuts`.

## Requirements Trace

- **R1.** Tooltips on each of the four pivot tabs with i18n keys, host-environment-agnostic phrasing on Source.
- **R2.** Default debug pivot changes from `'data'` to `'source'` for fresh state.
- **R4.** Quick worker jobs (<150ms, threshold to be measurement-validated) on populated tables produce no visible flicker.
- **R5.1.** Long worker jobs (>150ms) set `aria-busy="true"` on the loading-state container. Screen-reader announcement is carried by Fluent's existing `<Spinner label>` (no separate live region — see Key Technical Decisions).
- **R5.2.** Each tab's button carries `aria-keyshortcuts` reflecting its hotkey.
- **R5.3.** Tab keyboard navigation (arrow keys within the radio group; Tab/Shift+Tab to enter/exit) functions correctly post-flatten with no focus traps.

## Scope Boundaries

- No renaming the Source / Data tabs (decided in the brainstorm; see "Evaluated and Rejected" in the origin doc).
- No persistence for `editorPreviewAreaSelectedPivot` (deliberately omitted in the original split plan; not revisiting).
- No fully custom modal-overlay loading pattern over the still-visible prior grid. Revisit trigger: any user report of long-load context-loss confusion within two release cycles, OR if the Unit 3 measurement reveals the debounce threshold needs to exceed ~300ms to suppress flicker (suggesting the long-load case is the dominant one).
- No reassignment of the existing hotkey bindings — verified already aligned with visual order.
- No broader a11y audit of the Deneb visual beyond the four loose ends in R5.
- No migration step for existing visuals — the pivot is transient; no `stateManagement` write to migrate.
- No separate live region for loading-state announcements — Fluent's `<Spinner label>` handles announcement; adding a parallel `role="status"` region would risk double-reading on NVDA / VoiceOver.

## Context & Research

### Relevant Code and Patterns

- [`packages/app-core/src/features/debug-area/components/debug-toolbar.tsx`](packages/app-core/src/features/debug-area/components/debug-toolbar.tsx) — outer `<Toolbar aria-label='Debug view'>` with `<ToolbarRadioGroup>` containing four `<ToolbarRadioButton>` siblings (values `'source' | 'data' | 'signal' | 'log'`). The `<LogErrorIndicator />` is a child of the `'log'` button and must remain unaffected.
- [`packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx`](packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx) lines 80-99 — canonical `<TooltipCustomMount>` pattern for a single tooltip-wrapped button. For four buttons in one parent component, use a single `useRef<Record<DebugPaneRole, HTMLElement | null>>` instead of four `useState` pairs (mount nodes don't need re-renders, and one ref object is simpler than four state pairs).
- [`packages/app-core/src/components/ui/tooltip-custom-mount.tsx`](packages/app-core/src/components/ui/tooltip-custom-mount.tsx) — the mount-companion component itself.
- [`packages/app-core/src/features/debug-area/components/dataset-viewer/source-tab.tsx`](packages/app-core/src/features/debug-area/components/dataset-viewer/source-tab.tsx) line 181 — the early-return guard. Note: source-tab uses `!tableState.rows` (truthy check on the whole array). The early-return returns a 3-level wrapper div (`container > wrapper > details`) containing `<ProcessingDataMessage />` as a nested child, NOT a bare `<ProcessingDataMessage />`.
- [`packages/app-core/src/features/debug-area/components/dataset-viewer/data-tab.tsx`](packages/app-core/src/features/debug-area/components/dataset-viewer/data-tab.tsx) line 429 — the equivalent guard. Note: data-tab uses `!datasetState.values?.length` (length check). Same 3-level wrapper return shape as source-tab.
- [`packages/app-core/src/features/debug-area/components/data-table/processing-data-message.tsx`](packages/app-core/src/features/debug-area/components/data-table/processing-data-message.tsx) — outer `<div className={wrapperClasses.container}>` is the `aria-busy` insertion point. The component already includes a `<Spinner label={translate('Text_Debug_Data_Processing')}>` whose label IS in the accessibility tree and announces on mount — no separate live region needed.
- [`packages/app-core/src/state/editor.ts`](packages/app-core/src/state/editor.ts) line 219 — `editorPreviewAreaSelectedPivot: 'data'` (the slice initial value to change). Field is transient — not in any `stateManagement` persist path.
- [`packages/app-core/src/lib/commands/constants.ts`](packages/app-core/src/lib/commands/constants.ts) lines 63-78 — `HOTKEY_BINDINGS` for `debugPaneShowSource/Data/Signals/Logs` mapped to `Ctrl+Alt+6/7/8/9`. The `combination` format (`'ctrl|alt|6,ctrl|alt|num_6'`) is `react-hotkeys-hook` syntax, not the W3C ARIA format. `aria-keyshortcuts` requires a separate hardcoded value (e.g. `"Control+Alt+6"` per ARIA 1.1 §6.6).
- [`packages/app-core/src/i18n/en-US.json`](packages/app-core/src/i18n/en-US.json) lines 191-212 — existing `Tooltip_*` keys. Convention: `Tooltip_<Noun>_<Verb/Qualifier>`; the visible hotkey is embedded in the label value (e.g. `"Collapse the debug pane [Ctrl+\`]"`). No `Tooltip_Pivot_*` keys exist yet — these are net-new additions.
- `@uidotdev/usehooks` `useDebounce` — already imported in `data-tab.tsx`. Trailing-edge semantics: returns the most recent value after `delay` ms of stillness.

### Institutional Learnings

- [`docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — applies to R5.1: the `aria-busy` attribute is rendered statically by `<ProcessingDataMessage />` whenever it mounts. No setState updater touches DOM; no risk.
- [`docs/solutions/ui-bugs/modal-dialog-tab-trapped-by-keyboard-focus-handler-2026-04-10.md`](docs/solutions/ui-bugs/modal-dialog-tab-trapped-by-keyboard-focus-handler-2026-04-10.md) — applies to R5.2 and R5.3. A document-level keyboard handler exists in this codebase. Adding `aria-keyshortcuts` is purely declarative — it doesn't install a handler — but verify the existing hotkey-handler chain still fires `Ctrl+Alt+N` correctly after the attribute is added.
- [`docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md`](docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) — informational, not directly applicable. R4's debounce gates a render predicate, not a `useEffect` rebind; no identity token is involved.
- [`docs/solutions/best-practices/singleton-worker-addEventListener-ownership-filter-2026-04-28.md`](docs/solutions/best-practices/singleton-worker-addEventListener-ownership-filter-2026-04-28.md) — informational. The worker registration shape is already correct (recently fixed); R4's debounce sits *after* the worker pipeline and doesn't change registration. Worker job serialization for rapid cross-filter clicks is assumed correct (worker handles jobs sequentially); document the assumption in Unit 3 tests but don't change the worker code here.

### External References

None. Codebase has all the patterns needed; no external research warranted.

## Key Technical Decisions

- **Tooltip mount-node storage:** one `useRef<Record<DebugPaneRole, HTMLElement | null>>({source: null, data: null, signal: null, log: null})` in `DebugToolbar`. Each `<TooltipCustomMount>`'s `setRef` is a closure that writes into the appropriate slot. Mount nodes don't need re-renders, so `useRef` is sufficient; one ref object is simpler than four `useState` pairs.
- **Tooltip keys + hotkeys as const lookups:** `const TOOLTIP_KEY_BY_PIVOT: Record<DebugPaneRole, string>` and `const ARIA_KEYSHORTCUTS_BY_PIVOT: Record<DebugPaneRole, string>` defined at module scope in `debug-toolbar.tsx`. TypeScript's exhaustiveness check enforces all four roles are covered. No need for `getTooltipKeyForPivot()` helper — the lookup is inline; testability comes from asserting the const objects directly.
- **i18n keys + values:** `Tooltip_Pivot_Debug_Source`, `Tooltip_Pivot_Debug_Data`, `Tooltip_Pivot_Debug_Signals`, `Tooltip_Pivot_Debug_Logs`. English values embed the visible hotkey hint, matching the `Tooltip_Collapse_Debug_Pane` convention:
  - Source: `"The processed data your visual receives, before Vega transforms it [Ctrl+Alt+6]"`
  - Data: `"Datasets produced by your compiled Vega spec, after transforms [Ctrl+Alt+7]"`
  - Signals: `"Signal values from the active Vega view [Ctrl+Alt+8]"`
  - Logs: `"Parse errors, warnings, and runtime errors [Ctrl+Alt+9]"`
- **`aria-keyshortcuts` value format:** `"Control+Alt+6"` (etc.) per W3C ARIA 1.1 §6.6 — `Control` not `Ctrl`. Hardcoded on each `<ToolbarRadioButton>`. Decoupled from the constants.ts `combination` string, matching the existing decoupling pattern (no programmatic link between hotkey constants and i18n strings today).
- **Default-tab change:** one-line slice initial-value edit in [`editor.ts`](packages/app-core/src/state/editor.ts) line 219. No migration; field is transient. Ship without a feature flag — the change is bounded (one click of friction for returning users with a Data preference) and the existing `config/features.json` mechanism is for build-time gating, not transient pivot state.
- **Debounce target:** the early-return guard in `source-tab.tsx` line 181 and `data-tab.tsx` line 429. NOT the `progressPending` prop on `<DataTableViewer>` — that's currently dead code along the loading path because the early-return runs first. Use `useDebounce(processing, threshold)` at each call site (inline; two consumers don't justify a custom `useDebouncedProgressPending` hook).
- **Source-tab vs Data-tab "has data" check:** the predicates differ. Source-tab uses `!tableState.rows` (truthy on whole array). Data-tab uses `!datasetState.values?.length` (length check). The debounce only wraps the `processing` term; the "has data" term stays as-is at each call site. No shared predicate extraction needed.
- **Debounce threshold (150ms baseline):** validated by a one-time measurement BEFORE locking in (see Unit 3). If measured worker round-trip median exceeds ~50ms, a higher threshold is warranted. Measurement is a prerequisite step, not an after-the-fact tuning option.
- **Loading-state a11y:** `aria-busy="true"` on the outer `<div className={wrapperClasses.container}>` of `ProcessingDataMessage`. Screen-reader announcement is carried by Fluent's existing `<Spinner label={...}>` (already in the accessibility tree). No separate `<div role="status">` live region — adding one would risk double-reading on NVDA / VoiceOver. This collapses Unit 4 to a one-attribute change.
- **Tab navigation verification (R5.3):** purely a verification step with regression tests. Fluent UI's `<ToolbarRadioGroup>` already provides arrow-key navigation between `<ToolbarRadioButton>` siblings and Tab/Shift+Tab to enter/exit. No code change expected — confirm via structural tests + a manual keyboard QA pass. If Unit 1's `<TooltipCustomMount>` siblings disturb the radio group's DOM invariants, Unit 5's verification surfaces the regression and Unit 1's mount-node placement is reopened.

## Open Questions

### Resolved During Planning

- **Hotkey rendering primitive (origin doc open question):** Resolved — embed the hotkey in the i18n label value, matching the existing `Tooltip_Collapse_Debug_Pane` convention. `aria-keyshortcuts` is a separate hardcoded attribute on each button (R5.2). The `<kbd>` element option is rejected because no existing tooltip in this codebase uses it; introducing it would be a one-off pattern.
- **i18n key naming (origin doc open question):** Resolved — `Tooltip_Pivot_Debug_*` namespace, matching existing `Tooltip_Pivot_*` pattern.
- **TooltipCustomMount placement (origin doc open question):** Resolved with a verification gate. The chosen placement is "sibling fragment after each tooltip-wrapped button, all inside the `<ToolbarRadioGroup>`" — matches the canonical pattern from `toolbar-button-standard.tsx`. Risk: Fluent v9's `<ToolbarRadioGroup>` may not tolerate non-button siblings inside its children; the radio group's roving-tabindex behavior could break. Unit 5's manual QA pass verifies. If a regression is found, Unit 1's mount-node placement reopens (move outside the group as a sibling fragment after).

### Deferred to Implementation

- **Live-region copy (now moot):** dropped from scope per the live-region decision above. No `Aria_Debug_Loading` or equivalent key needed.
- **`aria-busy` outer-wrapper edge case:** if any outer wrapper around `ProcessingDataMessage` already carries an `aria-busy` semantic, verify the new attribute doesn't conflict. Quick check at implementation.

## Implementation Units

- [x] **Unit 1: Tooltips with `aria-keyshortcuts` on debug-pane tabs**

**Goal:** Wrap each of the four `<ToolbarRadioButton>`s in [`debug-toolbar.tsx`](packages/app-core/src/features/debug-area/components/debug-toolbar.tsx) with a Fluent v9 `<Tooltip>` using the `<TooltipCustomMount>` pattern. Add four new i18n keys. Add `aria-keyshortcuts` to each button.

**Requirements:** R1, R5.2.

**Dependencies:** None.

**Files:**
- Modify: `packages/app-core/src/features/debug-area/components/debug-toolbar.tsx`
- Modify: `packages/app-core/src/i18n/en-US.json`
- Test: `packages/app-core/src/features/debug-area/components/__tests__/debug-toolbar-lookups.test.ts` (new)

**Approach:**
- Top of `DebugToolbar`: declare one `useRef<Record<DebugPaneRole, HTMLElement | null>>({source: null, data: null, signal: null, log: null})` to hold all four mount nodes.
- Define module-scope const objects: `TOOLTIP_KEY_BY_PIVOT: Record<DebugPaneRole, string>` and `ARIA_KEYSHORTCUTS_BY_PIVOT: Record<DebugPaneRole, string>`. TypeScript exhaustiveness ensures all four roles are covered.
- Wrap each `<ToolbarRadioButton>` in a `<Tooltip>` with `relationship='label'`, `withArrow`, `mountNode={ref.current.source}` (etc.), and the i18n-resolved content from `TOOLTIP_KEY_BY_PIVOT[pivot]`.
- Add `<TooltipCustomMount setRef={(el) => { ref.current.source = el; }} />` (etc.) as a sibling fragment after each wrapped button, all inside the `<ToolbarRadioGroup>`.
- Add `aria-keyshortcuts={ARIA_KEYSHORTCUTS_BY_PIVOT[pivot]}` directly on each `<ToolbarRadioButton>`.

**Patterns to follow:**
- [`packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx`](packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx) lines 80-99 — tooltip-mount pattern (adapted from `useState` to a single shared `useRef` since DebugToolbar holds four buttons).
- Existing `Tooltip_Collapse_Debug_Pane` / `Tooltip_Expand_Debug_Pane` keys — i18n shape with embedded hotkey hint in `[Ctrl+...]` square-bracket style.

**Test scenarios:**
- Happy path: `TOOLTIP_KEY_BY_PIVOT.source === 'Tooltip_Pivot_Debug_Source'` (cover all four roles).
- Happy path: `ARIA_KEYSHORTCUTS_BY_PIVOT.source === 'Control+Alt+6'` (cover all four roles).
- Integration: each i18n key resolves to a non-empty string in `en-US.json` (assertion that `en-US.json` contains the four expected keys with non-empty values).
- Integration: `Object.keys(TOOLTIP_KEY_BY_PIVOT)` and `Object.keys(ARIA_KEYSHORTCUTS_BY_PIVOT)` both equal exactly `['source', 'data', 'signal', 'log']` — guards against silent omission of a role.

**Verification:**
- Manual: hovering each tab shows the tooltip via the `TooltipCustomMount` mount node (no DOM-position regressions); keyboard focus shows the tooltip; the active tab still shows its tooltip on focus (existing Fluent default — no special-casing).
- Automated: vitest unit tests on the const lookups pass.

---

- [x] **Unit 2: Default debug pivot to Source**

**Goal:** Change the slice initial value of `editorPreviewAreaSelectedPivot` from `'data'` to `'source'` in [`editor.ts`](packages/app-core/src/state/editor.ts) line 219.

**Requirements:** R2.

**Dependencies:** None.

**Files:**
- Modify: `packages/app-core/src/state/editor.ts`
- Test: `packages/app-core/src/state/__tests__/editor.test.ts` (extend if exists, else new)

**Approach:**
- One-line change inside `createEditorSlice`: `editorPreviewAreaSelectedPivot: 'source'` (was `'data'`).
- No migration required (field is transient; never in `stateManagement` persist path).
- Update any test that asserted the default was `'data'`.
- **Hypothesis acknowledgment:** the default-to-Source change is a hypothesis based on the most common debugging entry point, NOT a measured user preference. If two or more user reports of confusion arrive within two release cycles after the default change ships, revisit the choice (revert to `'data'` as initial value, or scope a per-user preference).

**Patterns to follow:**
- Existing slice-default tests in `state/__tests__/` (e.g. `debug.test.ts` patterns for slice initial-value assertions).

**Test scenarios:**
- Happy path: `createEditorSlice` produces a state with `editorPreviewAreaSelectedPivot === 'source'`.
- Integration: setters that flip the pivot value (`handleDebugPaneSource`, `handleDebugPaneData`, etc.) still work after the default change.
- Edge case: existing test fixtures that seeded `editorPreviewAreaSelectedPivot: 'data'` explicitly continue to pass (verify no test was relying on the slice's default rather than seeding it explicitly).

**Verification:**
- Full state-test suite green.
- Manual: opening a fresh visual lands on the Source tab.

---

- [x] **Unit 3: Debounce the early-return loading guard**

**Goal:** Eliminate the visible flicker that occurs when fast worker jobs cause `<ProcessingDataMessage />` to briefly replace the populated table. Use `useDebounce(processing, threshold)` from `@uidotdev/usehooks` at each guard site.

**Requirements:** R4.

**Dependencies:** None (lands independently of Units 1 and 2).

**Files:**
- Modify: `packages/app-core/src/features/debug-area/components/dataset-viewer/source-tab.tsx`
- Modify: `packages/app-core/src/features/debug-area/components/dataset-viewer/data-tab.tsx`
- Test: `packages/app-core/src/features/debug-area/components/dataset-viewer/__tests__/loading-debounce.test.ts` (new — fake-timer regression test)

**Approach:**

**Step 1 (prerequisite measurement):** Before writing code, instrument the worker round-trip on a representative dataset (500-1000 rows) in the dev harness. Log the median and p90 of `processing: false → true → false` cycle duration. If median ≤ 50ms, lock in `150ms` as the debounce threshold. If median is between 50-100ms, use `200ms`. If median exceeds 100ms, escalate — the long-load case may be the dominant one and the modal-overlay deferral (see Scope Boundaries revisit trigger) needs reconsideration.

**Step 2 (debounce wiring):** In each tab, before the early-return guard:

Before (current — source-tab.tsx line 181 and data-tab.tsx line 429, both wrapped in a 3-level `container > wrapper > details` div around `<ProcessingDataMessage />`):
```tsx
// source-tab.tsx
if (tableState.processing || !tableState.rows) {
    return <ThreeLevelWrapperWithProcessingDataMessage />;
}

// data-tab.tsx
if (datasetState.processing || !datasetState.values?.length) {
    return <ThreeLevelWrapperWithProcessingDataMessage />;
}
```

After (debounce only the `processing` term; "has data" term unchanged):
```tsx
// source-tab.tsx
const debouncedProcessing = useDebounce(tableState.processing, DEBOUNCE_MS);
if (debouncedProcessing || !tableState.rows) {
    return <ThreeLevelWrapperWithProcessingDataMessage />;
}

// data-tab.tsx
const debouncedProcessing = useDebounce(datasetState.processing, DEBOUNCE_MS);
if (debouncedProcessing || !datasetState.values?.length) {
    return <ThreeLevelWrapperWithProcessingDataMessage />;
}
```

`data-tab.tsx` already imports `useDebounce` from `@uidotdev/usehooks`. `source-tab.tsx` adds the same import. `DEBOUNCE_MS` is the threshold from Step 1.

**Notes:**
- The empty-table case (`!tableState.rows` / `!datasetState.values?.length`) bypasses debounce — first-load shows the spinner immediately. Only the *transition* from populated table to processing state is debounced.
- The two tabs use different "has data" predicates (`!rows` vs `!values?.length`); no shared predicate extraction.
- Worker job serialization for rapid cross-filter clicks is assumed correct (the worker handles jobs sequentially); document the assumption in tests.

**Patterns to follow:**
- Existing `useDebounce` usage in `data-tab.tsx` (the data-listener debounce at `DATA_LISTENER_DEBOUNCE_INTERVAL = 100`). The two debounces are independent and serve different paths.

**Test scenarios:**
- **Fake-timer regression test (new):** mount a stub component (or test the hook directly using `@testing-library/react-hooks`-style invocation if available, otherwise a minimal pure-function harness). Use `vi.useFakeTimers()`. Set `processing: true`. Advance ≤149ms. Assert `useDebounce` output stays `false` — the spinner-condition predicate stays false. Advance past 150ms with `processing` still `true`. Assert output flips to `true`.
- **Trailing-edge coalesce test (new):** with `vi.useFakeTimers()`, simulate `false → true → false → true` within 150ms (each transition advances 30ms). Assert the final debounced value matches the last input AFTER 150ms of stillness — coalesces correctly.
- Happy path (predicate-only sanity): the early-return condition `(debouncedProcessing || !hasData)` returns `true` when EITHER input is true.
- Edge case (first-load bypass): when `!hasData` is true and `debouncedProcessing` is false, the early-return still fires — debounce doesn't gate first-load. Manual verification of this path is sufficient; no fake-timer test needed (the predicate test covers the boolean logic).

**Verification:**
- Manual: rapid sort / page / cross-filter on a populated table no longer flashes the spinner.
- Manual: a slow load (e.g. very large dataset) still shows the spinner after the debounce threshold — the library's default replace-grid behavior is preserved for genuinely-long loads.
- Automated: fake-timer test catches regressions like accidentally removing the `useDebounce` import or changing the threshold to zero. Predicate test pass; existing data-tab and source-tab tests still pass.

---

- [x] **Unit 4: `aria-busy` on `ProcessingDataMessage`**

**Goal:** Add `aria-busy="true"` to the loading-state container so screen reader users are informed when the table is in a loading state. No separate live region — Fluent's existing `<Spinner label>` carries the announcement (already in the accessibility tree).

**Requirements:** R5.1.

**Dependencies:** Unit 3 (the debounce determines *when* `<ProcessingDataMessage />` mounts; this unit ensures `aria-busy` is set *whenever* it does mount).

**Files:**
- Modify: `packages/app-core/src/features/debug-area/components/data-table/processing-data-message.tsx`
- Test: `packages/app-core/src/features/debug-area/components/data-table/__tests__/processing-data-message-aria-busy.test.ts` (new — pure helper assertion that the rendered shape includes `aria-busy="true"` on the container)

**Approach:**
- Add `aria-busy="true"` as a static prop on the outer `<div className={wrapperClasses.container}>`.
- No setState; no DOM side effects; no new i18n key. The Spinner's `label` prop (already populated via `translate('Text_Debug_Data_Processing')`) is the announcement source.
- One-attribute change. Net code addition: one line.

**Patterns to follow:**
- [`docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — `aria-busy` is rendered declaratively; no setState involved.
- Existing accessibility-attribute usage on Fluent v9 component wrappers in this codebase (grep for `aria-` in similar feature components for the convention).

**Test scenarios:**
- Happy path: extract a pure helper `getProcessingDataMessageAriaProps(): { 'aria-busy': true }` (or assert against a snapshot of the rendered prop set if vitest-friendly). Confirm `aria-busy === true`.
- Integration: when `<ProcessingDataMessage />` is rendered (e.g. via Unit 3's debounced guard), the outer container in the rendered DOM has `aria-busy="true"` (test via a structural assertion, not React rendering).
- Verification (manual, not testable in node env): NVDA / VoiceOver announces the Spinner's label on mount. No double-announcement (the design decision to drop the separate live region prevents this).

**Verification:**
- Automated: attribute-presence test passes.
- Manual: with a screen reader (NVDA / VoiceOver), trigger a long load and confirm the Spinner's label is announced once. Confirm `aria-busy="true"` appears on the container in browser devtools.

---

- [x] **Unit 5: Tab keyboard-navigation verification**

**Goal:** Verify the post-Unit-1 toolbar still supports correct keyboard navigation (arrow keys cycle radio siblings; Tab/Shift+Tab enters/exits the group cleanly with no focus traps). The `<TooltipCustomMount>` siblings introduced by Unit 1 are the main risk surface — Fluent v9's `<ToolbarRadioGroup>` may treat non-button children unexpectedly.

**Requirements:** R5.3.

**Dependencies:** Unit 1 (Unit 5 verifies the toolbar after Unit 1's tooltip wrappers and mount nodes are in place).

**Files:**
- Test: `packages/app-core/src/features/debug-area/components/__tests__/debug-toolbar-keyboard-nav.test.ts` (new)

**Approach:**
- This unit is primarily a verification + regression-test addition. No production code changes expected.
- The automated test asserts the structural shape of the rendered toolbar (four `<ToolbarRadioButton>` siblings, four `<TooltipCustomMount>` siblings, all inside one `<ToolbarRadioGroup>`). This catches accidental restructuring but does NOT verify keyboard navigation works — that requires browser-rendered tests, which the node-env vitest can't do.
- The manual keyboard QA pass IS the load-bearing verification: Tab into the toolbar; arrow keys cycle Source → Data → Signals → Logs; Tab exits to the next focusable element (zoom controls); Shift+Tab returns into the toolbar's last-focused button. The keyboard QA pass also verifies that `Ctrl+Alt+6/7/8/9` still activate the corresponding tabs after `aria-keyshortcuts` is added.
- If the manual pass reveals a focus issue (likely from `<TooltipCustomMount>` placement disturbing tab order), surface it and reopen Unit 1's placement decision — move mount nodes outside the radio group as a sibling fragment after the group, then re-test.

**Why a separate unit rather than folded into Unit 1:** the structural tests overlap with Unit 1's own const-lookup tests, but the manual keyboard QA is a distinct verification gate that earns its own checkbox. It catches the failure mode that the automated tests can't reach.

**Patterns to follow:**
- Existing pure-helper test pattern from Unit 1's `debug-toolbar-lookups.test.ts`.
- [`docs/solutions/ui-bugs/modal-dialog-tab-trapped-by-keyboard-focus-handler-2026-04-10.md`](docs/solutions/ui-bugs/modal-dialog-tab-trapped-by-keyboard-focus-handler-2026-04-10.md) — verify the document-level keyboard handler still fires `Ctrl+Alt+N` correctly when focus is anywhere; `aria-keyshortcuts` is a discoverable affordance, not a handler installer.

**Test scenarios:**
- Structural: toolbar's expected child shape (four `<ToolbarRadioButton>` siblings, four `<TooltipCustomMount>` siblings, all inside one `<ToolbarRadioGroup>`).
- Integration: each radio button has both `value` and `aria-keyshortcuts` attributes (cross-coverage with Unit 1).
- Manual verification: hotkeys `Ctrl+Alt+6/7/8/9` still activate the corresponding tabs (sanity check that adding `aria-keyshortcuts` didn't break the hotkey wiring).
- Manual verification: Tab into toolbar → arrow keys cycle 4 tabs → Tab exits cleanly → Shift+Tab returns. No focus traps.

**Verification:**
- Automated: structural + attribute presence tests pass.
- Manual: keyboard navigation works end-to-end with no focus traps.

## System-Wide Impact

- **Interaction graph:** Adding `<Tooltip>` wrappers around `<ToolbarRadioButton>`s does not change the radio group's selection contract — the value/checked behavior is preserved by Fluent v9. The `LogErrorIndicator` child of the `'log'` button stays inside its tooltip-wrapped button.
- **Error propagation:** Unchanged. R4's debounce sits after the worker pipeline; R5.1's `aria-busy` attribute is static.
- **State lifecycle risks:** R2 changes a slice initial value; existing visuals see Source on next reload (transient field, no migration). R4's debounce shifts when `<ProcessingDataMessage />` mounts/unmounts but doesn't change the underlying state machine — the worker still toggles `processing`; only the display gating delays.
- **API surface parity:** None. All changes are internal to `app-core`'s debug-area feature and i18n catalog.
- **Integration coverage:** Unit 5 verifies the keyboard navigation contract after Unit 1's tooltip wrappers land. Vitest in node env can't actually exercise screen-reader output — those signals come from manual a11y QA.
- **Unchanged invariants:**
  - The four hotkey bindings in [`constants.ts`](packages/app-core/src/lib/commands/constants.ts) lines 63-78 are not modified. The `aria-keyshortcuts` attribute is an *announcement* of those bindings, not a re-implementation.
  - `<DataTableViewer>`'s `progressPending` prop continues to be passed (currently dead code along the loading path) — leave the wiring unless explicit dead-code cleanup is undertaken.
  - The worker registration (`addEventListener` + jobId filter) shipped recently and is unchanged here.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `<TooltipCustomMount>` placement inside `<ToolbarRadioGroup>` could disturb the radio group's DOM invariants (Fluent v9 expects sibling radio buttons; the mount-node siblings are extra elements). | Unit 5's manual keyboard QA pass catches the regression. If found, move mount nodes outside the radio group as a sibling fragment after the group; verify tooltip mount-position is still correct via the `mountNode={ref.current.X}` prop. |
| Debounce threshold may be wrong for actual worker round-trip durations. | Unit 3's measurement step is a prerequisite, not optional. Threshold is locked based on measurement before code lands. |
| `aria-keyshortcuts` could conflict with the document-level keyboard handler (modal-dialog-tab-trap learning). | Unit 5's manual verification confirms hotkeys still fire after the attribute is added. The attribute is purely declarative — it doesn't install a handler. |
| Existing visuals' default-tab change (R2) could surprise returning users. | Acknowledged; release notes mention the new default explicitly. The hypothesis-acknowledgment in Unit 2 names a concrete revert trigger (≥2 confusion reports within two release cycles). |
| The fake-timer test in Unit 3 may not faithfully model React's render scheduling, so a passing test doesn't guarantee zero flicker in production. | Manual QA on a real Power BI visual is the load-bearing flicker verification. The fake-timer test's purpose is regression detection (someone removes `useDebounce`), not first-line correctness verification. |
| Worker may not serialize rapid cross-filter clicks correctly (unverified assumption). | Unit 3's tests document the assumption. If a flicker pattern emerges from overlapping jobs in manual QA, escalate to a separate worker-serialization plan rather than patching here. |
| Adding new i18n keys without non-English translations leaves them English-only initially. | Matches the existing project convention for new i18n keys (translations follow in a separate cadence). Out of scope here. |

## Documentation / Operational Notes

- New i18n keys land in `en-US.json`. Non-English translations follow the project's existing cadence; not blocking.
- Release-note line at next version bump: "The debug pane now opens with the Source tab by default; tooltips and keyboard-shortcut hints have been added to all four tabs."
- No bundle-size impact (additive code is small; no new dependencies).
- No rollout / monitoring concerns — UI-only client-side changes.
- Coverage target (per CLAUDE.md): 90%+ on new/modified code. Pure-helper + fake-timer tests for each unit's logic should hit this.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-28-data-viewer-tab-refinements-requirements.md](docs/brainstorms/2026-04-28-data-viewer-tab-refinements-requirements.md)
- Related plan (parent feature): [docs/plans/2026-04-24-001-feat-data-viewer-source-tab-split-plan.md](docs/plans/2026-04-24-001-feat-data-viewer-source-tab-split-plan.md)
- Institutional learnings:
  - [docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md](docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md)
  - [docs/solutions/ui-bugs/modal-dialog-tab-trapped-by-keyboard-focus-handler-2026-04-10.md](docs/solutions/ui-bugs/modal-dialog-tab-trapped-by-keyboard-focus-handler-2026-04-10.md)
- Implementation surfaces:
  - [packages/app-core/src/features/debug-area/components/debug-toolbar.tsx](packages/app-core/src/features/debug-area/components/debug-toolbar.tsx)
  - [packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx](packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx) (canonical tooltip pattern)
  - [packages/app-core/src/features/debug-area/components/dataset-viewer/source-tab.tsx](packages/app-core/src/features/debug-area/components/dataset-viewer/source-tab.tsx) line 181
  - [packages/app-core/src/features/debug-area/components/dataset-viewer/data-tab.tsx](packages/app-core/src/features/debug-area/components/dataset-viewer/data-tab.tsx) line 429
  - [packages/app-core/src/features/debug-area/components/data-table/processing-data-message.tsx](packages/app-core/src/features/debug-area/components/data-table/processing-data-message.tsx)
  - [packages/app-core/src/state/editor.ts](packages/app-core/src/state/editor.ts) line 219
  - [packages/app-core/src/lib/commands/constants.ts](packages/app-core/src/lib/commands/constants.ts) lines 63-78
  - [packages/app-core/src/i18n/en-US.json](packages/app-core/src/i18n/en-US.json) lines 191-212
