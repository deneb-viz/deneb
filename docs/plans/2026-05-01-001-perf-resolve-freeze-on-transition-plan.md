---
title: "perf: Resolve freeze during viewer/editor transition"
type: perf
status: active
date: 2026-05-01
---

# perf: Resolve freeze during viewer/editor transition

## Overview

When the user clicks **Edit** on the Deneb visual, Power BI animates the visual frame out to its full pane size. During this animation the host issues a sequence of `update()` callbacks which Deneb resolves to display modes `viewer → transition-viewer-editor → editor`. The moment the mode becomes `editor`, `<DenebEditor>` mounts synchronously and triggers a heavy work stack — Allotment splitter construction, Monaco editor instance creation, Vega preview embed, debug pane, completion provider registration. That synchronous work blocks the main thread before the host's CSS animation has finished settling the iframe size, so the editor paints (and freezes) at an interim, smaller viewport. Subsequent opens cache the schema/Monaco-init promise but still pay the mount cost on every transition, so the same freeze recurs more briefly.

This plan delivers a deferred-mount strategy that yields enough frames to the UI for the host to settle the viewport before any heavy editor work runs, and reduces the cost of subsequent opens by holding the editor mounted across transitions instead of tearing down and rebuilding.

## Problem Frame

- The first open shows "Preparing editor. Please wait..." (the `<EditorSuspense>` fallback) at a clearly truncated viewport.
- The "container hasn't finished expanding" symptom means the editor is mounting against a not-yet-final container size, and the synchronous mount work prevents the browser from completing the host's outer reflow before paint.
- The fix that already exists — `waitForPaint` (double `requestAnimationFrame`) inside `initializeEditorDependencies` — covers only the *one-time* schema/Monaco bootstrap. It does not protect against:
  1. Host CSS-animation-driven container resize that continues *after* the final `ResizeEnd` Power BI sends.
  2. Per-mount cost of Monaco/Allotment/Vega when the editor is reopened.

## Requirements Trace

- R1. Opening the editor for the first time must show the Suspense fallback (or a stable shell) at the *final* expanded viewport, not at an interim size.
- R2. Subsequent opens must not freeze the visible content of either the viewer or editor at an interim viewport while the host is animating.
- R3. The `<EditorSuspense>` "Preparing editor. Please wait..." copy and its fallback role must continue to function for the genuine first-load case where schemas/Monaco are still bootstrapping.
- R4. No regressions in the existing display-mode state machine for focus mode, fetching, landing, no-project, or transition-editor-viewer reverse direction.
- R5. Behaviour must remain correct on slow hardware where the host animation is longer than the assumed yield budget — a fixed-frame delay that races the host is not acceptable.
- R6. Solution is testable via the existing performance benchmark harness added in PR #624 / `2026-04-16-001-feat-performance-benchmarks-plan.md` where applicable.

## Scope Boundaries

- **In scope:** `src/app/app.tsx` mode routing, `packages/app-core/src/app/deneb-editor.tsx`, `packages/app-core/src/app/editor/components/editor.tsx`, `packages/app-core/src/app/editor/components/editor-content-loader.tsx`, `packages/app-core/src/app/editor/components/editor-content.tsx`, the `useEditorPaneLayout` hook, and a new viewport-settle gate.
- **Out of scope:** Reworking the Power BI display-mode detection itself in `src/lib/state/display-mode.ts`. The transition states already correctly bracket the host animation; we just need to use them better.
- **Out of scope:** Reducing the absolute size of Monaco's bundle or schema compile time. Those are tracked elsewhere; this plan addresses *when* the work runs, not *what* the work is.
- **Out of scope:** The reverse `editor → viewer` direction unless investigation in Unit 1 shows the same pattern is observable there.

## Context & Research

### Relevant code and patterns

