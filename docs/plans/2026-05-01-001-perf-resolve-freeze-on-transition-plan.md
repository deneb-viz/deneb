---
title: "perf: Resolve freeze during viewer/editor transition"
type: perf
status: active
date: 2026-05-01
deepened: 2026-05-01
---

# perf: Resolve freeze during viewer/editor transition

## Overview

When the user clicks **Edit** on the Deneb visual, the visual area appears to "freeze" at the report-view (compressed) size for ~1–2 seconds before reflowing to the full edit-pane size. This is jarring on every open (cold and warm), even with the editor's heavy mount work pre-cached.

The investigation in this plan went through several rounds of hypothesis-driven fixes that improved JavaScript-side metrics but did not move the user-visible symptom. The breakthrough came from instrumentation that compared `window.innerWidth/Height` (the iframe's actual interior size) against `options.viewport.width/Height` (the host-reported viewport) on every animation frame during a transition. That data **refuted** the prior assumption that the iframe was animating from compressed to full and that our React work was timing-sensitive to it. The data showed instead:

- The Power BI host **paces the iframe's CSS resize independently** of any signal we send. The iframe sits at the report-view size for hundreds of milliseconds after the host has reported a new `viewport`, and only then physically jumps to the new size.
- `iw === vw` (width equality between the iframe interior and the host-reported viewport) is a **reliable positive signal** that the iframe has caught up to the host's intent.
- `ih === vh` is **not** reliable — there is a persistent ~36px chrome offset between the iframe's interior height and `viewport.height`, so the height check would almost never pass.
- The actual time from click-Edit to iframe physical expansion ranges from ~300ms (warm, fast machine) to ~1500ms+ (cold, with schema/Monaco init blocking the main thread). It is not a fixed CSS animation duration.

The fix this plan delivers, in its current form:

1. **Match-based gate on every viewer→editor toggle** — keep the editor wrapper hidden via `display: none` (and a "Preparing editor" placeholder visible at full pane size) until `window.innerWidth === options.viewport.width` AND that viewport has changed since the gate engaged. A 3000ms upper-bound timer is the safety net for hosts that never send a stable viewport update.
2. **Retain the editor tree across viewer↔editor toggles** — mount `<DenebEditor>` once on the first open and keep it mounted for the lifetime of the visual instance, toggling `display: none` on the outer shell rather than unmounting/remounting. This eliminates the ~500ms warm-open Allotment / Monaco / Vega remount cost.
3. **Sticky-render the editor pane layout** so children stay mounted when the wrapper goes `display: none`, preserving Monaco state (cursor, scroll, selection, view state) and Allotment splitter positions across reopens.
4. **Close any open Fluent UI dialog when leaving editor mode** — Fluent v9 dialogs portal their surface to `document.body` and bypass the wrapper's `display: none`, so they linger after exit unless explicitly closed.
5. **Restore focus to the active Monaco editor** when the gate releases — without retention's mount-time auto-focus, the Power BI chrome's "Back to report" button keeps focus from the click that opened editor mode.
6. **Defer the auto-opening of the new-project modal** on a fresh visual until the gate has released — the modal portal otherwise opens at the iframe's pre-expansion dimensions and renders mis-sized.

## Problem Frame

- **User-visible symptom:** the visual area freezes at the report-view size for ~1–2 seconds after clicking Edit. The "Preparing editor" message (or, on cold open of a fresh visual, the new-project dialog) appears at the wrong size and reflows when the iframe finally expands.
- **Cause:** the Power BI host paces the iframe's physical CSS resize on its own schedule, multiple `update()` calls in. Our visual cannot speed this up and is not the bottleneck for the iframe expansion itself. What we *can* control is whether our content visibly renders during the host's expansion period.
- **Constraints:**
  - The iframe expansion timing varies widely (~300ms warm, >1500ms cold) — any timer-only solution must accommodate the long tail.
  - Fluent UI v9 dialogs portal to `document.body`, so wrapper-level `display: none` does not hide them.
  - The editor tree's heavy children (Monaco, Allotment, Vega view) lose state if their measured container goes to 0 and back, so any "hide" mechanism must keep their measurements live OR their render trees stable.

## Requirements Trace

- **R1.** On every transition into editor mode, the editor's heavy content (Monaco, Allotment, Vega) must not be visible at any size other than the host's reported final viewport.
- **R2.** A "Preparing editor" placeholder must be shown during the gate-pending window so the user has feedback that something is happening.
- **R3.** The wrapper must take no layout space when not in editor mode, so the viewer's main component fills the pane normally.
- **R4.** Editor state (cursor, scroll, splitter positions, view state) must persist across viewer↔editor toggles after the first open.
- **R5.** Focus must land in the active Monaco editor when the editor becomes visible (not on the Power BI chrome).
- **R6.** Open Fluent UI dialogs must close when the user exits editor mode.
- **R7.** Auto-opened modals (new-project picker on a fresh visual) must not appear at the pre-expansion iframe size.
- **R8.** Behaviour must be observable via `LOG_LEVEL=DEBUG` instrumentation during development, but the diagnostic code must be removed before this plan ships.

## Scope Boundaries

- **In scope:** `RetainedDenebEditor`, `EditorContent` sticky-render, modal-close-on-exit, focus restoration via Zustand tick, deferred new-project modal opening, plan and memory updates.
- **Out of scope:** Fixing the rendering events contract (`renderingStarted` / `renderingFinished` semantics) — tracked separately based on user's correspondence with the Power BI visuals team.
- **Out of scope:** Reducing the absolute iframe expansion time (host-controlled, not ours).
- **Out of scope:** Reducing schema/Monaco bootstrap time. The first-open Suspense gate already covers it; subsequent opens are now cached.

## What was tried and rejected

These hypotheses came from earlier rounds of investigation and proved wrong against the actual data. They are recorded here so future sessions do not retread them.

| Approach | Why rejected |
|---|---|
| `<ViewportSettleGate>` inside `<DenebEditor>` using `ResizeObserver` quiet-debounce | RO can detect "size stopped changing" but not "size matches host's intent." During the iframe's pre-expansion period, the size IS stable (at the wrong value), so RO falsely settles. The gate consistently released at the wrong size. |
| Per-toggle gate using `ResizeObserver` on an always-rendered probe | Same fundamental issue — RO is the wrong signal for "host has expanded the iframe." |
| Width AND height match | Height has a persistent ~36px host-chrome offset; `ih === vh` essentially never holds. |
| 500ms upper bound | Cold-open iframe expansion is observed at ~1500ms — far past 500ms. The timer fires before the iframe expands, mounting the editor at the wrong size. Raised to 3000ms. |
| Signalling `renderingFinished` earlier to influence the host | The Power BI host does NOT gate iframe expansion on our `renderingFinished` signal — confirmed by traces showing iframe expansion in cycles where no `renderingFinished` was fired. |

## Context & Research

### Relevant code and patterns

- `packages/app-core/src/app/retained-deneb-editor.tsx` — owns the latch, the per-toggle gate, focus restoration, and modal-close-on-exit
- `packages/app-core/src/app/retained-deneb-editor-state.ts` — pure latch helper, tested in node env
- `packages/app-core/src/app/editor/components/editor-content.tsx` — sticky-render of the pane layout
- `packages/app-core/src/state/editor.ts` — `editorFocusTick` + `requestEditorFocus` action
- `packages/app-core/src/features/specification-editor/components/specification-json-editor.tsx` — listens to `editorFocusTick` and re-focuses the active Monaco
- `src/app/app.tsx` — passes `hostViewportWidth/Height` to `<RetainedDenebEditor>`; switch case `'editor'` returns null because the retained component owns editor rendering
- `packages/app-core/src/app/deneb-editor.tsx` — currently still wraps `<Editor>` in the now-redundant Unit 2 `<ViewportSettleGate>`; this is removed in Unit 7 below

### Institutional learnings

- `learning-freeze-investigation-2026-05-01.md` (memory) — what was tried and rejected, why
- `feedback_validate-root-cause.md` (memory) — don't apply more fixes when the user-visible needle isn't moving; use ground-truth measurement instead

## Key Technical Decisions

- **Width-only match.** `iw === vw` is reliable; `ih === vh` is not. Decision documented in code comments and tests.
- **3000ms upper bound.** Set from observed cold-open iframe expansion of ~1500ms plus margin. Single tunable named const at the top of `retained-deneb-editor.tsx`.
- **`hostViewportHasChanged` requirement.** The match must hold AND the viewport must have changed since the gate engaged — otherwise a stale match (iframe at viewer-mode size, host hasn't sent edit-mode viewport yet) would release the gate too early.
- **`display: none` on outer shell when not in editor mode** — outer shell is taken out of layout flow so the viewer's main component fills the pane.
- **`visibility: hidden` on inner wrapper during gate-pending** — keeps the editor's children laid out at full size so when the gate releases, no reflow is needed.
- **Placeholder rendered as absolutely-positioned overlay** — sits over the (visibility: hidden) editor wrapper so it doesn't compete for layout.
- **Modal close via `setModalDialogRole('None')` on exit** — only reliable way to unmount a Fluent v9 dialog portal'd to body.

## Implementation Units

### Already shipped (committed earlier on this branch)

- [x] **Unit 1: Editor-open marker instrumentation** — `editor-open-marker.ts` with four-stage timing. Useful for development; stays.
- [x] **Unit 4: `RetainedDenebEditor`** — latch, retention, sticky-render fixup in `editor-content.tsx`. Match-based gate logic added in subsequent rounds.
- [x] **Unit 4b: Focus restoration** — `editorFocusTick` + `requestEditorFocus` in editor slice; `SpecificationJsonEditor` listens for tick.
- [x] **Match-based gate** — `iw === vw` + `hostViewportHasChanged` + 3000ms upper bound in `retained-deneb-editor.tsx`.
- [x] **Modal close on exit** — `useEffect` in `retained-deneb-editor.tsx` that dispatches `setModalDialogRole('None')` when leaving editor mode.

### Remaining work

- [ ] **Unit 6: Defer auto-opening of new-project modal until gate releases**

**Goal:** Prevent the new-project picker (which opens automatically on a fresh visual entering edit mode) from rendering at the iframe's pre-expansion size.

**Requirements:** R7

**Files:**
- Modify: wherever `setModalDialogRole('new')` is currently dispatched on entering editor mode for a no-project visual (likely `packages/app-core/src/app/use-deneb-app-setup.ts` or a related effect)
- Possibly modify: `packages/app-core/src/state/interface.ts` (the slice that owns `modalDialogRole`)

**Approach:**
- Identify the effect/handler that auto-opens the modal
- Gate it on the same `iw === vw` match signal — either by reading `editorFocusTick`-style trigger from `RetainedDenebEditor` once the gate releases, or by exposing a new `editorReadyTick` that increments on gate-release and listening for it in the modal-open trigger
- Simpler alternative: the gate-release effect in `RetainedDenebEditor` is the right place to dispatch the auto-open, since that's the one moment we know the iframe is settled

**Test scenarios:**
- *Happy path:* on a fresh visual, click Edit. The new-project dialog should appear only after the iframe has expanded, at the full pane size.
- *Edge case:* on a visual that already has a project, click Edit. No dialog should auto-open.
- *Edge case:* user manually opens the new-project dialog (from the editor command bar) after the gate has settled. Behaviour unchanged.

**Verification:**
- The mis-sizing of the new-project dialog at cold open is gone.
- The dialog still appears reliably for fresh visuals.

- [ ] **Unit 7: Cleanup — remove diagnostic instrumentation**

**Goal:** Remove the temporary diagnostic code added during the investigation. Production code should not ship with these.

**Requirements:** R8

**Files:**
- Delete: `src/lib/diagnostics/edit-transition-trace.ts`
- Modify: `src/index.ts` — remove `logHostEvent` import and call sites
- Modify: `src/app/app.tsx` — remove `startEditTransitionTrace` import, the `useLayoutEffect` that fires it, the `visualUpdateOptionsRef`, and `logHostEvent` import + call sites in the rendering callbacks

**Approach:**
- Pure deletion. No replacement.

**Test scenarios:**
Test expectation: none — pure deletion of dev-only instrumentation.

**Verification:**
- `npm run webpack:build` clean
- No `[edit-transition-trace]` or `[host-events]` log lines appear at any `LOG_LEVEL`
- Type-check, lint, prettier all clean

- [ ] **Unit 8: Cleanup — remove redundant first-mount `<ViewportSettleGate>`**

**Goal:** Remove the now-superseded gate inside `<DenebEditor>`. `<RetainedDenebEditor>`'s match-based gate covers every transition (including the first), so the inner gate adds 50–500ms of latency without value.

**Requirements:** R1, R2

**Files:**
- Modify: `packages/app-core/src/app/deneb-editor.tsx` — remove `<ViewportSettleGate>` wrapper, render `<Editor />` directly
- Delete: `packages/app-core/src/app/editor/components/viewport-settle-gate.tsx`
- Delete: `packages/app-core/src/app/editor/hooks/use-container-stable.ts`
- Delete: `packages/app-core/src/app/editor/hooks/__tests__/use-container-stable.test.ts`

**Approach:**
- Confirm via grep that `useContainerStable` and `ViewportSettleGate` have no other consumers
- Delete the files and the import/wrapper in `deneb-editor.tsx`

**Test scenarios:**
- *Verification scenarios* (manual): cold open and warm open behaviour unchanged — placeholder still visible during gate-pending, editor materializes at full size, no compressed flash. Marker timings (if instrumentation kept temporarily) should improve slightly because the redundant gate's wait is gone.

**Verification:**
- Test suite (currently 451 tests including the 8 stability-tracker tests being deleted) drops to ~443 tests, all passing
- Type-check, lint, prettier all clean
- Manual cold + warm open behaviour unchanged

- [ ] **Unit 9: Memory and documentation refresh**

**Goal:** Update memory files so a future session inherits the correct mental model.

**Files:**
- Modify: `learning-freeze-investigation-2026-05-01.md` — change status from "PARTIALLY shipped, primary symptom UNRESOLVED" to "RESOLVED with match-based gate". Document the actual mechanism (host-paced iframe expansion + width-only match).
- Modify: `MEMORY.md` — point at the resolved learning
- Possibly add: `docs/solutions/<category>/freeze-on-viewer-editor-transition-2026-05-01.md` — the canonical solved-problem entry (per `CLAUDE.md` `docs/solutions/` convention)

**Approach:**
- Update memory entry to reflect what landed
- Add a `docs/solutions/` entry if the category fits — frontmatter with `module: app-core`, `tags: [editor, viewport, transition, retention]`, `problem_type: perf`

**Test scenarios:**
Test expectation: none — documentation only.

**Verification:**
- Memory and docs accurately describe the shipped solution

## System-Wide Impact

- **Interaction graph:** `RetainedDenebEditor` is now the single source of truth for editor visibility. Anything that previously assumed `<DenebEditor>` was the visibility boundary needs to consider the retention wrapper instead.
- **Error propagation:** No change.
- **State lifecycle:** `<DenebEditor>` mounts once per visual instance and never unmounts until the visual is destroyed. Effects inside the editor tree that previously fired per-open now only fire once. Audit confirmed this is the desired behaviour for current code; if a per-open trigger is needed in future, use `editorFocusTick`-style signal pattern.
- **API surface:** `RetainedDenebEditor` exported from `@deneb-viz/app-core/editor`. Consumers must pass `isEditorMode`, `hostViewportWidth`, `hostViewportHeight`.
- **Unchanged invariants:** display-mode state machine in `src/lib/state/display-mode.ts`. Editor's internal architecture (Suspense, schema init service, Vega-React integration). Viewer-only consumers' tree-shaking of editor entry.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Match never holds (iframe never reaches reported width) on some host configuration | 3000ms upper-bound timer fires; editor mounts at whatever size and reflows. Strictly worse than a clean release but never permanently stuck. |
| Fluent dialogs other than the new-project picker portal-leak in future code | Modal-close-on-exit dispatches `setModalDialogRole('None')` which closes any current dialog. New dialog types must use the same role enum. |
| `editorFocusTick` not consumed by future editor surfaces | Document the pattern in `docs/solutions/`. Tests cover the existing consumer. |
| Removing the inner `<ViewportSettleGate>` regresses some edge case the outer gate doesn't catch | Manual verification on cold + warm + focus-mode + landing transitions before merging Unit 8. |

## Documentation / Operational Notes

- Manual verification path on each unit landing: `npm run dev` with `LOG_LEVEL=DEBUG`, toggle Edit ↔ Back to report a few times, confirm placeholder + match-based release + correct viewer rendering after exit.
- No feature flag needed — pure perf/UX improvements.
- CHANGELOG: under "Performance" / "Fixes" for the next release.
- The host's `renderingStarted` / `renderingFinished` contract concerns are tracked separately based on user's correspondence with the Power BI visuals team.

## Sources & References

- Display-mode state machine: `src/lib/state/display-mode.ts`
- App routing: `src/app/app.tsx`
- Retained editor: `packages/app-core/src/app/retained-deneb-editor.tsx`
- Latch helper: `packages/app-core/src/app/retained-deneb-editor-state.ts`
- Editor content sticky-render: `packages/app-core/src/app/editor/components/editor-content.tsx`
- Editor state slice: `packages/app-core/src/state/editor.ts`
- Specification editor focus listener: `packages/app-core/src/features/specification-editor/components/specification-json-editor.tsx`
- Diagnostics (to be removed in Unit 7): `src/lib/diagnostics/edit-transition-trace.ts`
- Memory: `learning-freeze-investigation-2026-05-01.md`, `feedback_validate-root-cause.md`
