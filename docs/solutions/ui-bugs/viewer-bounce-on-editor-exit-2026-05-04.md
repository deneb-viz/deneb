---
title: Viewer bounce on editor → viewer transition
date: 2026-05-04
category: ui-bugs
module: app-core
problem_type: ui_bug
component: viewer
symptoms:
    - Click "Back to report" from editor mode; the visual briefly renders at a larger-than-viewer intermediate size for a frame or two before snapping to the actual viewer-mode viewport
    - Smaller and faster than the original cold-open freeze (parent issue), but observable
    - Asymmetric retention — `<DenebEditor>` is retained across viewer↔editor toggles after PR #657, but `<DenebViewer>` is not, so every editor → viewer transition mounts a fresh `<VegaEmbed>`
root_cause: host_paced_iframe_shrink_pre_viewer_mount
resolution_type: code_fix
severity: low
tags:
    - viewer
    - viewport
    - retention
    - iframe
    - power-bi-host
    - shrink
status: resolved
---

# Viewer bounce on editor → viewer transition

## Problem

After PR #657 retained `<DenebEditor>` across viewer↔editor toggles, the user-visible freeze on the **entry** direction (viewer → editor) was resolved. The exit direction (editor → viewer) developed a smaller but observable bounce: the viewer's Vega view briefly renders at a larger-than-viewer intermediate size, then snaps to the actual viewer-mode viewport when the iframe finishes shrinking.

The bounce is a residual artefact of asymmetric retention — the editor has a match-based gate via `<RetainedDenebEditor>`, but the viewer does not, so on every editor → viewer transition `<DenebViewer>` mounts fresh and the new Vega view reads its container at whatever size the iframe currently is.

## Root cause

The Power BI host paces the iframe's CSS resize on the **shrinking** direction with the same shape it paces expansion: the host reports the new (smaller) `viewport.width` to the visual _before_ it physically shrinks the iframe. There is a window of tens to ~150ms during which `options.viewport.width` is the new viewer-mode width but `window.innerWidth` is still the editor-pane width. Anything that mounts and reads its DOM container during this window renders at the wrong size; when the iframe finishes shrinking, `ResizeObserver` fires and Vega re-lays-out — the visible bounce.

The reliable positive signal is the same as the entry direction: `window.innerWidth === options.viewport.width`.

## Diagnosis methodology

Diagnostic recovered from PR #657's pre-squash history (reconstructed in [src/lib/diagnostics/edit-transition-trace.ts](../../../src/lib/diagnostics/edit-transition-trace.ts)) and extended to fire on the editor → viewer direction. Per-animation-frame samples of `window.innerWidth/Height` and `options.viewport.width/Height`, plus host events recorded via `logHostEvent`, batched into a single `logDebug` call at the end of a 2-second trace window.

## Measurement evidence (2026-05-04)

Captured by user against a real visual, one take per scenario. `t` is ms since trace start. `iw/ih` are `window.innerWidth/Height`. `vw/vh` are the host-reported viewport.

### Cold editor → viewer exit

```
t=12:    iw=1438, ih=1126, vw=286, vh=238    ← host has reported new (small) viewport;
                                               iframe still at editor-pane width
t=2001:  iw=286,  ih=243,  vw=286, vh=243    ← iframe has shrunk; both match
firstIwEqualsVwAtMs: 64                       ← iframe physically shrunk at t=64
```

**Wrong-size window: ~52ms** (t=12 → t=64). During this window any newly-mounted DOM container reads `iw=1438` while the host reports `vw=286`.

### Warm editor → viewer exit

```
t=14:    iw=1438, ih=1126, vw=286, vh=243
t=2003:  iw=286,  ih=243,  vw=286, vh=243
firstIwEqualsVwAtMs: 129
```

**Wrong-size window: ~117ms** (t=14 → t=129).

### Cold + warm viewer → editor entry (control)

```
Cold entry: firstFrame iw=286, vw=286 at t=5;  lastFrame iw=1438, vw=1438 at t=2000
Warm entry: firstFrame iw=286, vw=286 at t=26; lastFrame iw=1438, vw=1438 at t=2004
```

Both directions converge to a matched state within the 2s window. The entry direction's wrong-size window during cold open can stretch to >1500ms (per parent investigation), but on this take the iframe expansion completed within the trace window in both cold and warm cases.

## Conclusion

**Hypothesis from `docs/brainstorms/2026-05-01-viewer-bounce-on-editor-exit-followup.md` is confirmed at the iw/vw level:** the iframe is physically larger than the host-reported viewport for a measurable window after every editor → viewer transition. Cold = ~52ms, warm = ~117ms, both well within the gate-engagement → first-frame-paint window where `<DenebViewer>` mounts fresh.