- `src/app/app.tsx` — already returns `null` during `transition-viewer-editor` and `transition-editor-viewer`. Mounts `<DenebEditor />` only when `mode === 'editor'`. The freeze therefore happens at the *moment* of mount, not during the transition phase.
- `src/lib/state/display-mode.ts` — defines the mode state machine. The comment around `getResolvedDisplayModeForHostQuirks` explicitly assumes "the visible viewport is enough" once we reach `editor`. Empirically this is wrong: the host CSS expansion continues past the final `ResizeEnd`.
- `packages/app-core/src/app/editor/components/editor.tsx` — wraps content in `<Suspense fallback={<EditorSuspense />}>` plus an error boundary.
- `packages/app-core/src/app/editor/components/editor-content-loader.tsx` — uses React 19 `use()` against a module-level promise from `initializeEditorDependencies`. The promise is cached for the lifetime of the module, so the loader resolves synchronously on subsequent mounts.
- `packages/app-core/src/lib/editor-init/editor-init-service.ts` — the existing `waitForPaint` (double `requestAnimationFrame`) pattern. We will reuse this primitive but apply it to mount gating, not just init gating.
- `packages/app-core/src/app/editor/hooks/use-editor-pane-layout.ts` — uses `use-resize-observer` against the editor content container ref. `EditorContent` only renders its children once `containerWidth && containerHeight && hasHydratedViewports`, but the *initial* container size sampled is whatever the DOM measures at first paint — i.e., during the host animation.
- `packages/app-core/src/app/editor/components/editor-suspense.tsx` — the "Preparing editor. Please wait..." UI that should continue to be reused as a stable shell during the new gate.

### Institutional learnings

- Earlier work on `2026-04-16-001-feat-performance-benchmarks-plan.md` and `e465146a feat: add Vitest benchmarks for dataset processing hot paths (#624)` established the performance benchmarking infrastructure we should leverage to characterize this freeze and verify the fix.
- `49a87fa9 fix: ensure viewport is correctly restored when opening in focus mode (#621)` shows precedent for the host's viewport reporting being lossy across mode transitions — useful prior art.
- `b3b0abf2 feat: Add gating of JSON Schemas, Monaco Editor and AJV to editor interface (#591)` is the Suspense gating that makes this plan viable: we already have a single boundary to gate against.

### External references

External research not run for this plan. The problem is a known interaction between React 19 concurrent rendering, browser layout/paint scheduling, and the Power BI visual host's CSS animation. The patterns required (double-rAF, `ResizeObserver`-stable detection, `display: none` retention) are already present in this codebase or are well-understood browser primitives.

## Key Technical Decisions

- **Decision:** Introduce a "viewport-settle gate" between `mode === 'editor'` becoming true and `<DenebEditor>` actually mounting its heavy children. The gate observes the visual root container and waits until its measured width *stops changing* across two consecutive `ResizeObserver` callbacks, with a hard upper bound (e.g. 500&nbsp;ms) to guarantee progress on hosts that don't animate.
  - **Rationale:** A fixed N-frame yield races the host's CSS animation duration, which differs across Power BI host versions and user hardware. Detecting *stability* is robust to both fast and slow animations and degenerate "no animation" cases.
- **Decision:** During the gate, render the existing `<EditorSuspense>` fallback (or a structurally identical shell) so the user sees a stable "Preparing editor" surface at full pane size, not the interim partial viewport.
  - **Rationale:** Reuses the established loading affordance, keeps the visual stable, and avoids the cognitive whiplash of paint at one size then re-layout at another.
- **Decision:** Hold `<DenebEditor>` mounted across `editor → transition-editor-viewer → viewer → transition-viewer-editor → editor` cycles using a `display: none` toggle pattern rather than switching components in the `App` `useMemo` switch. Power BI never unloads the visual instance during these transitions, so we are simply toggling visibility on a tree we want to keep alive.
  - **Rationale:** This reduces second-and-subsequent-open cost from "remount Monaco + Allotment + Vega" to "show DOM and send a `view.run()` to Vega". This is the same pattern the project already uses for tab switching inside the editor; we are extending it one level up.
  - **Constraint:** Tree-shaking of the editor tree for viewer-only consumers (per the comment in `deneb-editor.tsx`) must be preserved — the retention strategy applies to the runtime visual mode toggle, not to bundle-time inclusion.
- **Decision:** Keep Phase 5 of the existing `initializeEditorDependencies` (Monaco diagnostics/completions/keybindings) where it is. Do not split it further — the heavy work is already gated by the Suspense boundary.
- **Decision:** Add a perf benchmark or instrumentation hook for the open-editor scenario before changing mount behaviour, so we can measure the freeze duration before/after.

## Open Questions

### Resolved during planning

