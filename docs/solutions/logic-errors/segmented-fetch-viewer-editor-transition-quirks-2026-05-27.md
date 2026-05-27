---
title: Power BI segmented data-fetch quirks at viewer↔editor transitions
date: 2026-05-27
category: logic-errors
module: visual
problem_type: logic_error
component: dataset
symptoms:
    - 'With the segmented-fetch flag (`dataLimit.loading.override`) on, the visual gets stuck on the FetchingMessage loading screen after a viewer↔editor transition mid-fetch, only escaping when the user makes any change that invalidates the dataview cache (filter, slicer, property persist)'
    - "After the recovery clears the stuck state, the viewer renders at the editor's full-screen dimensions for a frame or two — `interface.embedViewport` was polluted by the host viewport reported during the transition while mode was still `fetching`"
    - 'Transitioning viewer→editor on a fully-loaded multi-segment dataset reduces the displayed rowcount to the first window (e.g. 27K → 10K) — Power BI re-ships the initial segment and the recovery branch overwrites the slice'
    - 'On the second editor-open of a fully-loaded multi-segment dataset, the visual gets stuck on FetchingMessage permanently and only recovers when the user manually nudges any property — the host accepts `fetchMoreData(true)` but never delivers the Append'
root_cause: host_segmented_fetch_chain_interrupted_by_view_mode_transitions
resolution_type: code_fix
severity: high
tags:
    - power-bi-host
    - segmented-fetch
    - fetchmoredata
    - viewer-editor-transition
    - display-mode
    - embed-viewport
    - dataset-recovery
    - host-quirks
status: resolved
---

# Power BI segmented data-fetch quirks at viewer↔editor transitions

## Context

Power BI custom visuals can request additional data segments via `host.fetchMoreData(true)` when the host signals more is available via `dataView.metadata.segment`. Deneb exposes this as the `dataLimit.loading.override` setting and walks the chain on every `update()` call: see `Deneb.resolveDataset` in [src/index.ts](../../../src/index.ts) and the pure decision function `resolveDatasetUpdateAction` in [src/lib/dataset/data-view.ts](../../../src/lib/dataset/data-view.ts).

The chain works fine in isolation — Create → Append → Append → terminal — but four distinct host quirks cluster around viewer↔editor transitions and silently break it. Each was discovered separately during Power BI Desktop testing; together they form a recognisable pattern worth recording so the next maintainer doesn't have to re-derive each from scratch.

The chain is documented in three earlier learnings that brush adjacent host behaviours:

- [[viewer-bounce-on-editor-exit-2026-05-04]] — establishes `interface.embedViewport` as the canonical commit-safe target, and `doesModeAllowEmbedViewportSet` as the gate that blocks host-viewport leaks while mode is in a transient state.
- [[freeze-on-viewer-editor-transition-2026-05-01]] — establishes that the host paces the iframe's CSS resize on its own schedule, independent of any signal the visual sends, and `window.innerWidth === options.viewport.width` is the reliable convergence signal.
- [[focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16]] — establishes the two-part separation for guarded persistence: clear the transient flag separately from preserving the stable state, and treat host option flags as unreliable until proven otherwise.

This document is the dataset-domain companion to those three. The fix shipped in commit `687ffe17`.

## Symptoms

Each of the four quirks below was observed on Power BI Desktop with `dataLimit.loading.override = true` and a multi-segment dataset (~27K rows in three windows of 10K).

1. **Stuck-on-loading after viewer↔editor transition mid-fetch.** User clicks Edit while the FetchingMessage is showing. The transition update arrives. The visual sits on FetchingMessage indefinitely until the user changes a property, applies a filter, or restarts the visual.

2. **Viewport pollution after recovery.** Once the stuck state clears (manually or via the recovery branch added in the fix), the viewer renders at the editor's full-screen dimensions briefly before snapping back to the viewer-mode dimensions. `interface.embedViewport` has been mutated to hold the editor's area.

3. **Dataset clobbered to first window on viewer→editor transition.** With all 27K loaded, the user clicks Edit. The editor opens but the dataset shows only 10K rows. The 17K rows from the second and third segments are gone from `state.dataset.values`.

4. **Permanent stuck FetchingMessage on second editor-open.** First viewer→editor→viewer cycle works correctly. Second viewer→editor open shows FetchingMessage indefinitely. The user must manually invalidate the dataview to recover. The log shows `fetch-more` being dispatched and `host.fetchMoreData(true)` returning `true`, but no subsequent Append ever arrives.

## Root causes

### 1. The host aborts segmented Append updates mid-transition

