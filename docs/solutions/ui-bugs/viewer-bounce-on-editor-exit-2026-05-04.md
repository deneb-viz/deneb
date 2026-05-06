---
title: Viewer bounce / blank on editor → viewer transition
date: 2026-05-04
category: ui-bugs
module: app-core
problem_type: ui_bug
component: viewer
symptoms:
    - 'Browser dev / Service: viewer briefly renders at a larger-than-viewer intermediate size for a frame or two before snapping to the actual viewer-mode viewport ("bounce")'
    - 'Power BI Desktop with snap-to-grid OFF: viewer is blank for ~3 seconds after clicking Back to report; resizing the visual fixes it instantly'
    - 'Power BI Desktop with snap-to-grid ON: works correctly (visuals are forced to integer dimensions)'
    - 'Asymmetric retention — `<DenebEditor>` is retained across viewer↔editor toggles after PR #657, but `<DenebViewer>` is not, so every editor → viewer transition mounts a fresh `<VegaEmbed>`'
root_cause: host_paced_iframe_shrink_plus_subpixel_viewport_precision
resolution_type: code_fix
severity: low
tags:
    - viewer
    - viewport
    - retention
    - iframe
    - power-bi-host
    - shrink
    - subpixel
    - snap-to-grid
    - desktop
status: resolved
---

# Viewer bounce / blank on editor → viewer transition

## Problem

After PR #657 retained `<DenebEditor>` across viewer↔editor toggles, the user-visible freeze on the **entry** direction (viewer → editor) was resolved. The exit direction (editor → viewer) developed two related symptoms that surfaced in different environments:

- **Browser dev / Power BI Service:** a small, observable "bounce" — the viewer's Vega view briefly renders at the larger editor-pane width, then snaps to viewer-mode width when the iframe finishes shrinking.
- **Power BI Desktop, snap-to-grid OFF:** a 3-second **blank viewer** after Back-to-report, fixed instantly by resizing the visual.
- **Power BI Desktop, snap-to-grid ON:** no symptom — visuals are forced to integer dimensions, and the gate's success path fires correctly.

Both symptoms come from `<DenebViewer>` mounting fresh on every editor → viewer transition (asymmetric retention) and reading its container size before the iframe has settled. The Desktop blank turned out to have a second cause stacked on top of the bounce.

## Root cause

Two contributing factors:

1. **Host-paced iframe shrink.** The Power BI host reports the new (smaller) `viewport.width` to the visual _before_ it physically shrinks the iframe — same shape as the parent investigation found on the expanding direction. There is a window of tens to ~150ms where `options.viewport.width` is the new viewer-mode width but `window.innerWidth` is still the editor-pane width. Anything that mounts during this window renders at the wrong size; when the iframe finishes shrinking, `ResizeObserver` fires and Vega re-lays-out — the visible bounce.

2. **Sub-pixel viewport precision in Power BI Desktop.** When snap-to-grid is **off** in the report, Power BI can report fractional viewport dimensions (e.g. `286.4729`). `window.innerWidth` is integer per the DOM spec. Strict equality between an integer iframe width and a float host viewport never holds — the gate's success path never fires, only the 3000ms safety timer does. The visible result is a blank viewer for the full safety window.

The reliable positive signal is still `window.innerWidth === options.viewport.width`, but **both sides must be at the same precision** for strict equality to be meaningful, and the comparison target must be the value the iframe is actually settling to (not whatever the host happens to be reporting at that moment).

## What didn't work — recorded so future investigations don't retread these

Several rounds of hypothesis-driven fixes were attempted before snap-to-grid surfaced the actual second cause. They are recorded here as cautionary detail.

| Approach                                                                                                      | Why rejected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Width tolerance (`Math.abs(iw - vw) <= 80`) on the shared predicate                                           | Treated the symptom (mismatch) without naming the cause. Worked for offsets up to 80px in theory; in practice did not fix Desktop, suggesting the offset wasn't a fixed chrome inset but something else. Reverted.                                                                                                                                                                                                                                                                                                   |
| Swap viewer-side gate target from live `options.viewport.width` to `state.interface.embedViewport.width` only | Architecturally cleaner — `embedViewport` is the canvas size the iframe is returning to in viewer mode, captured during prior viewer-mode `ResizeEnd` updates. Worked in browser dev / Service. Did NOT fix Desktop; the symptom persisted, indicating the precision of the stored `embedViewport` was the issue, not the source of the value. (Kept this change because it is still the correct architectural choice — `embedViewport` is the right target for the exit direction. Just not sufficient on its own.) |
| Add a tolerance back on top of the embedViewport swap                                                         | Would have been the wrong abstraction stacked on the right one. Snap-to-grid observation arrived first.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Power BI Desktop measurement via DevTools                                                                     | Power BI Desktop has no DevTools. Required adding an in-visual debug overlay (kept as a permanent diagnostic — see below) to read live values from inside the visual itself.                                                                                                                                                                                                                                                                                                                                         |