- **Q: Does the editor mount during `transition-viewer-editor` today?** No. `src/app/app.tsx` already returns `null` for both transition states. The freeze starts the instant mode flips to `editor`. The fix therefore lives in the `editor`-mode mount path, not the transition routing.
- **Q: Is the schema/Monaco init still the bottleneck for first opens?** No; the existing `waitForPaint` already commits the Suspense fallback before that work begins, and on subsequent opens the init promise is cached. The cost on every open is the synchronous React commit of Monaco/Allotment/Vega children.
- **Q: Should we move to lazy `<DenebEditor>` via `React.lazy`?** Not a fit. The heavy modules are already imported by `deneb-editor.tsx`; pulling them behind `React.lazy` would re-introduce an additional async boundary without fixing the mount-time freeze.

### Deferred to implementation

- **Q: What threshold defines a "settled" container?** Likely "no width change across two consecutive RO callbacks, or 500&nbsp;ms elapsed since mode flip, whichever comes first." Tune during Unit 2 with measured data from Unit 1.
- **Q: Should the gate also key on height, or width-only?** Width is the dominant axis for Power BI's visual expansion when entering edit mode. To be confirmed during instrumentation in Unit 1.
- **Q: Where does the retention-by-`display:none` toggle live — in `App` or inside `DenebProvider`?** Likely a small new wrapper above `DenebEditor` so `App.tsx` stays declarative. Final placement to be decided in Unit 4 after Unit 2 lands.
- **Q: Does the reverse direction (`editor → viewer`) need any treatment?** The viewer is much cheaper to mount, so probably no. Confirm with measurement in Unit 1.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```text
Power BI host
   │  (user clicks Edit)
   ▼
update() ── viewer ──► transition-viewer-editor ──► editor
                                                       │
                                                       ▼
                                          App.tsx switch(mode)
                                                       │
                                                       ▼
                                        ┌──────────────────────────┐
                                        │  <ViewportSettleGate>    │  ← NEW
                                        │  observes root container │
                                        │  width via ResizeObserver│
                                        └──────────┬───────────────┘
                                                   │
                            (settled)              │              (still settling)
                              │                    │                    │
                              ▼                    ▼                    ▼
                    mount <DenebEditor>     no children mounted    show <EditorSuspense>
                              │                                          (or equivalent shell)
                              ▼
                    <Suspense fallback={EditorSuspense}>
                      <EditorContentLoader />   ← existing first-load gate
                          (use(initPromise))
                          ↓
                      <EditorContent />
                        ├ Allotment splitters
                        ├ Monaco editor instance
                        └ Vega preview / debug
```

For subsequent opens we additionally introduce a retention wrapper:

```text
App.tsx
   └── <KeepMountedOnEditorMode>
          (renders DenebEditor once initialized; toggles
           CSS visibility via display:none for non-editor modes)
          └── <ViewportSettleGate>  (gate runs only on first transition into editor)
                 └── <DenebEditor>
```

`ViewportSettleGate` runs on the first transition into editor mode in a session; once it has unblocked, the retention wrapper keeps the tree alive so subsequent transitions are visibility toggles only.

## Implementation Units

- [ ] **Unit 1: Instrument and measure the current freeze**

**Goal:** Establish a reproducible measurement of the freeze on first and subsequent opens, so the rest of the plan can be evaluated quantitatively.

**Requirements:** R6

**Dependencies:** None

**Files:**
- Create: `packages/app-core/src/lib/perf/editor-open-marker.ts`
- Modify: `packages/app-core/src/app/editor/components/editor.tsx` — add open-event marker
- Modify: `packages/app-core/src/app/editor/components/editor-content.tsx` — add first-paint marker
- Test: `packages/app-core/src/lib/perf/__tests__/editor-open-marker.test.ts`

**Approach:**
- Add lightweight `performance.mark` / `performance.measure` instrumentation gated by the existing `LOG_LEVEL` / `PBIVIZ_DEV_MODE` flags (see `config/features.json` and the env-var section of `CLAUDE.md`).
- Capture three durations: (a) mode→editor flip → `<DenebEditor>` mount commit, (b) mount commit → `EditorContent` first paint with non-zero container, (c) first paint → Monaco editor `onMount` callback fires.
- Emit a single structured `logDebug` line per open so the user can read them off the dev console while toggling the editor.