Non-volatile transition updates (`Resize + ResizeEnd`, `ViewMode`) carry the same `DataView` reference as the previous data update. `hasDataViewChanged` is reference-based, so on the transition update it returns `false`. The original `resolveDataset` only cleared `isFetchingAdditional` inside the `if (dataChanged) { ... } else { /* log only */ }` branch — so the flag stayed `true`, `setVisualUpdateOptions` kept resolving `mode = 'fetching'` from it, and `getResolvedDisplayModeForHostQuirks` was masked (the transition detector only triggers when the previous resolved mode is `'viewer'` or `'editor'`, never `'fetching'`).

### 2. `setEmbedViewport` runs before `resolveDataset` clears the stuck flag

The update sequence in `Deneb.resolveUpdateOptions` is:

1. `setVisualUpdateOptions(options)` — resolves mode from the _current_ `isFetchingAdditional` value (still `true` from the stuck state). Mode resolves to `'fetching'`. The viewport-commit block in [src/state/updates.ts](../../../src/state/updates.ts) checks `doesModeAllowEmbedViewportSet(mode)` and commits the host viewport when it returns `true`.
2. `resolveLocale`, `handlePropertyMigration`.
3. `resolveDataset(options)` — only here does the recovery branch clear `isFetchingAdditional`.

Pre-fix, `doesModeAllowEmbedViewportSet` excluded `editor`, `transition-viewer-editor`, and `transition-editor-viewer` — but **not** `fetching`. The host viewport reported on the transition update is the editor's area; it gets committed to `interface.embedViewport`; recovery then clears the stuck flag and mode resolves to viewer, but the polluted viewport survives.

### 3. The host re-ships the initial segment on viewer→editor transitions

Power BI's editor mode resets the segmented-fetch state and re-ships the initial window of data on transition. The transition update therefore carries a _reduced_ categorical (the first 10K of a 27K dataset). `hasDataViewChanged` sees the new references and returns `true`. With the recovery branch's original implementation calling `setDataset(getMappedDataset(categorical, locale))`, the fully-loaded 27K dataset gets overwritten with the reduced 10K payload.

### 4. The host accepts a restart `fetchMoreData(true)` it never honours

On the second editor-open of a fully-loaded multi-segment dataset, the host sends a fresh `Create` operationKind while the previous chain's `isFetchingAdditional` flag is still set (from the prior cycle's processing). The decision function previously dispatched `action.kind === 'fetch-more'`, the orchestrator called `host.fetchMoreData(true)`, and the host returned `true`. No Append ever arrived. The visual sat on FetchingMessage indefinitely, accumulating no further updates that could trigger the recovery branch.

## Resolution

The fix introduces a pure decision function and four behavioural guards. Each guard targets one of the four quirks above.

### Pure decision function

```ts
// src/lib/dataset/data-view.ts
export const resolveDatasetUpdateAction = (input: {
    dataChanged: boolean;
    canFetchMore: boolean;
    isFetchingAdditional: boolean;
    isInitialSegment: boolean;
}): DatasetUpdateAction => {
    const {
        dataChanged,
        canFetchMore,
        isFetchingAdditional,
        isInitialSegment
    } = input;
    // Host-restart guard (quirk #4)
    if (isInitialSegment && isFetchingAdditional) {
        return { kind: 'finalise', reason: 'recover-interrupted-fetch' };
    }
    if (dataChanged && canFetchMore) return { kind: 'fetch-more' };
    if (dataChanged) return { kind: 'finalise', reason: 'normal' };
    // Transition-interrupt recovery (quirk #1)
    if (isFetchingAdditional) {
        return { kind: 'finalise', reason: 'recover-interrupted-fetch' };
    }
    return { kind: 'skip' };
};
```

### Orchestrator dispatch

```ts
// src/index.ts — Deneb.resolveDataset (abridged)
if (action.kind === 'skip') return;
// ... logTimeStart, rowsLoaded, etc.

if (action.kind === 'fetch-more') {
    setIsFetchingAdditional({ isFetchingAdditional: true, rowsLoaded });
    let fetchSuccess: boolean;
    try {
        fetchSuccess = this.#host.fetchMoreData(true);
    } catch (e) {
        // Defensive: host throwing synchronously would otherwise leave the
        // flag permanently true and the visual permanently stuck.
        setIsFetchingAdditional({ isFetchingAdditional: false, rowsLoaded });
        throw e;
    }
    if (fetchSuccess) return;
    // Host declined — fall through to finalise/normal semantics with what we have.
    setIsFetchingAdditional({ isFetchingAdditional: false, rowsLoaded });
    setDataset(getMappedDataset(categorical, locale));
    return;
}

switch (action.reason) {
    case 'recover-interrupted-fetch': {
        // Quirks #1 + #3 + #4: clear the stuck flag, PRESERVE the existing
        // dataset slice. Math.max prevents shrinking rowsLoaded below
        // dataset.values.length when the host re-ships a reduced payload.
        const currentStateRowsLoaded = getDenebVisualState().dataset.rowsLoaded;
        setIsFetchingAdditional({
            isFetchingAdditional: false,
            rowsLoaded: Math.max(currentStateRowsLoaded, rowsLoaded)
        });
        return;
    }
    case 'normal': {
        setIsFetchingAdditional({ isFetchingAdditional: false, rowsLoaded });
        setDataset(getMappedDataset(categorical, locale));
        return;
    }
    default: {
        const _exhaustive: never = action.reason;
        throw new Error(`Unhandled finalise reason: ${String(_exhaustive)}`);
    }
}
```

