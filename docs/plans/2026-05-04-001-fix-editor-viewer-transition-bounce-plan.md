---
title: "fix: Resolve viewer bounce on editor → viewer transition"
type: fix
status: completed
date: 2026-05-04
solution: docs/solutions/ui-bugs/viewer-bounce-on-editor-exit-2026-05-04.md
origin: docs/brainstorms/2026-05-01-viewer-bounce-on-editor-exit-followup.md
---

# fix: Resolve viewer bounce on editor → viewer transition

## Summary

The freeze-on-transition fix retained `<DenebEditor>` across viewer↔editor toggles but left `<DenebViewer>` un-retained, so on **editor → viewer** the viewer mounts fresh, the new Vega view reads its container while the iframe is mid-shrink, renders large, and snaps to viewer size when the iframe finishes shrinking. This plan ships the fix in two phases: **Phase 1 — measure** the actual cause via per-frame `iw/vw` instrumentation (recovered from history), then **Phase 2 — implement** a viewer-side mount gate that mirrors the editor entry gate, so the viewer's Vega view is only rendered after the iframe has reached its smaller viewer-mode width. The plan defaults to Option C (viewer-side mount gate) but reserves a measurement checkpoint after Phase 1 to confirm or revise the approach before any production code is changed.

---

## Problem Frame

- **User-visible symptom.** When the user clicks "Back to report", the visual briefly renders at a larger-than-viewer intermediate size for a frame or two before snapping to the actual viewer-mode viewport. Smaller and faster than the original cold-open freeze, but observable.
- **Hypothesised cause (unverified — must be confirmed by measurement first).** The new `<DenebViewer>` mounts during `mode === 'viewer'`, while the Power BI host has not yet finished its CSS shrink of the iframe. Vega's first render reads the DOM container (or a stale `state.interface.embedViewport`) at the larger editor-pane size and renders to that. The host then completes the shrink, `ResizeObserver` fires, and Vega re-lays-out smaller — producing the visible bounce.
- **Constraints inherited from the parent investigation.**
  - `window.innerWidth === options.viewport.width` (width equality) is the only reliable positive signal that the host has finished its CSS resize. Height has a persistent ~36px chrome offset and is not reliable.
  - The host paces the iframe resize on its own schedule. We cannot speed it up; we can only control whether our content is visible during the host's settle period.
  - Timer-only fixes have a long tail (cold expansion observed >1500ms; shrink direction unmeasured but assume similar order of magnitude until proven otherwise).
  - **Do not propose fixes from a hypothesis without ground-truth measurement.** This is the core lesson from the parent work and is restated explicitly in the brainstorm seed.

---

## Requirements

- R1. The viewer's Vega view must not render visibly at any size other than the host's reported final viewer-mode viewport width.
- R2. A measurement-first phase must run before any production behaviour change. The fix's design must cite the measured evidence, not the hypothesis.
- R3. The viewer's Vega view state (the new view, since viewer is not retained today) must materialise within a bounded time after the host completes the shrink — no scenario where the gate fails closed and the viewer never renders.
- R4. The fix must not regress the parent freeze-on-transition fix on the viewer → editor direction (the entry gate in `<RetainedDenebEditor>`).
- R5. Diagnostic instrumentation added for measurement must be removed or `LOG_LEVEL`-gated before merging the fix, per certification posture (`LOG_LEVEL=0` for shipping builds; no diagnostic console output at default levels).

---

## Scope Boundaries

- **In scope.** A viewer-side mount gate (default: Option C) that holds back the Vega-embed render until `window.innerWidth === options.viewport.width` for the smaller viewer-mode width, with a safety upper-bound timer mirroring the editor gate. Reusable extraction of the gate primitive if cost-effective. Diagnostic recovery and removal cycle.
- **Explicit non-goals.**
  - Symmetric viewer retention (Option B). Architecturally the right long-term shape per the brainstorm, but a much larger routing rewrite. Captured as deferred follow-up.
  - Fixing the `renderingStarted` / `renderingFinished` contract — tracked separately with the Power BI visuals team.
  - Reducing the absolute iframe shrink time (host-controlled, not ours).
  - Re-deriving anything proven by the parent investigation (width-only match, ResizeObserver-is-wrong-signal, height-chrome-offset). Those land here as constraints, not as questions to re-litigate.

### Deferred to Follow-Up Work

- **Option B — symmetric viewer retention.** Likely paired with the Power-BI-host rendering-events refactor when that conversation lands. Deferred to a separate plan and branch. The Phase 2 mount gate landed here is compatible with Option B being added on top later — the gate becomes redundant when the viewer is retained, and can be removed as part of that work.

---

## Context & Research

### Relevant Code and Patterns

