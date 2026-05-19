---
title: Signal Viewer shows stale signal values after spec re-run due to incomplete useMemo deps
date: 2026-05-20
category: logic-errors
module: app-core/features/debug-area/signal-viewer
problem_type: logic_error
component: tooling
symptoms:
  - Signal Viewer table displays the previous spec's signal value after re-running a spec with a changed `params[].value`
  - "Switching to the Data tab and back forces the cell to refresh (component unmount/remount makes `useState`'s lazy initializer re-read from the new view)"
  - "No listener event fires for signals whose new value was baked in at View construction, so the cell stays at the prior view's value indefinitely"
  - "No console errors, no listener exceptions, no missing renders — the cell silently caches a stale display string"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - vega-react (VegaViewServices.getSignalByName)
  - app-core/components/visual-viewer/components/vega-embed.tsx (renderId bump on handleEmbed)
  - react-data-table-component (preserves row component instances across re-renders by key)
tags:
  - react-usememo
  - stale-state
  - render-id
  - vega-view
  - signal-viewer
  - debug-pane
  - view-replacement
  - missing-dependency
---

# Signal Viewer shows stale signal values after spec re-run due to incomplete useMemo deps

## Problem

The Signal Viewer in the debug pane displayed stale signal values after a spec re-run when only a `params[].value` literal had changed. Users editing a spec and pressing run saw the old value persist in the signals table until they navigated away from the Signals tab and back, eroding trust in the debug surface.

## Symptoms

- Spec contains `"params": [{"name": "test", "value": 5}]`; Signal Viewer shows `5`.
- User changes `value` to `6` and re-runs the spec.
- Signal Viewer row for `test` continues to display `5`.
- Vega view itself is correct — only the Signal Viewer cell is stale.
- Switching to the Data tab and back to Signals forces a remount and the value updates to `6`.
- No console errors, no listener exceptions, no missing events — everything appears wired correctly.

## What Didn't Work

The author had previously flagged this exact area as suspect in a `@privateRemarks` block at the top of `signal-value.tsx`:

> "There seem to be some edge cases where the correct value is not returned, despite events and hooks lining-up correctly. This needs more time to investigate (and is likely programmer error on my part)."

Multiple prior passes had tuned the listener rebinding (the `renderId` `useEffect` cycles listeners cleanly onto each new view) and the `useState` lazy initializer without resolving the staleness. The previous `useMemo` deps were deliberately scoped to `[getSignalValues, signalValue]` with the comment _"Unrelated render triggers no longer re-run the prune/stringify pipeline on every pass"_ — a sensible-sounding optimisation that treated `renderId` as a render-frequency nuisance rather than a state-identity signal. That framing was the bug.

## Solution

Add `renderId` to the `currentValues` `useMemo` deps in [`packages/app-core/src/features/debug-area/components/signal-viewer/signal-value.tsx`](../../../packages/app-core/src/features/debug-area/components/signal-viewer/signal-value.tsx).

Before:

```typescript
// Only re-read the Vega view when something observably relevant has
// changed: the signal name, the translator, or signalValue (the state
// flag listener events flip to trigger a re-render for the current
// signal). Unrelated render triggers no longer re-run the
// prune/stringify pipeline on every pass.
const currentValues = useMemo(
    () => getSignalValues(),
    [getSignalValues, signalValue]
);
```

After:

```typescript
// Only re-read the Vega view when something observably relevant has
// changed: the signal name, the translator, signalValue (the state flag
// listener events flip to trigger a re-render for the current signal),
// or renderId (a fresh `View` instance has been attached — the cached
// display value is from the previous view and is stale). Unrelated
// render triggers still skip the prune/stringify pipeline.
//
// renderId is load-bearing for the spec-rerun case: when a user changes
// a `params[].value` and re-runs, the component instance is preserved
// by react-data-table-component (same row keys) and no listener event
// fires because the new value was set during view construction, not as
// a runtime change. Without renderId here the cell stays at the prior
// view's value until the component unmounts. See
// `__tests__/signal-value-memo-deps.test.ts` for the contract.
const currentValues = useMemo(
    () => getSignalValues(),
    [getSignalValues, signalValue, renderId]
);
```

Causal chain when `params[].value` changes from `5` to `6` and the spec is re-run:

1. `vegaEmbed()` constructs a new Vega `View`; signal `test` starts life at `6`.
2. `handleEmbed` in [`components/visual-viewer/components/vega-embed.tsx`](../../../packages/app-core/src/components/visual-viewer/components/vega-embed.tsx) calls `generateRenderId()` after `setViewReady(true)`, bumping `state.interface.renderId`.
3. `<DebugArea>` re-renders and threads the new `renderId` through `<SignalViewer>` to `<SignalValue>`.
4. `<SignalValue>` is **not** remounted: `react-data-table-component` keys rows by signal name, which is unchanged, so React preserves the existing instance.
5. The `useState` lazy initializer `getInitialSignalValue(signalName)` only runs on mount, so `signalValue` still holds `5`.
6. The `renderId` `useEffect` rebinds listeners onto the new view cleanly, but no signal-change event fires — the new value was set during view _construction_, not as a runtime mutation.
7. `getSignalValues` `useCallback` deps `[signalName, translate]` are unchanged, so the callback identity is stable.
8. Pre-fix, `useMemo` deps `[getSignalValues, signalValue]` are both unchanged → cached `display: "5"` is reused.
9. The cell renders `5` until the component unmounts (i.e. tab switch).

Adding `renderId` to the deps invalidates the memo when the view is replaced, forcing `getSignalValues()` to re-read the live signal from the new `View`, and the cell renders `6`.

## Why This Works

`useMemo` is intended to memoise **pure** computations over its deps. The `currentValues` memo violates that contract: its body calls `getSignalValues()`, which calls into `VegaViewServices.getSignalByName()` — a side-effecting accessor whose return value depends on the currently-attached Vega `View` instance. That `View` is external state, not a React value.

When a memo body reads from an externally-stateful service, the deps must include every channel that signals "the external state may now differ" — not just the channels that produced a new prop or callback. In this codebase the canonical signal that the bound view has been replaced is `state.interface.renderId`. Excluding it from the deps was treating it as a render-frequency concern when it is in fact a state-identity concern: a new `renderId` means the service will return values from a different `View`, so any prior memoised read is stale by definition.

The "optimisation" of leaving `renderId` out only paid off when no other dep changed — exactly the case where the user has changed the spec but not the signal listener state. The pipeline cost saved (a small prune/stringify pass) was never the bottleneck; correctness was.

## Prevention

Lock the contract with a pure dep-array characterization test in node-mode Vitest, mirroring the precedent in `data-tab-listener-rebind.test.ts`. The test simulates React's `useMemo` comparison without rendering anything:

```typescript
const shouldMemoRecompute = (
    prevDeps: readonly unknown[],
    nextDeps: readonly unknown[]
): boolean => {
    if (prevDeps.length !== nextDeps.length) return true;
    for (let i = 0; i < prevDeps.length; i++) {
        if (!Object.is(prevDeps[i], nextDeps[i])) return true;
    }
    return false;
};
```

Cover at minimum: post-fix dep array has 3 slots; `renderId` change alone recomputes; `signalValue` change alone recomputes; a fresh `getSignalValues` closure recomputes; all-unchanged does **not** recompute; and a regression case asserting that the pre-fix 2-slot shape did **not** recompute on a `renderId`-only change. The regression case is the load-bearing one — it documents the exact shape that produced the bug so future refactors cannot silently re-introduce it.

**General rule for this codebase.** When a `useMemo` (or `useCallback`) calls into an externally-stateful service rather than computing purely from props and state, every channel that signals "the external state may now differ" must appear in the deps. For view-bound hooks consuming `VegaViewServices` that means `renderId` is mandatory whenever the memo body reads from the view. Treat omitting it as a code smell, not an optimisation.

This is the `useMemo` corollary of the `useEffect` rule in [`docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md`](../best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md): `renderId` is owned by `handleEmbed` and consumed by every hook keyed to the current `View`, regardless of which hook variant (`useEffect`, `useMemo`, `useCallback`) the consumer happens to be.

## Related Issues

- [`docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md`](../best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) — establishes `renderId` as the single-owner identity token for `useEffect` rebinding on Vega `View` replacement. This doc extends the same rule to `useMemo` consumers.
- [`docs/solutions/best-practices/dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md`](../best-practices/dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md) — companion doc on the write side of the same token; covers dedup of `renderId` bumps.
- [`docs/solutions/best-practices/singleton-worker-addEventListener-ownership-filter-2026-04-28.md`](../best-practices/singleton-worker-addEventListener-ownership-filter-2026-04-28.md) — same family ("closure captured across lifetimes leaks stale state"), different mechanism (worker handler ownership).
- [`docs/solutions/ui-bugs/viewer-bounce-on-editor-exit-2026-05-04.md`](../ui-bugs/viewer-bounce-on-editor-exit-2026-05-04.md) and [`docs/solutions/ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md`](../ui-bugs/freeze-on-viewer-editor-transition-2026-05-01.md) — touch the Vega `View` replacement boundary from the mount/teardown ordering angle (different symptom, same boundary).