## Diagnosis methodology

Multi-phase, multi-environment.

### Phase 1: browser dev (initial confirmation)

Diagnostic recovered from PR #657's pre-squash history (re-implemented in `src/lib/diagnostics/edit-transition-trace.ts`, removed before merge in plan U6). Per-animation-frame samples of `window.innerWidth/Height` and `options.viewport.width/Height`, plus host events recorded via `logHostEvent`, batched into a single `logDebug` call at the end of a 2-second trace window. Confirmed the host-paced shrink hypothesis at the iw/vw level. See "Measurement evidence (2026-05-04)" below.

### Phase 2: Power BI Desktop (root-cause for the blank symptom)

DevTools is unavailable in Power BI Desktop, so console-log diagnostics are unreachable. Two lines of investigation surfaced the actual cause:

1. **In-visual debug overlay** ([src/features/viewport-gate-debug-overlay/](../../../src/features/viewport-gate-debug-overlay/)) — a fixed-position monospace HUD gated behind `PBIVIZ_VIEWPORT_GATE_OVERLAY=true` that renders mode, `window.innerWidth/Height`, `options.viewport.width/Height`, `embedViewport.width/Height`, and the relevant deltas directly inside the visual. Lets the developer read the values from screenshots/photos taken during a Desktop reproduction. Kept as a permanent diagnostic.
2. **The user's snap-to-grid observation.** While testing the Desktop blank, the user noticed the symptom occurred only with snap-to-grid OFF in the report — and disappeared with snap-to-grid ON. That single environmental difference pointed directly at sub-pixel precision: snap-to-grid forces visuals to integer dimensions; without it, Power BI passes fractional widths through `options.viewport.width`.

The snap-to-grid signal was the breakthrough. Phase 1's trace (browser dev with snap-to-grid implicitly off in the dev-server iframe) showed integer `iw`/`vw` because browsers compute `window.innerWidth` from float layout and Power BI Service's web host doesn't have the same sub-pixel pass-through. The behaviour difference is genuinely Desktop-specific.

## Measurement evidence (2026-05-04, browser dev)

Captured against a real visual in browser dev mode. `t` is ms since trace start. `iw/ih` are `window.innerWidth/Height`. `vw/vh` are the host-reported viewport.

### Cold editor → viewer exit

```
t=12:    iw=1438, ih=1126, vw=286, vh=238    ← host has reported new (small) viewport;
                                               iframe still at editor-pane width
t=2001:  iw=286,  ih=243,  vw=286, vh=243    ← iframe has shrunk; both match
firstIwEqualsVwAtMs: 64                       ← iframe physically shrunk at t=64
```

Wrong-size window: ~52ms (t=12 → t=64).

### Warm editor → viewer exit

```
t=14:    iw=1438, ih=1126, vw=286, vh=243
t=2003:  iw=286,  ih=243,  vw=286, vh=243
firstIwEqualsVwAtMs: 129
```

Wrong-size window: ~117ms (t=14 → t=129).

### Cold + warm viewer → editor entry (control)

```
Cold entry: firstFrame iw=286, vw=286 at t=5;  lastFrame iw=1438, vw=1438 at t=2000
Warm entry: firstFrame iw=286, vw=286 at t=26; lastFrame iw=1438, vw=1438 at t=2004
```

Both directions converge to a matched state within the 2s window. Note all values are integers in browser dev — the Desktop sub-pixel divergence is invisible in this trace.

## Resolution

A viewer-side mount gate that mirrors `<RetainedDenebEditor>` on the opposite (shrinking) direction, plus precision normalization at storage and comparison.

1. **`<GatedDenebViewer>`** ([packages/app-core/src/app/gated-deneb-viewer.tsx](../../../packages/app-core/src/app/gated-deneb-viewer.tsx)) holds the viewer subtree unmounted on every editor → viewer transition until ALL of:
    - `Math.round(window.innerWidth) === Math.round(state.interface.embedViewport.width)` (iframe has caught up to the canvas size it is returning to)
    - `embedViewport.width` has changed since the gate engaged, OR `STALE_MATCH_BYPASS_MS` (150ms) has elapsed with the width matching
    - OR `VIEWPORT_SETTLE_TIMEOUT_MS` (3000ms) elapses (safety net)

2. **`embedViewport.width` as the comparison target.** The viewer-side gate compares against `state.interface.embedViewport.width` rather than the live `options.viewport.width`. `embedViewport` is the canvas size the visual reaches in viewer mode — captured during a prior viewer-mode `ResizeEnd` update and frozen during editor/transition modes by `doesModeAllowEmbedViewportSet`. It is the size the iframe is coming back **TO**. The editor-side gate keeps using the live `options.viewport.width` because it is expanding TO the live editor-pane size, not returning to a previously-known size.