- `src/app/app.tsx:175-201` — `mainComponent` `useMemo` switching on `mode`. `editor` and both `transition-*` modes return `null`; `viewer` returns `<ReportViewRouter />`. Sibling `<RetainedDenebEditor>` lives at `app.tsx:238-242`. There is no symmetric `<RetainedDenebViewer>`.
- `src/app/report-view-router.tsx:11-28` — thin switch returning `<DenebViewer />` for the default case. **Not gate-able as written**; either wrap `<DenebViewer>` in a new gate component or lift the viewer mount up to `app.tsx`.
- `packages/app-core/src/app/deneb-viewer.tsx` — calls `useDenebAppSetup('viewer')`, renders `<Viewer />`.
- `packages/app-core/src/app/viewer.tsx` — `<VegaViewProvider>` wraps `<VisualViewer>`. `VegaViewProvider`'s `useState<View | null>(null)` resets on each mount, so the Vega view is freshly created on every viewer entry today.
- `packages/app-core/src/components/visual-viewer/components/vega-embed.tsx:75-258` — the embed component. `embedRef` is the container `div`. The initial `vegaEmbed()` call at `use-vega-embed.ts:58-105` reads `ref.current`'s size at call time — this is where the wrong-size first render originates.
- `packages/app-core/src/components/visual-viewer/components/vega-embed.tsx:319-339` — post-mount `denebContainer` signal updates on viewport changes; explains the visible reflow once the host catches up.
- `packages/app-core/src/app/retained-deneb-editor.tsx` — entry-gate reference. Module-local constants `VIEWPORT_SETTLE_TIMEOUT_MS = 3000` and `STALE_MATCH_BYPASS_MS = 150`. Effect body holds the polling/listener wiring inline (resize event + 100ms `setInterval` + `setTimeout` upper bound).
- `packages/app-core/src/app/retained-deneb-editor-state.ts:19-28, 85-96` — pure helpers `computeRetentionState` and `computeGateMatch` (both exported). `GateMatchInput` type exported. The pure predicate is reusable unchanged for a viewer-side gate.
- `packages/app-core/src/app/__tests__/retained-deneb-editor.test.ts:65-184` — `computeGateMatch` test fixture. Pattern is mirrorable for a viewer-side variant of the gate.
- `src/state/updates.ts:88-153` — `setEmbedViewport` gating. Updates are blocked while `doesModeAllowEmbedViewportSet(mode)` returns false; fallback unconditionally sets viewport when `embedViewport` is missing.
- `src/lib/state/display-mode.ts:44-50` — `doesModeAllowEmbedViewportSet` predicate: blocks `editor`, `transition-viewer-editor`, `transition-editor-viewer`. Allows `viewer`. Once mode flips to `viewer`, the next `ResizeEnd` update writes the new `embedViewport`. **Stale-larger embed viewport is a candidate cause** for the bounce and must be ruled in or out by Phase 1 measurement.
- `src/lib/state/display-mode.ts:208-216, 232-241` — editor → viewer transition path. Start: `transition-editor-viewer` (renders `null`). Confirm: requires `ResizeEnd` AND `editMode !== 1` to flip to `viewer`. Multi-update sequence documented in `display-mode.ts:163-178`.

### Institutional Learnings

- `docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md` — the parent solution. Documents host pacing on the **expanding** direction. **Shrinking direction is unmeasured.** Constraints (width-only match, height chrome offset, ResizeObserver-wrong-signal, no `renderingFinished`-gated host pacing) carry forward verbatim.
- `docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md` — Power BI reports mode-mismatched dimensions during transitions. `options.viewport` and `options.isInFocus` are both unreliable around mode changes; the persisted-dimensions fallback pattern (use last-known-good when live is suspect) is reusable. Implies focus-mode entry/exit is a third axis worth verifying in Phase 1 traces.
- `docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md` — single-writer principle for `renderId` in `vega-embed.tsx`'s `handleEmbed`. If the deferred Option B is later pursued, do NOT bump `renderId` from a slice to handle the retain/un-retain cycle.
- `docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md` — instrumentation methodology: `MutationObserver` on the preview SVG counts actual Vega teardowns/rebuilds and complements the per-frame iw/vw trace. Useful for distinguishing "Vega re-embedded at wrong size then again at right size" from "Vega embedded once and resized via ResizeObserver".

### External References

External research not run for this plan. The parent work already established the host-pacing facts and constraint set we are building on; local primitives are sufficient. If Phase 1 measurement uncovers a cause that contradicts the parent's findings (unlikely but possible), external research will be added in a Phase 1.5 amendment before Phase 2 starts.

---

## Key Technical Decisions