### Viewport-pollution gate

```ts
// src/lib/state/display-mode.ts
export const doesModeAllowEmbedViewportSet = (mode: DisplayMode) =>
    mode !== 'editor' &&
    mode !== 'transition-viewer-editor' &&
    mode !== 'transition-editor-viewer' &&
    mode !== 'fetching'; // ← new exclusion (quirk #2)
```

`'fetching'` joins the existing exclusions because the host viewport reported during fetching mode does not match the canvas size the viewer should render at — a transition arriving mid-fetch reports the editor's area while mode is still pinned at `'fetching'` by the stuck flag.

## Why this works

### Recovery preserves the existing dataset

The recovery branch was originally going to call `setDataset(getMappedDataset(categorical, locale))` to "finalise the current state". That assumed `categorical` reflected the real state of the data we'd already loaded. **It doesn't.** Power BI's editor mode re-ships only the first window. Calling `setDataset` with that payload overwrites a fully-loaded slice with a partial one. The fix skips `setDataset` entirely — the slice keeps whatever the last real fetch path wrote. Subsequent property persists, cross-filter events, or genuine data changes re-enter the normal change-detection path on their own.

### Host-restart guard pre-empts the stuck loop

`isInitialSegment && isFetchingAdditional` is the signal that the host has restarted the chain while a previous chain was still flagged as in-progress. Re-entering `fetch-more` from that state reliably gets stuck. Routing to recovery instead clears the flag and preserves the dataset — the visual exits the loading screen and shows the previously-loaded data.

### Trade-offs (documented inline)

Both guards have rare false-positive cases:

- **Recovery preserves stale data when state was empty.** If recovery fires before any `setDataset` has run (cold-load fetch interrupted at the very first segment), the user sees blank Vega rather than partial data. Blank-with-recoverable beats wrong-data-without-recovery — the user can refresh or filter to retrigger.
- **Host-restart guard discards legitimate mid-fetch user filters.** A user applying a filter while the fetch chain is mid-flight produces the same `Create + isFetchingAdditional` signal as the host-restart case. The guard fires and the new filtered data is dropped. Rare in practice; the user re-applies the filter once the visual is stable. Worth knowing.

### Bounded `hasDataViewChanged` cache/slice divergence

`hasDataViewChanged` (in [src/lib/dataset/processing.ts](../../../src/lib/dataset/processing.ts)) updates module-level `prevCategories` / `prevValues` / `prevRowCount` references whenever it returns `true`. On the host-restart guard path the call returned `true` and already updated the cache to the reduced restart payload — so after the recovery branch preserves the slice's existing `dataset.values`, the change-detection cache and the slice deliberately diverge (cache points at the 10K refs, the slice still holds 27K).

This is bounded and self-healing: any subsequent update with the same reduced refs is correctly skipped (no harm done), and any subsequent update with new refs triggers a fresh fetch chain that re-syncs the slice. The lighter snapshot/restore alternative would require exposing module-level cache state from `processing.ts` — not worth the surface for an invariant that doesn't manifest as user-visible behaviour.

## When to apply

Use this pattern when:

- The change is per-update state driven by an opaque host (Power BI in this codebase, but the shape generalises).
- The host can interrupt or restart a multi-step operation without explicitly signalling the interrupt.
- The recovery surface is a stateful slice that should _preserve_ its existing contents on interrupt rather than be re-derived from a possibly-reduced host payload.
- The state machine's correctness depends on observing pre-flag values from the update that arrives _after_ the interrupt — i.e. you cannot rely on the next update to carry the real signal.

Skip when:

- The interrupt is observable (e.g. an explicit cancel event) — wire to that directly rather than inferring from the absence of a follow-up.
- The recovery branch can verify the new payload is at-least-as-large as the current slice — guard on that instead of unconditionally preserving.
- The host honours a re-issued operation — retry rather than recover.

## Code-review checklist

When you see a state machine driven by host updates:

- Does every input shape have a defined output action? Use a pure decision function over the input booleans (or richer domain types) so the matrix is unit-testable.
- Does the orchestrator dispatch close with a `never` exhaustiveness assertion? A future variant should fail at compile time rather than silently inheriting the wrong side-effects.
- Does any path call `setDataset` (or equivalent state replacement) with a host payload that could be smaller than what's currently stored? Confirm the payload is the _latest_ state, not a _replay_ of an earlier state.
- Is there a defensive `try/catch` around the host call that mutates state? A synchronous throw from the host must not leave the state machine in a partial-mutation state.
- When committing a host-reported viewport to a persisted slice, is the commit gated on a mode that's known to report the right value? Transient modes (`fetching`, transitions) typically don't.

## Examples

### Anti-pattern — recovery overwrites preserved state

```ts
// Old recovery branch: clobbered fully-loaded dataset with reduced restart payload
} else if (action.reason === 'recover-interrupted-fetch') {
    // ... log
    setIsFetchingAdditional({ isFetchingAdditional: false, rowsLoaded });
    setDataset(getMappedDataset(categorical, locale));  // ← clobber
}
```

### Correct — preserve slice, only clear the transient flag

```ts
case 'recover-interrupted-fetch': {
    const currentStateRowsLoaded = getDenebVisualState().dataset.rowsLoaded;
    setIsFetchingAdditional({
        isFetchingAdditional: false,
        rowsLoaded: Math.max(currentStateRowsLoaded, rowsLoaded)
    });
    return;
}
```

### Anti-pattern — viewport gate forgets a transient mode

```ts
// Pre-fix: 'fetching' was treated as commit-safe because no one noticed the
// stuck flag could pin mode there during a transition.
const isCommitSafe =
    mode !== 'editor' &&
    mode !== 'transition-viewer-editor' &&
    mode !== 'transition-editor-viewer';
```

### Correct — explicit exclusion list with rationale per excluded mode

```ts
const isCommitSafe =
    mode !== 'editor' &&
    mode !== 'transition-viewer-editor' &&
    mode !== 'transition-editor-viewer' &&
    mode !== 'fetching';
```

The accompanying JSDoc on `doesModeAllowEmbedViewportSet` names each excluded mode's reason, so a future maintainer adding a new `DisplayMode` value can decide which side of the gate it belongs on without re-deriving the rationale.

### Test pattern (vitest, node env)

```ts
import { describe, expect, it } from 'vitest';
import { resolveDatasetUpdateAction } from '../data-view';

describe('resolveDatasetUpdateAction — host-restart guard', () => {
    it('routes Create-while-fetching to recovery', () => {
        expect(
            resolveDatasetUpdateAction({
                dataChanged: true,
                canFetchMore: true,
                isFetchingAdditional: true,
                isInitialSegment: true
            })
        ).toEqual({ kind: 'finalise', reason: 'recover-interrupted-fetch' });
    });

    it('continues normal Append while still mid-fetch', () => {
        expect(
            resolveDatasetUpdateAction({
                dataChanged: true,
                canFetchMore: true,
                isFetchingAdditional: true,
                isInitialSegment: false // ← Append, not Create
            })
        ).toEqual({ kind: 'fetch-more' });
    });
});
```

A `Record<DisplayMode, boolean>` would be a stronger exhaustiveness guard than the array-comparison runtime check used in [src/lib/state/**test**/display-mode.test.ts](../../../src/lib/state/__test__/display-mode.test.ts) — flagged for a future tightening but not required.

## Known follow-up

No orchestrator-level integration test currently verifies the side-effect contract:

- Recovery branch does NOT call `setDataset`
- `fetch-more` host-decline DOES call `setDataset`
- `setIsFetchingAdditional` cross-slice mode-recompute clears `FetchingMessage` when transitioning `true → false` while mode is `'fetching'`

The workspace lacks `@testing-library/react` in the node test env (see `packages/app-core/src/features/debug-area/components/__tests__/no-data-message.test.tsx` for the established "defer component-tree tests" convention). A pragmatic harness — mocked state slices + a fake `#host` — is the right shape but the choice deserves a dedicated PR.

## Related

- [[viewer-bounce-on-editor-exit-2026-05-04]] — `embedViewport` as the canonical commit-safe target. The `'fetching'` exclusion added here extends the same `doesModeAllowEmbedViewportSet` gate.
- [[freeze-on-viewer-editor-transition-2026-05-01]] — host-paced iframe resize; the dataset-domain analog of treating the host's transient signals as unreliable until convergence.
- [[focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16]] — two-part separation pattern (clear transient flag; preserve stable state). The recovery branch here is the direct dataset-domain application.
- [`packages/app-core/ARCHITECTURE.md`](../../../packages/app-core/ARCHITECTURE.md) — context for where dataset/state/orchestrator boundaries live.
- Commit `687ffe17` on the `fix/fetching-status-confusion` branch.
