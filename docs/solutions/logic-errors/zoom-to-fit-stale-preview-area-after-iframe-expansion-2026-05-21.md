---
title: Zoom-to-Fit reads stale preview area when hydration captures mid-iframe-expansion size
date: 2026-05-21
category: logic-errors
module: app-core/app/editor/hooks
problem_type: logic_error
component: tooling
symptoms:
  - "Editor `Fit` zoom returns a result in the 40-50% range against a preview area that visibly has room for ~120%+"
  - "Debug-logging confirms `previewAreaViewport` in the store is roughly half of the live `useResizeObserver` measurement at Fit time"
  - "Reproduces consistently on first editor open; clears if the user manually drags either pane after the iframe finishes expanding"
  - "Math in `computeZoomToFitScale` is correct against the supplied inputs; the inputs themselves are wrong"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - app-core/app/editor/hooks/use-editor-pane-layout
  - app-core/lib/interface
  - app-core/state/editor
  - app-core/app/editor/components/editor-pane-layout
tags:
  - zoom
  - fit
  - viewport
  - editor
  - hydration
  - iframe-expansion
  - allotment
  - one-shot-effect
  - stale-store
---

# Zoom-to-Fit reads stale preview area when hydration captures mid-iframe-expansion size

## Problem

In Deneb's advanced editor, invoking "Fit" zoom (popover Fit radio or `ctrl+alt+*` hotkey) consistently returned a value in the 40-50% range when the user perceived the preview area as having ample room for 120%+. Unlike the sibling failure mode covered in [`zoom-to-fit-negative-scale-on-unhydrated-viewport-2026-05-20.md`](zoom-to-fit-negative-scale-on-unhydrated-viewport-2026-05-20.md) — which produced negative scale factors from `{0, 0}` viewports — this case produced a mathematically valid, in-range scale factor. The inputs were non-zero, the math was correct, but the inputs were stale.

## Symptoms

- Open the advanced editor with a typical spec; click Fit: result lands on ~44% rather than the ~120% the math should produce against the visible preview area.
- Add a `logDebug` inside `computeZoomToFitScale` and click Fit. The log shows `previewAreaViewport = {width: 415, height: 179}` even though the rendered preview area is visibly ~881×674.
- Drag either pane after the iframe settles; click Fit again. Result now lands on the expected ~120% — the drag committed the live sizes to the store.
- Both the popover Fit radio and the hotkey path exhibit the same number — the bug is in the input to the math, not in either entry path.

## What Didn't Work

The input guard and symmetric clamp added in [`zoom-to-fit-negative-scale-on-unhydrated-viewport-2026-05-20.md`](zoom-to-fit-negative-scale-on-unhydrated-viewport-2026-05-20.md) protect against `<= 0` dimensions. They are necessary but not sufficient: `{415, 179}` is non-zero and produces a valid (if perceptually wrong) result. The guard is at the read-time pure-math layer; this failure mode lives one stage earlier, in the *write* path that feeds the store.

Speculating that `embedViewport` was stale was also a dead end. Logging confirmed `embedViewport` matched the live Power BI host viewport. The wrong-input was specifically `previewAreaViewport` — the editor's own internal pane size.

## Solution

A new post-hydration synchronisation effect in [`packages/app-core/src/app/editor/hooks/use-editor-pane-layout.ts`](../../../packages/app-core/src/app/editor/hooks/use-editor-pane-layout.ts):

1. **Track container size at last sync.** A `prevContainerSizeRef` ref captures the container width/height every time the store is touched (initial hydration and subsequent rescales).
2. **Detect post-hydration container changes.** A second `useLayoutEffect` runs after hydration whenever `containerWidth` / `containerHeight` change. When the live size diverges from the ref, it computes new pane sizes proportionally and dispatches a single `setViewports` update.
3. **Pure-helper extraction.** The scaling math is exported as `scalePaneSizesForContainerResize` so it can be unit-tested without React or Zustand. The hook stays the integration seam.
4. **Respect Allotment's minSize.** The right pane width is clamped to `DEBUG_PANE_CONFIGURATION.minWidth` so the store agrees with what Allotment renders. Without this clamp, a narrow container reintroduces the same store-vs-render desync at a smaller scale.
5. **Route latch through existing semantics.** The debug-pane latch is computed via `getDebugPaneLatchHeight` so its "freeze while minimized" and "areaMinSize fallback" behaviours apply uniformly across hydrate, drag, and rescale paths.