**Patterns to follow:**
- `@deneb-viz/utils/logging` for log gating
- The benchmark scaffolding from `2026-04-16-001-feat-performance-benchmarks-plan.md`

**Test scenarios:**
- *Happy path:* `recordEditorOpenStage('mount')` captured between matching `start` and `end` produces a non-negative duration.
- *Edge case:* No matching start mark — recorder logs a warning and does not throw.
- *Edge case:* `performance.now` unavailable (Node test env) — recorder no-ops and tests still pass.

**Verification:**
- Loading the dev visual and toggling viewer/editor produces three timing log lines per open.
- First-open and second-open numbers materially differ (first being slower), matching the observed user behaviour.

- [ ] **Unit 2: Introduce the viewport-settle gate**

**Goal:** Block heavy `<DenebEditor>` children from mounting until the visual root container has stopped resizing.

**Requirements:** R1, R2, R5

**Dependencies:** Unit 1

**Files:**
- Create: `packages/app-core/src/app/editor/components/viewport-settle-gate.tsx`
- Create: `packages/app-core/src/app/editor/hooks/use-container-stable.ts`
- Modify: `packages/app-core/src/app/editor/components/editor.tsx` — wrap children in the new gate
- Test: `packages/app-core/src/app/editor/hooks/__tests__/use-container-stable.test.ts`
- Test: `packages/app-core/src/app/editor/components/__tests__/viewport-settle-gate.test.tsx`

**Approach:**
- `useContainerStable` watches a passed ref via `ResizeObserver`. It transitions from `pending` → `settled` when two consecutive callbacks report the same `width` (and optionally `height`), or when an upper-bound timer elapses.
- `<ViewportSettleGate>` renders a stable shell (the `<EditorSuspense>` fallback or a structurally identical placeholder) until the hook reports `settled`, then renders `children`.
- The gate sits *outside* the existing `<Suspense>` boundary so the first-load schema/Monaco bootstrap still happens behind the same visible fallback — the user sees one continuous "Preparing editor" surface, not two.

**Patterns to follow:**
- `useResizeObserver` usage in `use-editor-pane-layout.ts`
- `waitForPaint` semantics from `editor-init-service.ts`

**Test scenarios:**
- *Happy path:* width stable across two RO callbacks → hook reports `settled`.
- *Happy path:* RO never fires (jsdom) → upper-bound timer reports `settled` after threshold.
- *Edge case:* width changes on every callback up to threshold → upper-bound wins; gate still releases.
- *Edge case:* component unmounts mid-pending → no setState-on-unmounted warning, no orphan timer.
- *Integration:* gate renders fallback then children once stable, with no double-render of children.

**Verification:**
- Unit 1 instrumentation shows the time from mode-flip to `EditorContent` first paint *increases* (we are deliberately yielding more), but the measured viewport at first paint matches the final pane size.
- The "interim small viewport with Preparing editor" frame from the original screenshot is no longer reproducible.

- [ ] **Unit 3: Defer Monaco editor mount within `EditorContent`**

**Goal:** Once the gate has released and `EditorContent` mounts, ensure the Allotment/preview/debug shell paints before the Monaco editor instance is constructed.

**Requirements:** R2

**Dependencies:** Unit 2

**Files:**
- Modify: `packages/app-core/src/features/editor-area/` (the component that owns the Monaco editor instance — exact file confirmed during implementation)
- Test: a co-located test file for the deferred-mount behaviour

**Approach:**
- Wrap the Monaco editor JSX inside `EditorArea` in either `useDeferredValue`-controlled rendering or a small `useDeferredMount` hook that yields one `requestAnimationFrame` after `EditorContent` first paints.
- Other panes (PreviewArea, DebugArea) follow the same pattern only if measurement in Unit 1 shows they contribute meaningful synchronous cost. If they don't, leave them alone.

**Patterns to follow:**
- The existing `startTransition` use in `settings-search-box.tsx`
- The double-rAF `waitForPaint` primitive

**Test scenarios:**
- *Happy path:* `EditorArea` renders a placeholder for one frame, then the Monaco container.
- *Integration:* When the deferred-mount hook is bypassed (e.g., test mode), the editor still mounts and behaves identically — i.e., this is a perf optimization, not a behaviour change.