- **Measure before designing the fix.** Phase 1 (Units U1–U2) ships the diagnostic recovery and runs the trace. Phase 2 implementation (Units U3+) does not start until the measurement confirms the cause. Rationale: the parent investigation drifted across multiple plausible-but-wrong fixes before instrumentation found the actual cause. The brainstorm seed restates this lesson explicitly. Honoring it here is a hard requirement, not a stylistic preference.
- **Default to Option C, not Option B.** The viewer-side mount gate is surgical (mirrors a proven primitive), narrow in blast radius, and compatible with later layering Option B on top. Option B (symmetric viewer retention) is the correct long-term shape but a much larger routing rewrite, and the brainstorm explicitly suggests pairing it with the Power-BI host rendering-events refactor — that pairing belongs in its own branch.
- **Reuse the existing pure gate predicate.** `computeGateMatch` from `retained-deneb-editor-state.ts` is already exported and pure. The viewer-side gate consumes it unchanged. Only the effect-body wiring (poll, listeners, timeout) and the surrounding component need to be replicated. If the wiring is genuinely shareable, extract into a `useViewportMatchGate` hook in a small refactor unit; if duplication is cheaper than the abstraction, copy and move on (decision deferred to U3 — see Open Questions).
- **Width-only match holds on the shrink direction too — until measurement says otherwise.** The brainstorm flags this as an open question. Phase 1 will confirm. If measurement shows the shrink behaves differently (e.g. iframe shrinks faster than the host reports the new viewport), the gate's match condition or timeout may need adjustment, but the predicate's signature does not change.
- **`hostViewportHasChanged` semantics flip on the shrink direction.** On editor entry, the gate releases when `iw === vw` AND the viewport has *grown* since the gate engaged. On viewer exit, the equivalent guard must release when `iw === vw` AND the viewport has *shrunk* (or, more generally, *changed*) since the gate engaged. The pure predicate already takes `startWidth` and `currentWidth` so the directionality falls out of the inputs — no change to the predicate.
- **Diagnostic gating.** Recovered diagnostics ship as `LOG_LEVEL`-gated calls for the duration of Phase 1, not as always-on console output. They are removed (or held behind a permanent dev-only flag) in U6 before the branch merges.

---

## Open Questions

### Resolved During Planning

- **Does the brainstorm seed function as the origin document despite not being named `*-requirements.md`?** Yes. The user named it explicitly; the workflow's Core Principle 8 treats user-named resources as authoritative. Treated as origin throughout this plan.
- **Should this plan implement Option A, B, or C?** Default Option C, with a measurement checkpoint between Phase 1 and Phase 2 that authorises a course-correction to A or B if evidence demands it. Option A (accept) is rejected because the work is already on a branch named `fix/editor-viewer-transition-bounce` — committing to ship something is implicit. Option B is deferred per Scope Boundaries.

### Deferred to Implementation

- **Is the bounce caused by (a) Vega's first `vegaEmbed()` reading the DOM at mid-shrink, (b) Vega rendering against a stale-larger `state.interface.embedViewport` propagated through `<VisualViewer>`, (c) iframe shrinking gradually, or (d) some combination?** Resolved in Phase 1 (U2). Affects whether Phase 2's gate goes around `<VisualViewer>` (covers stale-embed-viewport too) or only around `<VegaEmbed>` (narrower).
- **Does the host shrink the iframe gradually or in a single jump?** Resolved in U2. If single-jump, the gate's timeout can be tighter than 3000ms; if gradual, the parent's 3000ms safety bound carries forward.
- **Where does the gate live in the routing tree?** Determined by U2's findings about the cause. Candidate sites: a new `<RetainedDenebViewer>` wrapper at `src/app/app.tsx` mirroring `<RetainedDenebEditor>`, a smaller gate inside `<DenebViewer>` or `<Viewer>`, or a still-narrower gate around just `<VegaEmbed>` inside `<VisualViewer>`.
- **Extract `useViewportMatchGate` hook, or duplicate the effect body?** Decided in U3 once the viewer-side wiring is sketched. If the wiring genuinely diverges from the editor's, duplication is fine; if it's near-identical, extract.
- **Does Phase 1 instrumentation also surface focus-mode entry/exit issues that should be fixed in this plan or deferred?** Decided after U2. Default: deferred unless measurement reveals a blocker on the viewer-bounce path itself.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

Phase 2 mount-gate timing (default Option C):