The fix proceeds with **Option C** from the brainstorm: a viewer-side mount gate that mirrors `<RetainedDenebEditor>`'s match-based gate. The existing pure predicate `computeGateMatch` from [packages/app-core/src/app/retained-deneb-editor-state.ts](../../../packages/app-core/src/app/retained-deneb-editor-state.ts) is reusable unchanged — its `STALE_MATCH_BYPASS_MS = 150` fallback covers the exit-direction edge case where `startWidth === currentWidth` because the host had already reported the new viewport before the gate engaged.

Cost of the gate: up to ~150ms of gate-pending (nothing rendered) per editor → viewer transition. Compared to a visible bounce, this is the right trade.

## Resolution

A viewer-side mount gate that mirrors `<RetainedDenebEditor>` on the opposite (shrinking) direction:

1. **`<RetainedDenebViewer>`** ([packages/app-core/src/app/retained-deneb-viewer.tsx](../../../packages/app-core/src/app/retained-deneb-viewer.tsx)) holds the viewer subtree unmounted on every editor → viewer transition until ALL of:
    - `window.innerWidth === options.viewport.width` (iframe has caught up to the viewer-mode width)
    - `options.viewport.width` has changed since the gate engaged, OR `STALE_MATCH_BYPASS_MS` (150ms) has elapsed with the width matching (covers the common exit case where the host had already reported the new viewport before the gate engaged)
    - OR `VIEWPORT_SETTLE_TIMEOUT_MS` (3000ms) elapses (safety net)

2. **`hasBeenInEditor` latch** — the gate only engages on viewer-mode entries that follow an editor session in the same visual instance. Cold viewer loads (no prior editor) take the fast path with no gate-pending delay; there is no host-paced shrink to wait for.

3. **Asymmetric-but-compatible** — the viewer is mounted fresh each editor → viewer transition (unlike the editor, which is retained). Symmetric retention (Option B from the brainstorm) is the right long-term shape but a much larger routing rewrite. The mount gate is surgical, removes the visible bounce, and is compatible with later layering retention on top — at which point this gate becomes redundant and can be removed.

4. **Reused predicate** — `computeGateMatch` from [packages/app-core/src/app/retained-deneb-editor-state.ts](../../../packages/app-core/src/app/retained-deneb-editor-state.ts) is shared with the editor entry gate. The constants `VIEWPORT_SETTLE_TIMEOUT_MS` and `STALE_MATCH_BYPASS_MS` live alongside the predicate and are imported by both gate components.

5. **Routing wiring** — `<RetainedDenebViewer>` lives as a sibling of `<RetainedDenebEditor>` in [src/app/app.tsx](../../../src/app/app.tsx). The `viewer` case in `mainComponent` returns `null`; the wrapper owns the viewer rendering and gates mounting `<ReportViewRouter />` until the gate releases.

### Cost of the gate

Up to ~150ms of gate-pending (nothing rendered) per editor → viewer transition that follows an editor session. Compared to a visible bounce, this is the right trade. Post-fix manual verification on cold and warm round trips showed the bounce is gone; the gate-pending window is barely perceptible.

### Post-fix verification (2026-05-04)

Manual round-trip testing across cold open and warm re-entries confirmed: no visible bounce on editor → viewer exit. Diagnostic traces still show the same iw/vw shape (host reports new viewport before iframe shrinks; iframe catches up at ~105–115ms post-mode-change), but the viewer's first paint now lands at the correct viewer-mode size because the mount gate held it back until `iw === vw`.

## Limitations of this measurement

- One take per scenario (cold/warm × entry/exit), not three. Qualitative finding (iframe shrinks AFTER host reports new viewport) is robust across both exit takes; quantitative timing variance has not been bounded.
- Full `samples` and `events` arrays were not re-captured for this writeup — only the summary frames. The intermediate samples between firstFrame and lastFrame would tell us whether the iframe shrinks in a single jump or step-wise; both are compatible with the gate-based fix, so this distinction does not block U3.
- The exact moment `mode === 'viewer'` (and therefore `<DenebViewer>` mount) within the wrong-size window was not directly traced. The visible bounce confirms it falls within the window. The gate's design holds Vega rendering until `iw === vw` regardless of when the mount happens, so the precise mount-relative timing does not change the fix.

## Related

- Parent solution: [docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md](freeze-on-viewer-editor-transition-2026-05-01.md)
- Parent plan: [docs/plans/2026-05-01-001-perf-resolve-freeze-on-transition-plan.md](../../plans/2026-05-01-001-perf-resolve-freeze-on-transition-plan.md)
- Brainstorm seed: [docs/brainstorms/2026-05-01-viewer-bounce-on-editor-exit-followup.md](../../brainstorms/2026-05-01-viewer-bounce-on-editor-exit-followup.md)
- Active plan: [docs/plans/2026-05-04-001-fix-editor-viewer-transition-bounce-plan.md](../../plans/2026-05-04-001-fix-editor-viewer-transition-bounce-plan.md)
- Diagnostic: [src/lib/diagnostics/edit-transition-trace.ts](../../../src/lib/diagnostics/edit-transition-trace.ts) (removed in U6 before merge)
- Branch: `fix/editor-viewer-transition-bounce`