**Verification:**
- Unit 1 instrumentation shows mount-commit → first-paint shrinks; first-paint → Monaco-onMount becomes non-trivial (we have moved cost off the critical path).
- No interaction regressions: keyboard shortcuts, autoApply, hover schema diagnostics still work after the deferred mount.

- [ ] **Unit 4: Retain the editor tree across viewer/editor toggles**

**Goal:** Eliminate the synchronous remount cost on every reopen by keeping `<DenebEditor>` mounted and toggling visibility instead of switching components.

**Requirements:** R2, R3, R4

**Dependencies:** Unit 2 (gate must exist so first mount still happens correctly)

**Files:**
- Create: `packages/app-core/src/app/keep-mounted-on-editor-mode.tsx` (or equivalent — exact name finalized at implementation)
- Modify: `src/app/app.tsx` — replace direct `<DenebEditor />` with a wrapped retention component for the `editor` case, and ensure the `viewer` case overlays correctly when the editor tree is still present in the DOM
- Test: `packages/app-core/src/app/__tests__/keep-mounted-on-editor-mode.test.tsx`

**Approach:**
- The retention wrapper mounts `<DenebEditor>` on first transition into `editor` and never unmounts it for the lifetime of the visual instance.
- For non-editor modes, the wrapper applies `display: none` to the editor subtree and renders the appropriate other component (viewer, landing, fetching, etc.) above/beside it.
- The `transition-*` modes continue to render `null` for the foreground, but the retained editor subtree remains hidden in the DOM so it can come back instantly.
- Critically: tree-shaking properties of `DenebViewer` vs `DenebEditor` (per `packages/app-core/src/app/deneb-editor.tsx` and `deneb-viewer.tsx`) must not regress. Static imports for the editor tree only happen when the consuming root package imports `DenebEditor`, which is already the case for the certified visual.

**Patterns to follow:**
- The existing `display: none` tab-switch pattern documented in `MEMORY.md` project patterns ("Editor uses display:none CSS (not unmount) for tab switching")
- The display-mode switch in `src/app/app.tsx` for the non-editor cases

**Test scenarios:**
- *Happy path:* First transition into `editor` mounts `DenebEditor` once and only once, even if the user toggles back and forth ten times.
- *Happy path:* While in `viewer`, the editor subtree is `display: none` and not interactive (focus, keyboard).
- *Edge case:* If the user enters `editor` mode and then the host issues a `landing` or `no-project` mode, the editor stays in DOM but hidden.
- *Edge case:* If the visual is destroyed (Power BI navigates away from the report), the retained tree is cleaned up by React unmount of `App` — no memory-leak surface to manage manually.
- *Integration:* Vega view inside the preview area continues to receive dataset updates while the editor is hidden? Decide in implementation: either keep updates flowing (so reopen is instant) or pause them (cheaper while hidden). Either way, on reopen the preview must reflect current data.

**Verification:**
- Unit 1 instrumentation on the second and third opens shows mode-flip → first-paint dropping to near-zero.
- No regressions in: focus mode entry/exit, landing page, no-project state, fetching state, applying spec changes, debug pane data updates.

- [ ] **Unit 5: Documentation, learnings, and clean-up**

**Goal:** Capture the architectural decision in `docs/solutions/` so future work doesn't accidentally reintroduce a remount-on-mode-change pattern, and update relevant in-repo docs.

**Requirements:** —

**Dependencies:** Units 2 and 4

**Files:**
- Create: `docs/solutions/<category>/editor-mount-deferral-and-retention-2026-05-01.md`
- Modify: `CLAUDE.md` — add a one-line mention under the Editor section about retention across viewer/editor toggles, if the existing wording is insufficient
- Modify: `docs/things-to-check.md` — remove this freeze item from the informal list if present; otherwise no change

**Approach:**
- Document: the host-animation timing problem, the viewport-settle gate, the retention wrapper, the upper-bound stabilization threshold chosen, and links to Units 2 and 4 PRs.
- Note any test or perf-benchmark failures that were useful tripwires so future regressions can be caught faster.

**Patterns to follow:**
- Existing entries under `docs/solutions/`, with the YAML frontmatter (`module`, `tags`, `problem_type`).

**Test scenarios:**
Test expectation: none — documentation only.