3. **Integer rounding at storage and comparison.** `state.interface.embedViewport` always stores integer dimensions — `src/state/updates.ts` rounds `targetViewport.width/height` and the persisted-fallback values via `Math.round` before calling `setEmbedViewport`. The gate predicate (`computeGateMatch` in [packages/app-core/src/app/viewport-match-gate-state.ts](../../../packages/app-core/src/app/viewport-match-gate-state.ts)) defensively rounds `iframeInnerWidth`, `currentWidth`, and `startWidth` before strict-equality comparison so the editor-side gate (which still consumes the live float `options.viewport.width`) is also covered.

4. **`hasBeenInEditor` latch** — the gate only engages on viewer-mode entries that follow an editor session in the same visual instance. Cold viewer loads (no prior editor) take the fast path with no gate-pending delay; there is no host-paced shrink to wait for.

5. **Asymmetric-but-compatible** — the viewer is mounted fresh each editor → viewer transition (unlike the editor, which is retained). Symmetric retention (Option B from the brainstorm) is the right long-term shape but a much larger routing rewrite. The mount gate is surgical, removes both the visible bounce and the Desktop blank, and is compatible with later layering retention on top — at which point this gate becomes redundant and can be removed.

6. **Routing wiring** — `<GatedDenebViewer>` lives as a sibling of `<RetainedDenebEditor>` in [src/app/app.tsx](../../../src/app/app.tsx). The `viewer` case in `mainComponent` returns `null`; the wrapper owns the viewer rendering and gates mounting `<ReportViewRouter />` until the gate releases.

7. **`<ReportViewRouter>` simplified** — the inner mode-switch was unreachable for non-viewer modes once `app.tsx` only mounted it when `mode === 'viewer'`. Trimmed to just render `<DenebViewer />` directly.

### Cost of the gate

Up to ~150ms of gate-pending (nothing rendered) per editor → viewer transition that follows an editor session. Compared to a visible bounce or a 3-second blank, this is the right trade.

### Post-fix verification (2026-05-05)

- **Browser dev / Service**: no bounce on cold or warm round-trip.
- **Power BI Desktop, snap-to-grid OFF**: viewer appears immediately on Back-to-report, no 3-second blank, no resize required.
- **Power BI Desktop, snap-to-grid ON**: still works (no regression).

## Permanent diagnostic

The in-visual debug overlay ([src/features/viewport-gate-debug-overlay/](../../../src/features/viewport-gate-debug-overlay/)) is kept in the codebase as a permanent diagnostic, gated behind `PBIVIZ_VIEWPORT_GATE_OVERLAY=true` in `.env`. `bin/validate-config-for-commit.ts` rejects packaging with the flag enabled, so cert builds remain unaffected.

To enable for a future Desktop investigation:

1. Set `PBIVIZ_VIEWPORT_GATE_OVERLAY=true` and `LOG_LEVEL=DEBUG` in `.env`
2. `npm run package-standalone`
3. Side-load the resulting `.pbiviz` into Power BI Desktop
4. The HUD renders top-right showing live `iw / ih / ov.w / ov.h / ev.w / ev.h` plus the deltas the gate predicate cares about

Reset both env vars to `false` / `NONE` before packaging certified.

## Related

- Parent solution: [docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md](freeze-on-viewer-editor-transition-2026-05-01.md)
- Parent plan: [docs/plans/2026-05-01-001-perf-resolve-freeze-on-transition-plan.md](../../plans/2026-05-01-001-perf-resolve-freeze-on-transition-plan.md)
- Brainstorm seed: [docs/brainstorms/2026-05-01-viewer-bounce-on-editor-exit-followup.md](../../brainstorms/2026-05-01-viewer-bounce-on-editor-exit-followup.md)
- Active plan: [docs/plans/2026-05-04-001-fix-editor-viewer-transition-bounce-plan.md](../../plans/2026-05-04-001-fix-editor-viewer-transition-bounce-plan.md)
- Gate component: [packages/app-core/src/app/gated-deneb-viewer.tsx](../../../packages/app-core/src/app/gated-deneb-viewer.tsx)
- Gate primitive: [packages/app-core/src/app/viewport-match-gate-state.ts](../../../packages/app-core/src/app/viewport-match-gate-state.ts)
- Viewport storage rounding: [src/state/updates.ts](../../../src/state/updates.ts)
- Debug overlay: [src/features/viewport-gate-debug-overlay/](../../../src/features/viewport-gate-debug-overlay/)
- Pattern (call-site gate for build-time-flagged components): [docs/solutions/best-practices/gate-feature-flagged-react-components-at-call-site-2026-05-06.md](../best-practices/gate-feature-flagged-react-components-at-call-site-2026-05-06.md)
- Branch: `fix/editor-viewer-transition-bounce`