```
mode:                 editor                transition-editor-viewer            viewer
                      |                     |                                   |
host iframe width:    [editor-pane width ─────────── (host paces shrink) ──────────────► viewer width]
                      |                     |                                   |
mainComponent:        null (editor renders) null                                <ReportViewRouter />
                                                                                |
                                                                                ├─ <DenebViewer>
                                                                                |    └─ <Viewer>
                                                                                |         └─ <VegaViewProvider>
                                                                                |              └─ <VisualViewer>
                                                                                |                   |
                                                                                |  ┌────── viewer-side gate engages here ──┐
                                                                                |  | gate-pending: do not mount <VegaEmbed>;
                                                                                |  | render placeholder or empty container.
                                                                                |  | release when iw === vw AND vw has
                                                                                |  | changed since engage, OR 3000ms timeout.
                                                                                |  └─────────────────────────────────────────┘
                                                                                |                   |
                                                                                |                   └─ <VegaEmbed>  (mounts after release)
                                                                                ▼
                                                                              [iframe at viewer width — Vega first render at correct size]
```

Reused primitive: `computeGateMatch({ startWidth, currentWidth, iframeInnerWidth, elapsedMs, bypassMs })` from `packages/app-core/src/app/retained-deneb-editor-state.ts`. Same predicate, opposite directionality of width change. New surface: a small wrapper component (or hook) that engages the gate at `viewer`-mode entry and releases the Vega-embed render when the predicate returns true.

---

## Implementation Units

- U1. **Recover diagnostic instrumentation from history**

**Goal:** Bring back the `edit-transition-trace` diagnostic and the `logHostEvent` call sites so a measured trace can be captured during editor → viewer transitions. Strictly recovery — no behaviour change beyond logging.

**Requirements:** R2

**Dependencies:** None.

