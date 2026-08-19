---
title: 'denebContainer scrollWidth/scrollHeight stayed 0 until the first scroll: post-embed reconcile fed only the geometry channel'
date: 2026-08-19
category: logic-errors
module: app-core/visual-viewer
problem_type: logic_error
component: viewer
severity: high
symptoms:
    - 'Signals tab shows `denebContainer` as `{ height: 440, width: 440, scrollHeight: 0, scrollWidth: 0, ... }` on load'
    - 'Specs referencing `denebContainer.scrollHeight`/`scrollWidth` compute against 0 until the user scrolls once'
    - 'Values snap to correct on the first scroll event and stay correct afterwards'
root_cause: logic_error
resolution_type: code_fix
related_components:
    - vega-runtime/signals
    - compilation-slice
tags:
    - deneb-container
    - container-signal
    - scroll-extent
    - post-embed-reconcile
    - use-container-signal-owner
    - viewready
    - regression-1x-parity
---

# denebContainer scrollWidth/scrollHeight stayed 0 until the first scroll

## Problem

On visual load the `denebContainer` Vega signal carried the correct box (`width`/`height`) but
`scrollWidth`/`scrollHeight` were `0` — and stayed `0` until the user scrolled once. Any spec
sizing or positioning against the content extent was wrong on first paint. This was a 2.0
regression against 1.x, which populated all six fields at view creation.

## Symptoms

- Signals tab: `{ "height": 440, "width": 440, "scrollHeight": 0, "scrollWidth": 0, "scrollTop": 0, "scrollLeft": 0 }`
- One scroll event later the same signal reads `scrollHeight: 440, scrollWidth: 440` (or the
  real content extent) and behaves normally from then on.

## What Didn't Work

- **"Zeros are by design — content extent isn't known at compile time."** Half true: the compile
  seed (`getDenebContainerSignalFromDimensions` in
  `packages/vega-runtime/src/lib/signals/deneb-container.ts`) legitimately only carries
  width/height. But 1.x's `bindContainerSignals` (tag `1.9.1.0`,
  `packages/vega-runtime/src/lib/view/service.ts`) wrote all six fields from `view.container()`
  the moment the view existed, so "0 until scroll" was never the shipped contract.
- **"The ResizeObserver trigger will catch it."** It only fires on physical box changes. A
  container that is the right size at embed and never resizes gets no observer callback, so a
  static visual with scrollable content never received a corrective write.

## Solution

`packages/app-core/src/features/visual-viewer/use-container-signal-owner.ts` has two write
channels — geometry (`refreshGeometry` → `compilation.refreshContainerDimensions`, a cheap
re-embed of the init dims) and scroll (`refreshScrollSignal`, a guarded six-field
`setSignalByName`). Trigger 2 (post-embed reconcile on `viewReady`) only fed geometry. It now
feeds both:

```ts
// Before
useEffect(() => {
    if (!isActive || !viewReady) return;
    refreshGeometry();
}, [isActive, viewReady, refreshGeometry]);

// After
useEffect(() => {
    if (!isActive || !viewReady) return;
    refreshGeometry();
    refreshScrollSignal();
}, [isActive, viewReady, refreshGeometry, refreshScrollSignal]);
```

Shipped in PR #746 (`0f0ab656`) — **incomplete on its own**. Zeros still appeared after some
compiles and on first editor open, because `useVegaEmbed` re-embeds on deep change of
`[spec, options]` while the `viewReady` window (`shouldOpenEmbedWindow`) only opens on a spec
change. An options-only re-embed (zoom/`embedScaleFactor`, `logLevel`, `renderMode`) births a
fresh view with the 0-seed and never toggles `viewReady`, so Trigger 2 never re-fired. Second
part of the fix (PR #747): key the reconcile on `state.interface.renderId` as well — the token
`handleEmbed` bumps for **every** fresh view:

```ts
const renderId = useDenebState((state) => state.interface.renderId);
useEffect(() => {
    if (!isActive || !viewReady) return;
    refreshGeometry();
    refreshScrollSignal();
}, [isActive, viewReady, renderId, refreshGeometry, refreshScrollSignal]);
```

## Why This Works

`viewReady` flips true after `vegaEmbed` resolves, so the canvas is laid out and the measured
scroll container's `scrollWidth/Height` are real. `refreshScrollSignal` reads all six fields
from that one element via `getMeasuredContainerRefresh`, which is guarded by value-equality
(Vega compares signal values by reference, so equal-but-new objects would re-run the dataflow),
making the extra call a no-op whenever nothing changed. If `refreshGeometry` also triggers a
re-embed, `viewReady` cycles again and both refreshes re-run against the new view — the
reconcile still terminates because the second pass is value-equal.

How the regression crept in: the design doc
(`docs/plans/2026-07-23-001-container-signal-consolidation-design.md`) originally listed the
post-embed reconcile as a "Full refresh". Revision 2 split the triggers into geometry vs.
scroll channels and reasoned "the box matches the init by construction, so only offsets change"
— which quietly assumed the scroll _extents_ were already seeded. They never were.

## Prevention

- Canary in `packages/app-core/src/features/visual-viewer/__tests__/container-signal-owner-wiring.test.ts`
  asserts Trigger 2's effect body calls `refreshGeometry()` **and** `refreshScrollSignal()`
  back-to-back. The workspace has no `@testing-library/react`, so hook wiring is locked by
  source-regex canaries plus behaviour tests on the pure helpers.
- Diagnostic shortcut: a _measured_ write can never yield `scrollHeight: 0` alongside a non-zero
  `height` (an element with a box has `scrollHeight >= clientHeight`). Seeing that shape means the
  write was **skipped**, not miscomputed — go hunt the guard/trigger, not the measurement.
- `viewReady` is the embed-window flag, not a per-view token; `renderId` is. Anything that must
  run "once per fresh view" keys on `renderId`.
- Rule for this hook: **a lifecycle trigger that establishes a new view must exercise every
  write channel**, not just the one whose field it "obviously" changes. Splitting channels for
  cost reasons must be paired with an explicit "who seeds the other channel's fields on view
  birth?" answer.
- When a signal is compile-seeded with partial fields, treat the seed as a placeholder and
  verify in the Signals tab that a fresh load (no interaction) shows fully-populated values.
- **Known remaining gap (flagged, not fixed):** 1.x also had `view.addResizeListener` refreshing
  the signal when the _view_ resized without the container changing (e.g. an autosize spec
  growing after an incremental data update). 2.0 has no equivalent, so `scrollHeight` could go
  stale in that narrow case until a scroll/resize/re-embed. Wire it via the owner hook if
  reported — never via `VegaEmbed` (single-owner contract).

## Related Issues

- `docs/solutions/architecture-patterns/single-owner-container-signal-element-measured-truth-2026-07-23.md`
  — the single-owner / two-channel architecture this bug lives inside.
- `docs/solutions/ui-bugs/vega-view-stuck-after-host-late-iframe-resize-2026-07-23.md` —
  the #480 residual fix that introduced the post-embed reconcile trigger.
- `docs/plans/2026-07-23-001-container-signal-consolidation-design.md` — Revision 2 channel
  split (the origin of the gap); its later trigger note now matches the code.
- Historical precursors: #431 (add scrollTop/scrollLeft signals), #475 (pbiContainer
  height/width wrong on scroll).