13 unit tests in [`packages/app-core/src/app/editor/hooks/__tests__/use-editor-pane-layout-scaling.test.ts`](../../../packages/app-core/src/app/editor/hooks/__tests__/use-editor-pane-layout-scaling.test.ts) pin the math: sum-conservation on each axis, ratio preservation across resize, asymmetric width-only / height-only changes, rounding-error absorption by the right and bottom panes, the user's reproduced repro values (`{692, 300}` hydration → `{1480, 1124}` settled), the `minWidth` clamp, and both latch semantics (minimized preservation; areaMinSize fallback).

## Why This Works

**The bug was a category error about effect lifecycle.** The hook's hydration effect was gated by `!hasHydratedViewports` to run exactly once. But Power BI's iframe expands the editor's container in stages after open (the same host-paced sequence documented in [`freeze-on-viewer-editor-transition-2026-05-01.md`](../ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md)). `useResizeObserver` fires for every stage; the one-shot gate captures only the *first* non-zero stage, which is typically a partial-expansion size. Subsequent stages update `containerWidth`/`containerHeight` but the hook ignores them. Drag handlers (`commitVerticalSizes`, `commitHorizontalSizes`) only fire on user input. Without user drag, the store stays stuck at the first stage's measurement for the rest of the session.

**Allotment hides the symptom from the user but not from the store.** Allotment internally rescales its rendered children when its container resizes, so the on-screen preview area *does* track the live container size. But Allotment doesn't fire `onChange` / `onDragEnd` for container resizes, only for user-driven changes. The store has no other writer that would notice the divergence. The visible UI and the store drift apart, silently, until a consumer (Fit) reads the store and produces a result that doesn't match what the user sees.

**Proportional rescale is the right shape because pane sizes are derivable from container ratios.** The hydration effect already computed initial sizes as percentages of the container (`SPLIT_PANE_CONFIGURATION.defaultSizePercent` for editor width; `DEBUG_PANE_CONFIGURATION.preferredHeightPercentage` for debug height). The rescale extends the same logic: when the container changes, preserve current ratios. User-dragged ratios survive resize automatically — there's no special case for "did the user drag," because dragging just changes which ratio gets preserved.

## Prevention

- **The 13-test unit suite** locks every shape of the rescale math, plus the `minWidth` clamp and both latch semantics, plus the user's actual repro values as a regression guard.
- **Rule:** treat any one-shot `useLayoutEffect` that captures measurement-driven dimensions as a smell. If the measured thing can change after the first commit (host resize, iframe expansion, theme-driven layout shifts), the one-shot capture will go stale. Either re-run the effect on every change, or pair the hydration with a continuous sync that observes the same source.
- **Rule:** when integrating with a layout library that auto-handles container resize (Allotment, react-resizable-panels, react-split, similar), audit which events propagate back to the store. Container-resize-driven changes are typically silent at the library API level; the store needs an independent observer if downstream consumers read pane sizes from it.
- **Rule:** when scaling stored layout values, route them through the same helpers that the drag / commit paths use (in this case `getDebugPaneLatchHeight`). Bypassing the helpers creates two divergent expressions of the same invariant, which inevitably drift.

## Related Issues

- [`docs/solutions/logic-errors/zoom-to-fit-negative-scale-on-unhydrated-viewport-2026-05-20.md`](zoom-to-fit-negative-scale-on-unhydrated-viewport-2026-05-20.md) — sibling failure mode. That doc covers the `{0, 0}` / negative-scale path closed by the input guard in `computeZoomToFitScale`. This doc covers the partial-hydration path that produces non-zero-but-stale inputs slipping past that guard. The umbrella user-visible symptom ("Fit shrinks the visual") has two root causes; both fixes are needed for full coverage.
- [`docs/solutions/logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md`](focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md) — established the `> 0` viewport-guard pattern for write-time paths. This fix is the read-time complement at the *next* layer up: not just guarding against zero, but actively resyncing when the upstream measurement changes.
- [`docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md`](../ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md) — documents the host-paced iframe expansion sequence that creates the partial-hydration window. Upstream cause.