**Files:**
- Create: `src/lib/diagnostics/edit-transition-trace.ts` (recovered from PR #657 pre-squash history; if unrecoverable, reconstruct from the description in `docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md`)
- Modify: `src/index.ts` — re-import `logHostEvent` and call it from the host event sites that previously had it (notably the `update()` method's host-reported viewport and the `renderingStarted`/`renderingFinished` paths)
- Modify: `src/app/app.tsx` — re-import `startEditTransitionTrace` and `logHostEvent`. Add a `useLayoutEffect` that fires `startEditTransitionTrace(...)` on every mode transition into a relevant phase (specifically `editor → transition-editor-viewer → viewer`, in addition to the editor-entry direction the parent investigation used). Add a `visualUpdateOptionsRef` so the trace can read the latest `options.viewport` per frame
- Modify: `src/app/app.tsx` — wire `logHostEvent` calls inside `onRenderingFinished` and `onRenderingError` rendering callbacks

**Approach:**
- Recover via `gh pr view 657 --json commits` or the PR's Files Changed history; failing that, reconstruct against the documented behaviour: per-RAF `window.innerWidth/Height` and `options.viewport.width/Height` for ~2 seconds after a transition trigger, batched into a single `console.log` at the end of the window.
- Extend the trigger condition to fire on the editor → viewer direction. The parent investigation only traced editor entry; this plan also needs viewer entry.
- All trace calls must be `LOG_LEVEL`-gated so the recovery does not change behaviour at default log levels.

**Patterns to follow:**
- `packages/utils/src/logging` (or wherever the project's log-level helpers live — the existing `logHost`, `logRender` calls in `app.tsx` are the same family)
- Single-batched `console.log` of the timeline at the end of the trace window — established by the parent investigation as the readable form

**Test scenarios:**
- *Happy path:* with `LOG_LEVEL=DEBUG`, opening editor mode logs an editor-entry trace at the end of the 2s window; clicking "Back to report" logs an editor-exit trace.
- *Edge case:* with `LOG_LEVEL=0` (default), no trace output appears in the console.
- *Edge case:* mode transitions that don't match the trigger condition (e.g. `landing → viewer`) don't fire a trace.
- Test expectation note: this is dev-only instrumentation; full unit-test coverage of the trace is not warranted. A smoke test that the gating works at `LOG_LEVEL=0` is sufficient.

**Verification:**
- `npm run dev` starts cleanly.
- With `LOG_LEVEL=DEBUG`, opening and exiting editor mode each produces a single batched `[edit-transition-trace]` log line.
- With `LOG_LEVEL=0`, no `[edit-transition-trace]` or `[host-events]` lines appear.

---

- U2. **Capture and analyse editor → viewer transition evidence**

**Goal:** Run the recovered trace across realistic conditions and produce a written analysis that confirms or refutes the brainstorm's hypothesis. This is the gate between Phase 1 and Phase 2 — Phase 2 unit definitions assume Option C; if the analysis demands Option A or B, this plan is amended before proceeding.

**Requirements:** R2

**Dependencies:** U1.

**Files:**
- Create: `docs/solutions/ui-bugs/viewer-bounce-on-editor-exit-2026-05-NN.md` — the captured measurement and conclusion. Frontmatter `category: ui-bugs`, `module: app-core`, `problem_type: ui_bug`, `component: viewer`. **Note:** the date in the filename is the day the trace is captured, set at write time. Initially marked status `investigating`; flipped to `resolved` (or `superseded`) when U6 lands.

**Approach:**
- Run the trace under `npm run dev` with `LOG_LEVEL=DEBUG` against a realistic visual (not an empty one — use a project with non-trivial Vega/Vega-Lite spec to surface mount-time render cost).
- Capture editor → viewer transition timelines for: (1) cold open (fresh visual), (2) warm re-entry, (3) focus-mode entry/exit if reachable on the same path. Capture at least 3 traces per scenario for stability.
- Cross-reference with a `MutationObserver` on the Vega preview SVG (transient — added only during this measurement; not committed) to count actual `<svg>` teardown/rebuild cycles. Distinguishes "Vega re-embedded at wrong size then again at right size" from "Vega embedded once and resized via ResizeObserver".
- Read `state.interface.embedViewport` value at the moment `<DenebViewer>` mounts (via a transient `console.log` in `<VisualViewer>`'s mount effect). Confirm or refute the stale-embed-viewport hypothesis.
- **Decision:** at the end of U2, the evidence either supports Option C as scoped (proceed to U3+), supports a narrower fix (e.g. just clearing stale `embedViewport` on viewer entry), or supports Option B (symmetric retention) instead. Document the chosen path in the new solution doc and update this plan's Implementation Units accordingly before Phase 2 starts.

**Patterns to follow:**
- Parent investigation methodology — instrument actual visible properties (`window.innerWidth/Height`, `options.viewport.*`, `getBoundingClientRect`) before designing fixes. Single-batched logs for readability. `MutationObserver` for DOM-level counts.

**Test scenarios:**
Test expectation: none — analysis-only unit. The output is the written analysis, not new code.

**Verification:**
- The new solution doc records: (a) per-frame iw/vw timelines for cold/warm/focus scenarios, (b) `MutationObserver` mutation counts that distinguish re-embed from resize, (c) the `embedViewport` value at mount, (d) the conclusion about cause (a/b/c/d from Open Questions), and (e) the chosen fix path with rationale.
- This plan's Implementation Units U3+ are reviewed against the conclusion before any code on them lands; updated if the conclusion contradicts the default Option C scope.

---

- U3. **Build viewer-side mount gate primitive (default = Option C)**

**Goal:** Implement a small viewer-side gate that holds the Vega-embed render until `iw === vw` for the new viewer-mode width, mirroring the editor entry gate. Reuse `computeGateMatch` from the parent work; replicate the effect-body wiring (resize listener + 100ms poll + `setTimeout` upper bound). Decide between hook extraction and duplication once both call sites exist.

**Requirements:** R1, R3, R4

**Dependencies:** U2 (must confirm Option C is the right path).

**Files:**
- Create: `packages/app-core/src/app/retained-deneb-viewer.tsx` — the wrapper component that consumes the gate and exposes `<RetainedDenebViewer isViewerMode hostViewportWidth hostViewportHeight />`. Mirrors `<RetainedDenebEditor>`'s shape but inverted: gate engages on viewer-mode entry from `transition-editor-viewer`, not on first viewer mount.
- Create or modify: `packages/app-core/src/app/retained-deneb-viewer-state.ts` — pure helpers if the viewer's retention/gate state shape diverges enough from the editor's. If `computeGateMatch` is sufficient unchanged, this file may not be needed and the viewer wrapper can import directly from `retained-deneb-editor-state.ts`.
- Modify: `packages/app-core/src/app/retained-deneb-editor-state.ts` — export `VIEWPORT_SETTLE_TIMEOUT_MS` and `STALE_MATCH_BYPASS_MS` constants if they become shared between the editor and viewer gates. Alternative: move them into a new `packages/app-core/src/app/viewport-gate-constants.ts` co-located with the gate primitives. Pick the lighter-touch option once the viewer wrapper is sketched.
- Modify: `packages/app-core/src/app/index.ts` (or the editor sub-entry barrel that exports `<RetainedDenebEditor>`) — export `<RetainedDenebViewer>`.
- Create: `packages/app-core/src/app/__tests__/retained-deneb-viewer.test.ts` — fixtures mirroring the editor gate's test, focused on the shrink direction.

**Approach:**
- Engage the gate when `mode` transitions into `viewer` from `transition-editor-viewer` (not on initial visual load — first viewer mount has no prior editor-pane width to shrink from).
- Hold the Vega-embed render via the same pattern as the editor: outer shell `display: none` is wrong here (the viewer IS the visible default), so instead render the viewer chrome and either (a) suppress `<VisualViewer>` entirely during gate-pending or (b) suppress just `<VegaEmbed>` inside `<VisualViewer>`. U2's analysis informs the choice — if the cause is Vega's first DOM read, suppressing `<VegaEmbed>` is sufficient; if the cause is stale `embedViewport`, suppressing `<VisualViewer>` is needed so `<VegaEmbed>` doesn't compute against stale dimensions.
- Reuse `computeGateMatch` unchanged. The directionality (shrink vs grow) falls out of `startWidth` vs `currentWidth` comparison in the predicate's input, not the predicate itself.
- 3000ms upper-bound timer is the safety net — same constant as the entry gate. If U2 measures the shrink at consistently <500ms, the timer can be lowered for the viewer gate; document the decision in code if so.

**Execution note:** Build the pure gate predicate or wrapper-state helper test-first if the helper is non-trivial. The integration component itself follows after.

**Patterns to follow:**
- `packages/app-core/src/app/retained-deneb-editor.tsx` — overall component shape, effect wiring, listener cleanup
- `packages/app-core/src/app/retained-deneb-editor-state.ts` — pure-helper extraction
- `packages/app-core/src/app/__tests__/retained-deneb-editor.test.ts:65-184` — test-fixture shape for `computeGateMatch` consumers

**Test scenarios:**
- *Happy path:* with viewer mode entered from `transition-editor-viewer` and a viewport-width change from larger to smaller, the gate releases when `iw === vw` AND `currentWidth !== startWidth`. The Vega embed mounts after release.
- *Happy path (Covers brainstorm hypothesis):* gate engaged at editor-pane width 1200 → host viewport reports 600 → host shrinks iframe to 600 over ~300ms → gate releases on the first frame where `iw === 600`. No frame is rendered with Vega at width >600.
- *Edge case:* gate engaged → host never shrinks the iframe (unrealistic but possible) → 3000ms timeout fires → Vega mounts at whatever size; verify no permanent stuck state.
- *Edge case:* viewer mode entered NOT from `transition-editor-viewer` (e.g. on first visual load, or from `landing` → `viewer`) → gate does not engage → Vega mounts immediately. No regression on the cold-open path.
- *Edge case:* width has not changed since gate engaged (stale match — iframe still at editor width when viewer mode flips) → gate holds until `currentWidth !== startWidth`, just like the entry gate.
- *Error path:* `hostViewportWidth` is `undefined` (no `visualUpdateOptions` yet) → predicate returns "no match"; gate stays pending until inputs are valid; safety timer eventually releases. No crash.

**Verification:**
- New unit tests pass alongside the existing `retained-deneb-editor.test.ts` suite.
- Manual: open editor, click "Back to report". Observe no visible larger-then-snap bounce. The viewer's first paint is at the correct viewer-mode size.
- `npm run test` passes. Type-check, lint, prettier clean.

---

- U4. **Wire `<RetainedDenebViewer>` into app routing**

**Goal:** Replace the direct `<ReportViewRouter />` mount under `mode === 'viewer'` with the gated wrapper, mirroring how `<RetainedDenebEditor>` sits as a sibling of `mainComponent`. Decide whether the wrapper sits inside `mainComponent`'s `viewer` case (narrowest blast radius) or as a sibling like the editor wrapper (most consistent with the parent's pattern).

**Requirements:** R1, R3, R4

**Dependencies:** U3.

**Files:**
- Modify: `src/app/app.tsx` — the `mainComponent` `useMemo`. Either: (a) replace `<ReportViewRouter />` with `<RetainedDenebViewer ...><ReportViewRouter /></RetainedDenebViewer>`, or (b) lift the viewer mount up to a sibling of `<RetainedDenebEditor>` and have both wrappers manage visibility based on `mode`. (a) is the narrower change; (b) is more consistent.
- Modify: `src/app/report-view-router.tsx` — only if (b) is chosen, since the gate semantics now live one level up.
- Possibly modify: `packages/app-core/src/app/deneb-viewer.tsx` — if U2's analysis indicated the gate should sit *inside* the viewer (e.g. around `<VisualViewer>` or `<VegaEmbed>` directly) rather than at `app.tsx`. Pick the level dictated by U2's evidence.

**Approach:**
- Default to the narrowest version: wrap inside `mainComponent`'s `viewer` case. Preserves the existing `ReportViewRouter` shape.
- Pass `hostViewportWidth/Height` from `visualUpdateOptions?.viewport` exactly as the editor wrapper does. This is the same source of truth — no new state plumbing.
- During gate-pending, render the viewer chrome (toolbar, splitters, anything not Vega-dependent) but suppress `<VegaEmbed>`. A small `"Loading viewer…"` placeholder is acceptable but optional; the bounce is short enough that no placeholder may be needed.

**Patterns to follow:**
- `src/app/app.tsx:238-242` — how `<RetainedDenebEditor>` is wired as a sibling. Mirror the prop-passing shape.

**Test scenarios:**
- *Happy path (Integration):* full editor → viewer round trip. Editor opens (entry gate works as before), user edits, clicks "Back to report", viewer renders without bounce. Repeat 5x in a session — no regression.
- *Integration:* visual cold-open path (no prior editor session) — viewer mounts immediately, no gate engagement, no regression.
- *Integration:* focus-mode entry/exit — covered by Phase 1's U2 measurement; if focus-mode showed a similar bounce in U2 traces, this unit's wiring must address it; if not, behaviour unchanged.
- *Edge case:* user clicks "Back to report" then immediately clicks "Edit" again before the gate has released — the viewer's gate disengages cleanly without firing the safety timer late; the editor entry gate engages normally. No double-gate state where both wrappers hold their content.

**Verification:**
- Manual cold + warm + focus-mode + landing transitions all behave as before, plus the editor → viewer bounce is no longer visible.
- `npm run dev` rebuilds clean. Type-check, lint, prettier clean.
- `npm run test` passes.

---

- U5. **Update memory and `docs/solutions/`**

**Goal:** Update institutional memory so a future session inherits the correct mental model of asymmetric vs symmetric retention and the viewer-side gate.

**Requirements:** R5 (indirectly — keeps the documentation trail clean alongside the diagnostic removal in U6)

**Dependencies:** U4.

**Files:**
- Modify: `docs/solutions/ui-bugs/viewer-bounce-on-editor-exit-2026-05-NN.md` (created in U2) — flip status from `investigating` to `resolved`. Add the `Resolution` and `Diagnosis methodology` sections describing the mount gate and the measurement that justified it.
- Modify: `docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md` — update the "Known follow-ups" entry to point at the new solution doc and mark the viewer-bounce follow-up as resolved.
- Modify: project memory entries (referenced by `MEMORY.md`) for `freeze-investigation-2026-05-01` — note that the asymmetric-retention follow-up was resolved with a viewer-side mount gate, and that Option B remains deferred for the rendering-events refactor.

**Approach:**
- Mirror the parent solution doc's structure (Problem / What didn't work / Root cause / Resolution / Diagnosis methodology / Known follow-ups / Related).
- Cross-link both solution docs.

**Test scenarios:**
Test expectation: none — documentation only.

**Verification:**
- Both solution docs are linked from each other and from the brainstorm seed.
- `MEMORY.md` index entries (if any reference the freeze investigation) point at the resolved state.

---

- U6. **Cleanup — remove or permanently gate diagnostic instrumentation**

**Goal:** Get the recovered diagnostic out of production code, mirroring Unit 7 of the parent plan. Production builds must not ship with `[edit-transition-trace]` or `[host-events]` console output at any default log level.

**Requirements:** R5

**Dependencies:** U4, U5.

**Files:**
- Delete: `src/lib/diagnostics/edit-transition-trace.ts`
- Modify: `src/index.ts` — remove `logHostEvent` import and call sites
- Modify: `src/app/app.tsx` — remove `startEditTransitionTrace` import, the `useLayoutEffect` that fires it, the `visualUpdateOptionsRef`, and `logHostEvent` import + call sites in the rendering callbacks

**Approach:**
- Pure deletion. No replacement. Same shape as the parent plan's Unit 7.
- If a future-proof path is preferred (keep the trace permanently behind a feature flag rather than deleting), add the file under `src/lib/diagnostics/` with a feature-flag entry in `config/features.json` and document it. Default decision: delete; the trace is recoverable from history again if needed.

**Test scenarios:**
Test expectation: none — pure deletion of dev-only instrumentation.

**Verification:**
- `npm run webpack:build` clean.
- `Grep` for `edit-transition-trace`, `startEditTransitionTrace`, `logHostEvent` in `src/` returns no production-code hits (docs hits are fine).
- `npm run validate-config-for-commit` passes.
- Type-check, lint, prettier clean.

---

## System-Wide Impact

- **Interaction graph.** `<RetainedDenebViewer>` becomes a new visibility boundary for the viewer's Vega-embed render, sitting alongside `<RetainedDenebEditor>` as a sibling pattern. Anything that previously assumed `<DenebViewer>` mounts immediately when `mode === 'viewer'` must consider the gate-pending window. Today there are no consumers who make that assumption beyond `<VisualViewer>` itself; verify in U4.
- **Error propagation.** No change. Vega-embed errors continue to flow through `onRenderingError` exactly as before; the gate only delays when the embed mounts.
- **State lifecycle risks.** The viewer's Vega view is still un-retained — every viewer entry creates a fresh view. Compared to the editor's retention, this is the asymmetric shape the brainstorm flagged as the wrong long-term form. The gate fixes the visible symptom but does not fix the underlying churn; that's Option B's job, deferred.
- **API surface parity.** `<RetainedDenebViewer>` exported from `@deneb-viz/app-core/editor` (or wherever `<RetainedDenebEditor>` lives — same barrel). Consumers receive the same prop shape as the editor wrapper.
- **Integration coverage.** Cross-layer scenario unit tests alone won't prove: full editor → viewer round trip, cold open path, focus-mode entry/exit. Manual verification per U4's test scenarios is the load-bearing check.
- **Unchanged invariants.** Display-mode state machine (`src/lib/state/display-mode.ts`). `doesModeAllowEmbedViewportSet` predicate (still blocks editor + transitions). `<RetainedDenebEditor>` and its match-based gate (the parent fix's primary surface) — explicitly NOT modified by this plan beyond optional constant-export refactors in U3.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| U2 measurement contradicts the brainstorm hypothesis (e.g. cause is stale `embedViewport`, not mid-shrink DOM read) | This plan's Phase 2 unit definitions are revised before any U3+ code lands. Worst case: Phase 2 becomes a one-line embed-viewport refresh rather than a wrapper component. The plan structure (measurement-first checkpoint at end of U2) is built around this risk. |
| Shrink direction behaves differently from expand (e.g. iframe shrinks instantly, no host-paced delay; or shrinks in multiple steps) | Width-only match still holds as the positive signal; only the timeout and direction-of-change guard need adjustment. Encoded in `computeGateMatch`'s inputs, not its predicate. |
| Asymmetric retention persists as the long-term shape because Option B keeps getting deferred | Acceptable for this plan. Option B is captured in Scope Boundaries / Deferred for follow-up. The mount gate is compatible with Option B layered on top later — gate becomes redundant when retention is added, removed as part of that work. |
| Diagnostic recovery is harder than expected (PR #657 squashed, no local reflog) | Reconstruct from the description in `docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md` — the behaviour is documented in enough detail to re-implement in <50 lines. Acceptable because the trace is dev-only; rebuilding it from prose is cheap. |
| Gate fails closed (matches never holds AND timeout misfires) → viewer never renders | Two-layer safety: the predicate's safety timer fires unconditionally at 3000ms regardless of match state. If both layers fail, the existing `mode` machinery still flips back through the state on the next host update. Tested in U3's "match never holds" scenario. |
| Gate fails open (releases on the first frame, missing the bounce window) | Mitigated by the `hostViewportHasChanged` guard — the gate only releases when the viewport has actually changed since engagement. Any stale match is ignored. Same guard the editor entry gate already uses. |
| Removing the instrumentation regresses the trace ability for the next investigation | Same as parent plan's Unit 7. Recovery from git history (or rewrite from the documented behaviour) remains cheap. The trace stays useful only as long as the host's pacing behaviour is the bottleneck — likely until the rendering-events refactor with the Power BI visuals team lands. |

---

## Documentation / Operational Notes

- Manual verification path on each unit landing: `npm run dev` with `LOG_LEVEL=DEBUG`, toggle Edit ↔ Back to report several times across cold and warm starts, confirm no visible larger-then-snap bounce on exit. Compare against the trace timelines captured in U2 — gate-release timestamps should align with `iw === vw` events in the trace.
- No feature flag needed. The mount gate is a pure visual fix; no config surface.
- CHANGELOG: under "Performance" / "Fixes" for the next release, paired with or following the parent freeze-on-transition fix entry.
- The `renderingStarted` / `renderingFinished` contract issues remain tracked separately with the Power BI visuals team. If that conversation lands during Phase 2, revisit whether the mount gate should be re-shaped around the new contract before merging.
- Branch is already `fix/editor-viewer-transition-bounce`. PR title should match this plan's title; PR body should cite the brainstorm seed and the new solution doc from U2/U5.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-01-viewer-bounce-on-editor-exit-followup.md](../brainstorms/2026-05-01-viewer-bounce-on-editor-exit-followup.md)
- Parent plan: [docs/plans/2026-05-01-001-perf-resolve-freeze-on-transition-plan.md](2026-05-01-001-perf-resolve-freeze-on-transition-plan.md)
- Parent solution: [docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md](../solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md)
- Adjacent learning (focus-mode dimensions): [docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md](../solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md)
- Adjacent learning (single-writer renderId): [docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md](../solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md)
- Instrumentation methodology (MutationObserver): [docs/solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md](../solutions/logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md)
- Editor gate primitive: `packages/app-core/src/app/retained-deneb-editor.tsx`, `packages/app-core/src/app/retained-deneb-editor-state.ts`
- Display-mode predicate: `src/lib/state/display-mode.ts:44-50`
- App routing: `src/app/app.tsx:175-201`
- Vega-embed mount path: `packages/app-core/src/components/visual-viewer/components/vega-embed.tsx:75-258`, `packages/vega-react/src/hooks/use-vega-embed.ts:58-105`
- Branch: `fix/editor-viewer-transition-bounce`
