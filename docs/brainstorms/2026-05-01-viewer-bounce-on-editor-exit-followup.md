# Viewer "bounce" on editor → viewer exit (follow-up)

**Status:** Brainstorm seed for the next effort.
**Origin:** Surfaced during manual verification of the freeze-on-transition fix on branch `perf/resolve-freeze-on-transition`.
**Related:** `docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md`, `docs/plans/2026-05-01-001-perf-resolve-freeze-on-transition-plan.md`.

## Problem statement

When the user exits the editor (clicks "Back to report"), the visual briefly renders at a larger-than-viewer size for a frame or two before snapping to the actual report-view viewport. The "bounce" is small and quick — measurably less jarring than the original cold-open freeze — but it is observable and feels like a residual artefact of the retention work.

## Most likely cause (unverified — diagnose first)

The freeze-on-transition fix retains `<DenebEditor>` across viewer↔editor toggles but does NOT retain `<DenebViewer>`. On editor → viewer:

1. `mainComponent` switches from `null` (editor mode) to `<ReportViewRouter>` (viewer mode)
2. `<DenebViewer>` mounts fresh — new `<VegaViewProvider>`, new Vega view instance
3. The new Vega view reads its container size at mount time
4. At that moment the host iframe is mid-shrink (still at the larger editor-pane size)
5. Vega renders at that intermediate size
6. Iframe finishes shrinking → `ResizeObserver` fires → Vega re-lays-out smaller

This is the symmetric reverse of the original problem (host pacing the iframe expansion vs contraction). The original was masked by the editor's own expensive remount; with editor retention in place the viewer's render-at-stale-size is now the visible thing.

## Lesson explicitly learned in the parent work

**Do not propose fixes from a hypothesis without ground-truth measurement.** The freeze-on-transition investigation drifted across multiple rounds of plausible-but-wrong fixes before the actual cause was instrumented. Apply the same discipline here: before designing a fix, instrument the actual visual sizes during the editor → viewer transition and confirm the cause matches the hypothesis above.

The instrumentation pattern we want — mirrored from `src/lib/diagnostics/edit-transition-trace.ts` (since removed, but recoverable from history):

- Per animation frame, log `window.innerWidth/Height` and `options.viewport.width/Height` for ~2 seconds following an editor → viewer transition
- Cross-reference against `host.eventService.renderingStarted` / `renderingFinished` calls (note: these have their own correctness issues being tracked separately with the Power BI visuals team)
- Confirm whether the bounce is iframe-pacing (host shrinks gradually) or single-jump (iframe shrinks all at once and Vega is just behind)

## Three options surfaced during the parent work

- **Option A — accept it.** Smaller and faster than the original, and a known cost of asymmetric retention. Cheapest.
- **Option B — symmetric retention for the viewer.** Mirror what we did for the editor — keep `<DenebViewer>` mounted, toggle visibility. Significant App.tsx routing rewrite, more carrying cost.
- **Option C — small viewer-side mount gate.** Defer the viewer's Vega render until `window.innerWidth === options.viewport.width` for the new smaller viewport. Same match-based logic as the editor entry but on the way out.

The parent plan recommended Option A for this branch and parking the issue. This brainstorm captures it for the next effort.

## Open questions for the next effort

- Is the viewer's mount-time Vega render actually the source of the bounce, or is it `state.interface.embedViewport` propagation? (`doesModeAllowEmbedViewportSet` already gates updates during `editor` and `transition-*` modes — so the embed viewport may be stale-larger when viewer mode resumes.)
- Does Power BI's host shrink the iframe gradually like it expands, or does it jump? The expansion data showed a single jump after a host-paced wait. Shrinking may behave differently.
- Are there other host-paced events on exit (`renderingFinished` for the final viewer render?) that could be coordinated with the rendering events refactor planned with the Power BI visuals team?
- Could Option B (viewer retention) be paired with the rendering events refactor so we land both at once? Asymmetric retention is fine for the freeze fix but probably the wrong long-term shape.

## Suggested next-effort approach

1. Instrument first — recover the diagnostic pattern, capture the editor → viewer transition with traces.
2. Confirm the cause matches the hypothesis above (or refute it).
3. Choose Option A / B / C based on confirmed cause and the current state of the rendering events conversation with Microsoft.
4. Write a proper plan (`/ce:plan`) and ship as its own branch.
