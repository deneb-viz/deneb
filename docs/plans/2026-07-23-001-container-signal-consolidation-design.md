# Container Signal Consolidation — Design

- **Date:** 2026-07-23
- **Status:** Approved (brainstormed with maintainer; see decisions below)
- **Branch:** `refactor/container-signal-owner` → PR to `next`
- **Follows:** deneb-viz/deneb#729 (OoF viewport-restore fix), issue deneb-viz/deneb#480 residual investigation

## Problem

Two related defects in how the visual sizes its Vega view:

1. **The compiler is hammered on resizes.** `VisualViewer`'s compile effect depends on
   `embedViewport` dimensions, so every committed resize runs the full pipeline —
   JSON parse, spec patching, schema validation, Vega parse / Vega-Lite compile —
   and then tears down and rebuilds the Vega view. Container dimensions influence
   only the `denebContainer` signal init in the compiled output, so almost all of
   that work is wasted, and the teardown discards any runtime view state
   (accumulated signals, selections).
2. **`denebContainer` has fragmented ownership.** After #729 there are three write
   paths across two files with two different measurement sources: the
   ResizeObserver and post-embed reconcile (in `VegaEmbed`, measuring the embed
   wrapper) and the scroll effect (in `VisualViewer`, measuring the
   OverlayScrollbars viewport). Split ownership already produced one shipped bug
   (size refreshes clobbering scroll offsets, caught in #729 review).

## Purpose statement

`denebContainer` is a **spec-author API describing the container the view runs
in**: visible box, content extent, and scroll offsets. It must always be
**element-measured, never window-measured** — the window lies whenever anything
inside the visual consumes space around the drawable area (e.g. a future
parameter-binding form element).

## Decisions (from brainstorm)

| Question                                                                | Decision                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| View survives resizes (runtime state preserved) — 1.x behaviour change? | Accepted as strictly better; 2.0 (unshipped) is the right time. No escape hatch.                                                                                                                                                                                               |
| Normalize Vega-Lite onto `denebContainer` sizing?                       | No — triggers only. VL keeps native `width/height: 'container'` element-driven sizing; only the recompile-on-resize stops. The owner still maintains `denebContainer` for VL specs that read it.                                                                               |
| Rollout                                                                 | Straight change, no feature flag. Own branch, PR to `next` for review. Alpha/beta channel + dev-overlay diagnostics are the safety net.                                                                                                                                        |
| Owner placement                                                         | Must work in every embed context. `VisualViewer` is instantiated in both contexts (standalone viewer; editor preview) and owns the measured container in each, so the owner hook lives there; the existing `isActive` gate guarantees exactly one writer to the shared signal. |

## Architecture

### The single owner

`container-size-observer.ts` (visual-viewer feature) grows into the single write
authority for `denebContainer` — working name `useContainerSignalOwner`, a hook
wired from `VisualViewer`. No other code writes the signal.

**Measured element:** the scroll container itself — the OverlayScrollbars
viewport (`#deneb-vega-container`) or the plain fallback div when scrollbars are
disabled. One element supplies all six fields coherently:

| Field                         | Source on the measured element               |
| ----------------------------- | -------------------------------------------- |
| `width`, `height`             | `clientWidth` / `clientHeight` (visible box) |
| `scrollWidth`, `scrollHeight` | content extent                               |
| `scrollTop`, `scrollLeft`     | offsets                                      |

This retires the wrapper-vs-viewport measurement split that caused the #729
scroll-clobber finding.

**1.x parity (verified against tag `1.9.1.0`):** these are the same per-field
semantics 1.x exposed. 1.x measured `view.container()` — an element explicitly
sized to the viewport dims — for the box, its `scrollWidth/Height` for content
extent, and the scroll wrapper's frame for offsets; the scroll wrapper enclosed
the entire embed output. Measuring the OS viewport reproduces all of that from
one element. (1.x also subtracted a `VEGA_VIEWPORT_ADJUST` fudge from the box —
deliberately removed by the #480/#611 container-utilization work; not
reintroduced.)

**Triggers, merged into one guarded write path:**

| Trigger                                                   | Cadence                                 | Refreshes                                                                                                           |
| --------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| ResizeObserver on the measured element                    | 150ms trailing debounce                 | Size fields; scroll fields preserved from current value                                                             |
| Scroll events (existing OverlayScrollbars `scroll` event) | existing `scrollEventThrottle` throttle | Scroll fields; size fields preserved                                                                                |
| Post-embed reconcile on `viewReady`                       | one-shot per embed                      | Full refresh (covers the born-stale case: a view embedded from stale init dims whose container never changes again) |

**Guards (single site, unchanged semantics):** active instance only; no write
before a signal exists; never write a 0×0 box; suppress value-equal writes
(Vega compares signal values by reference).

**Consumers:** `VegaEmbed` becomes embed-lifecycle only (no signal writes).
`VisualViewer`'s scroll effect reduces to feeding events into the owner.
Identical behaviour in viewer and editor-preview instances; sizing always
reflects the instance's own measured container.

### Compile path

`VisualViewer`'s compile effect **drops `viewportHeight` / `viewportWidth` from
its dependency array**. Remaining recompile triggers: spec, config, provider,
`logLevel`, `renderMode`, `embedScaleFactor` (zoom changes embed options),
`isActive` flips, and the data-threshold / incremental-update-failure paths.

Every compile reads dimensions **as a snapshot at call time**: the measured
container element when mounted and non-zero, else `embedViewport` (initial
mount, before layout). The snapshot only seeds the `denebContainer` init; the
post-embed reconcile (shipped and tested in #729) corrects any born-stale delta.

Net effect: a resize costs one debounced signal write instead of
parse + validate + view teardown, and the view keeps its runtime state.

## Edge cases and non-goals

- **Vega-Lite:** native `'container'` sizing untouched (decision above).
- **Stale compiled init:** the stored compilation result's `denebContainer` init
  no longer tracks resizes. Cosmetic; the dev overlay's `cd.*` lines are
  relabeled as "compile-time init" so they cannot mislead a future
  investigation.
- **Parameter bindings (future):** bindings render inside the embed root,
  inside the scroll container — they are scrollable content, exactly as in
  1.x. They count toward `scrollWidth/Height` and scroll with the view; the
  measured element stays the scroll container, with no drawable-area
  subtraction. Keeping this consistent with 1.x is deliberate.
- **Out of scope:** `GatedDenebViewer` / `embedViewport` commit gates,
  `stateManagement` viewport persistence (separate hardening follow-up), and the
  transient-OoF persist suppression.

## Testing

- **Unit (owner module):** field merging per trigger type; debounce vs throttle
  interplay; guard behaviour; coherence when resize and scroll interleave
  (last-writer must not drop the other's fields).
- **Wiring canaries (static-source, per repo precedent):** compile effect must
  NOT depend on viewport dims; `VegaEmbed` must NOT write the signal; the owner
  hook is wired in `VisualViewer`.
- **Existing:** OoF replay test (`updates-oof-viewport-replay.test.ts`) stays
  as-is; #729's observer/guard tests migrate with the module.
- **Desktop manual matrix:** resize storm; OoF click-on/off; scroll-then-resize;
  editor preview resize; zoom change; a VL spec; scrollbars on and off.