**Verification:**
- `docs/solutions/` has a new entry that the `learnings-researcher` agent surfaces when given a query about "editor mount" or "transition freeze".

## System-Wide Impact

- **Interaction graph:** The retention wrapper changes when `<DenebEditor>` mounts and unmounts. Any side effects in its `useEffect`s (and in `useDenebAppSetup('editor')`) now fire once per visual lifetime, not once per mode flip. Audit these effects in Unit 4 — anything that *should* re-run per open must be moved to a per-mode effect keyed on `mode === 'editor'`.
- **Error propagation:** The `<EditorErrorBoundary>` continues to wrap the Suspense boundary. The new gate sits above Suspense; errors thrown from the gate or its hook are caught by the same boundary.
- **State lifecycle risks:** With retention, Zustand state survives transitions (it already does), but DOM-level state (Monaco scroll position, debug pane scroll) now also survives — that's actually an improvement, but verify it does not collide with any "reset on open" assumption elsewhere.
- **API surface parity:** No external API changes. `DenebEditor` and `DenebViewer` exported entry points keep their tree-shaking guarantees.
- **Integration coverage:** Unit 1 instrumentation, plus Unit 4's mode-toggle integration scenarios, are the cross-layer coverage that single-component unit tests will not prove.
- **Unchanged invariants:** `src/lib/state/display-mode.ts` and the `transition-*` mode rules are unchanged. `App.tsx`'s overall switch-on-mode shape is preserved; only the `editor` case is wrapped.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Viewport-settle gate hangs in `pending` if a host quirk produces a never-stable width | Hard upper-bound timer (default 500&nbsp;ms) always releases the gate; tests cover this case explicitly. |
| Retention-by-`display:none` keeps Monaco workers and Vega views resident, raising idle memory | Verify with the perf benchmark; if material, add a "hidden for >N seconds" hook that disposes Monaco model layers (deferred to a follow-up). |
| Effects in `<DenebEditor>` that previously ran on every open silently stop running | Audit all `useEffect`s in the editor tree as part of Unit 4; convert per-open ones to depend on a "current mode is editor" boolean. |
| The deferred Monaco mount in Unit 3 introduces a perceptible "shell-then-editor" flash | If observed, fall back to a single-rAF defer instead of `useDeferredValue`, or skip Unit 3 entirely if Unit 2 + Unit 4 already meet R1/R2. |
| Tree-shaking for viewer-only consumers regresses | Keep `DenebEditor` import boundary identical; the retention wrapper lives in the same module graph as the editor. Verify with `npm run webpack:analyze`. |
| The test suite for viewport behaviour is jsdom-based; real freeze is a browser-only phenomenon | Pair the unit tests with manual verification against a deployed dev visual using the Unit 1 instrumentation, and document this in Unit 5. |

## Documentation / Operational Notes

- Manual verification path: `npm run dev`, load the visual in Power BI, toggle Edit → Back to report a few times, capture timing logs from the dev console. Repeat after each unit lands. Compare against baseline captured in Unit 1.
- No feature flag required — the change is a pure perf improvement with no behavioural toggle.
- No CHANGELOG migration impact; goes under "Performance" / "Fixes" for the next release.

## Sources & References

- Display-mode state machine: `src/lib/state/display-mode.ts`
- App routing: `src/app/app.tsx`
- Editor entrypoint: `packages/app-core/src/app/deneb-editor.tsx`
- Editor wrapper and Suspense: `packages/app-core/src/app/editor/components/editor.tsx`
- Editor content loader (existing first-load gate): `packages/app-core/src/app/editor/components/editor-content-loader.tsx`
- Editor content: `packages/app-core/src/app/editor/components/editor-content.tsx`
- Editor pane layout hook: `packages/app-core/src/app/editor/hooks/use-editor-pane-layout.ts`
- Editor init service: `packages/app-core/src/lib/editor-init/editor-init-service.ts`
- Suspense fallback: `packages/app-core/src/app/editor/components/editor-suspense.tsx`
- Related prior PRs: #591 (Suspense gating), #621 (focus-mode viewport restore), #624 (perf benchmarks), #611 (scrollbar/container utilization)
- Related plans: `docs/plans/2026-04-16-001-feat-performance-benchmarks-plan.md`
- Project patterns: `MEMORY.md` (editor uses `display:none` for tab switching — extending this pattern one level up)
