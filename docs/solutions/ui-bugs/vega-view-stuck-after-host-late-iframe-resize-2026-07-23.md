---
title: Vega view stuck at stale size when the host resizes the iframe after reporting the viewport (OoF title restore)
date: 2026-07-23
category: ui-bugs
module: app-core/visual-viewer
problem_type: ui_bug
component: viewer
symptoms:
    - 'With on-object formatting enabled in Desktop, clicking the visual (title reserve shrinks viewport 710→682) then clicking off leaves the Vega view rendered at 682 inside a restored 710 container — a band of exposed background at the bottom (#480 follow-up)'
    - 'Resizing the visual or navigating away and back fixes it; the bad state otherwise persists indefinitely'
    - 'Dev-overlay instrumentation showed every upstream layer healthy in the failure state: host-reported viewport, committed embedViewport, last-compiled containerDimensions, and the physical container all read 710 — only the rendered canvas element read 682 (cv.h 682, Δ +28)'
root_cause: async_timing
resolution_type: code_fix
severity: medium
related_components:
    - app-core/visual-viewer/vega-embed
    - app-core/visual-viewer/container-size-observer
    - vega-runtime/signals
tags:
    - viewport
    - on-object-formatting
    - denebContainer
    - resize-observer
    - iframe
    - dev-overlay
---

# Vega view stuck at stale size when the host resizes the iframe after reporting the viewport (OoF title restore)

## Problem

After interacting with on-object formatting (OoF) in Power BI Desktop — clicking the visual so the title reserve shrinks the viewport, then clicking off so it restores — the Vega view stayed rendered at the shrunken height inside the restored container, leaving a visible gap until a manual resize or page re-entry ([#480](https://github.com/deneb-viz/deneb/issues/480) follow-up comments).

## Symptoms

- Vega content occupies the pre-restore height; exposed background band below it (Desktop's mis-placed OoF title chrome shows through).
- Persistent until a genuine ResizeEnd (manual resize) or fresh construction (page navigation).
- All store state ends CORRECT — this is invisible to state-level inspection.

## What Didn't Work

- **Hypothesis 1 — the embed-viewport ResizeEnd gate drops the restore.** Refuted by a full dev-overlay update trace: the restore arrives as type 36 (Resize+ResizeEnd) and a replay test (`src/state/__test__/updates-oof-viewport-replay.test.ts`) drives the exact captured 11-update sequence through the real updates slice, proving `embedViewport` commits 682 → 710 correctly.
- **Hypothesis 2 — the recompile never ran with the restored dimensions.** Refuted by overlay instrumentation showing the last-compiled `denebContainer` init at 710 (`cd.h`).
- **Reading the lifecycle tally as proof of "no render".** Misleading: renders triggered after a `skip`-path close aren't recorded against the already-closed lifecycle id, so `render-start` counts can't distinguish "no render" from "render after close".

## Solution

Root cause: **Desktop resizes the visual's iframe AFTER reporting the new viewport in `update()`.** The `denebContainer` signal effect in `vega-embed.tsx` sampled the DOM at React commit time — while the iframe was still physically at the old size — wrote the stale box, and never fired again. Nothing in the system observed the iframe's later physical growth, so the signal-bound `width`/`height` kept the view at the stale size.

Fix (PR branch `fix/480-oof-viewport-restore`), one authority per concern:

1. **`container-size-observer.ts`** — `observeContainerResize(container, onResize, debounceMs = 150)`: a ResizeObserver with a trailing debounce, so resize storms coalesce into one write at settle. The observer owns ongoing physical-size truth: whatever the host's update/resize ordering, a physical box change eventually fires it.
2. **Post-embed reconcile** — the old signal effect shrinks to deps `[viewReady]` only: a one-shot write after each embed covering the born-stale case the observer can't see (a view embedded from stale spec-init dims whose container never changes again).
3. **Shared guarded write** — both paths route through one `refreshContainerSignal`: skip when no signal exists yet, never write a 0×0 box (hidden/tearing-down container), suppress value-equal writes (Vega compares signal values by reference — an equal-but-new object still re-runs the dataflow), and only the active embed instance observes (the hidden editor twin must not write the shared `VegaViewServices` singleton).

## Why This Works

The patched spec binds top-level `width`/`height` to `denebContainer.width/height`, so the view follows the signal. The failure was never in the store/compile chain — it was that all signal writes were _point-in-time DOM reads triggered by update-shaped events_, while the physical resize is an _asynchronous host action with no event_. A ResizeObserver converts the physical change itself into the trigger, closing the class of "host reported X, applied X later" races rather than the single OoF instance.

## Prevention

- When a value is derived from the DOM, its refresh trigger must be the DOM changing (ResizeObserver/MutationObserver), not a store update that merely _predicts_ a DOM change. Host-reported state and physical state are separate clocks in Power BI visuals.
- Debounce observers with a trailing window (150ms here) and suppress value-equal signal writes — Vega re-runs dataflow on reference-new values.
- For Desktop diagnosis (no DevTools): the viewport-gate dev overlay (`PBIVIZ_VIEWPORT_GATE_OVERLAY=true`) now reports per-layer sizing truth — `ov` (host-reported), `ev` (committed), `cd` (last compiled), `ct` (container client/scroll box), `cv` (rendered canvas/svg element), `rid` (changes per embed), `vr` (viewReady) — and both overlays have a clipboard copy button (legacy `execCommand`; async Clipboard API is sandbox-blocked). Divergence between adjacent layers localises the broken link in one capture.
- The lifecycle tally cannot prove a render did not happen for `skip`-closed updates; use `rid`/`cv` from the overlay instead.

## Related Issues

- [#480](https://github.com/deneb-viz/deneb/issues/480) — original scrollbars/container-utilization issue; this was the OoF residual reported in follow-up comments.
- [viewer-bounce-on-editor-exit-2026-05-04.md](viewer-bounce-on-editor-exit-2026-05-04.md) — same underlying host behaviour (host-paced iframe resize decoupled from update reporting) on the editor→viewer path.
- [vega-canvas-renderer-vertical-overflow-2026-05-20.md](vega-canvas-renderer-vertical-overflow-2026-05-20.md) — earlier #480 family fix (line-box overflow).
- Follow-up (separate branch/PR): viewport-only changes still trigger a full recompile + re-embed; with the observer + signal binding they could resize the live view without teardown.
