---
title: 'Single-owner container signal — element-measured truth and signal-only resizes for embedded Vega views'
date: 2026-07-23
category: architecture-patterns
module: app-core/visual-viewer
problem_type: architecture_pattern
component: viewer
severity: high
applies_when:
    - 'A shared runtime value (Vega signal, singleton service state) can be written from more than one code path or component'
    - 'A host (Power BI, any iframe embedder) reports geometry in update events that can lag or lead the physical DOM change'
    - 'A resize currently triggers expensive recomputation (spec recompile, view teardown) whose output barely depends on the changed value'
    - 'Migrating write responsibility for live shared state between components without a behavior gap in intermediate commits'
tags:
    - single-owner
    - single-writer
    - deneb-container
    - resize-observer
    - vega-signals
    - element-measured
    - strangler-migration
    - recompile-avoidance
---

# Single-owner container signal — element-measured truth and signal-only resizes

## Context

After the #480/#729 on-object-formatting fix, the `denebContainer` Vega signal
had three write paths across two components (`VegaEmbed`'s ResizeObserver and
post-embed reconcile measuring the embed wrapper; `VisualViewer`'s scroll
effect measuring the OverlayScrollbars viewport). Split ownership with split
measurement sources had already shipped one bug (size refreshes clobbering
scroll offsets, caught in #729 review). Separately, `VisualViewer`'s compile
effect depended on the store's viewport dims, so every committed resize reran
parse → patch → validate → compile and tore down the live Vega view — even
though container dimensions only seed the compiled spec's signal init.

## Guidance

**One write authority per shared runtime value.** All writes to the signal go
through a single hook (`useContainerSignalOwner`) that merges every trigger —
debounced ResizeObserver, throttled scroll, post-embed reconcile — into one
guarded refresh path. No other code may call
`setSignalByName(SIGNAL_DENEB_CONTAINER, …)`; a static-source canary test
locks the contract (`container-signal-owner-wiring.test.ts`).

**Element-measured truth, never update-predicted truth.** The host can resize
the iframe after (or before) reporting the viewport in `update()`, so any
value derived from update payloads can be stale. Measure the one element that
IS the scroll container and read all six fields (`clientWidth/Height`,
`scrollWidth/Height`, `scrollTop/Left`) from it in a single coherent snapshot.
When one element owns both box and offsets, "preserving" fields across
triggers is not just unnecessary — it is a bug (a legitimate scroll back to 0
would be masked by a preserved stale offset).

**Expensive recomputation only for inputs that need it.** The compile effect
drops the viewport dims from its dependency array and reads dimensions as a
call-time snapshot (identity-stable `useCallback` over a ref, falling back to
the committed viewport pre-layout). The snapshot only seeds the signal init;
the owner's post-embed reconcile corrects any born-stale delta. A resize now
costs one debounced signal write instead of a recompile + view teardown, and
the view keeps its runtime state (signals, selections).

**Strangler ordering for live-state migrations.** The migration is safe at
every intermediate commit: (1) land the new pure builder under a distinct name
(`getMeasuredContainerRefresh`, not an in-place rewrite of the legacy
builder's semantics); (2) land the owner hook unwired; (3) wire the owner —
one commit of harmless double-writing overlap; (4) only then strip the old
writers and delete the legacy builder. Removing writers first would leave a
gap; changing semantics in place would regress the shipped scroll fix
mid-branch.

**Verify parity against the release tag, not memory.** The measurement
semantics were confirmed against tag `1.9.1.0` before design sign-off: 1.x
scrolled the entire embed output (parameter bindings are scrollable content)
and measured a viewport-sized container — measuring the OS viewport reproduces
that from one element. Claims about "how v1 behaved" go stale; the tag does
not.

## Why This Matters

- Split ownership of shared runtime state produces last-writer-wins bugs that
  are invisible in review because each writer looks locally correct.
- Update-driven effects sample the DOM at update time; anything the host does
  to the iframe afterwards is unobserved. Only an observer on the element
  itself closes that class of bug (#480 residual).
- Recompiling on resize is quadratic pain at interaction speed: OoF
  click-on/click-off produced two full compiles and view teardowns for a
  28-pixel title reserve.

## When to Apply

- Any new value bridged from DOM/host state into the Vega view: give it one
  owner, one measurement source, and guards (active instance only, no write
  before the signal exists, never write 0×0, suppress value-equal writes).
- Any effect whose dependency array includes geometry: ask whether the work
  actually depends on geometry or merely seeds it — if it seeds, snapshot at
  call time instead of subscribing.
- Any migration of write responsibility for live state: strangler-order it
  (new owner live before old writers removed) and keep the new code path under
  a distinct name until the old one is deleted.

## Examples

The guarded refresh core (all triggers funnel here):

```ts
const refresh = useCallback(() => {
    if (container === null) return;
    const result = getMeasuredContainerRefresh(
        container,
        VegaViewServices.getSignalByName(SIGNAL_DENEB_CONTAINER) as
            | DenebContainerSignal
            | undefined
    );
    if (result === null) return;
    VegaViewServices.setSignalByName(result.name, result.value);
}, [container]);
```

Call-time dimensions snapshot (compile no longer subscribes to geometry):

```ts
const getCompileDimensionsSnapshot = useCallback(() => {
    const container = measuredContainerRef.current;
    if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        return { width: container.clientWidth, height: container.clientHeight };
    }
    const embedViewport = getDenebState().interface.embedViewport;
    return {
        width: embedViewport?.width ?? 0,
        height: embedViewport?.height ?? 0
    };
}, []);
```

## Related

- [rendering-lifecycle-coordinator-single-owner-2026-07-03.md](rendering-lifecycle-coordinator-single-owner-2026-07-03.md)
  — the same single-owner principle applied to host lifecycle events
- [../ui-bugs/vega-view-stuck-after-host-late-iframe-resize-2026-07-23.md](../ui-bugs/vega-view-stuck-after-host-late-iframe-resize-2026-07-23.md)
  — the #480 residual diagnosis that motivated this consolidation
- Design spec: `docs/plans/2026-07-23-001-container-signal-consolidation-design.md`;
  plan: `docs/plans/2026-07-23-002-container-signal-consolidation-plan.md`
- deneb-viz/deneb#480, deneb-viz/deneb#729
