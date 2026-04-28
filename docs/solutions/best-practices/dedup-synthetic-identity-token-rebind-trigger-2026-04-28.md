---
title: "Synthetic identity-token bumps must dedup their triggers"
date: 2026-04-28
category: best-practices
module: app-core/state/compilation
problem_type: best_practice
component: tooling
severity: medium
applies_when:
  - A Zustand action or state slice bumps a UUID/version counter to force a useEffect to re-run
  - The upstream event source can emit duplicate or repeated events (Vega pulses, polling loops, network retries, repeated log lines)
  - The effect being rebound has non-trivial teardown cost (listener detach, async cancel, DOM mutation)
  - The action cannot be delegated to a React lifecycle hook that already owns the identity token
  - A deduplication structure (Set, Map, or deduplicated array) for the upstream event is already maintained in state
tags:
  - zustand
  - react
  - useeffect
  - identity-token
  - render-thrash
  - vega
  - deduplication
  - state-management
related_components:
  - app-core/state/compilation
  - app-core/state/interface
  - app-core/debug-area/dataset-viewer/data-tab.tsx
---

# Synthetic identity-token bumps must dedup their triggers

## Context

In [`packages/app-core/src/state/compilation.ts`](packages/app-core/src/state/compilation.ts), a Zustand action `handleLogError` bumped `state.interface.renderId` (a UUID) on every invocation. The intent was to force a `DataTab` `useEffect` — with deps `[datasetName, renderId]` — to tear down and reattach its dataset listener whenever a Vega runtime error occurred.

Vega emits the same runtime error on every pulse when a steady-state error condition exists. With no dedup guard, `handleLogError` produced a new UUID on every frame → Zustand flush → React commit → listener teardown and reattach. A single persistent runtime error saturated the render cycle.

The dedup guard (described below) was added as a P1 fix. A subsequent refactor — captured in [`lifecycle-owns-effect-rebind-identity-token-2026-04-28.md`](lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) — went further and deleted the slice-level `renderId` bumps entirely, since `vega-embed.tsx#handleEmbed` already owned the token. The dedup pattern remains valuable for any code path where lifecycle-ownership delegation isn't an option.

## Guidance

**When a synthetic identity token (UUID, version string) is dispatched from a state action to force `useEffect` rebinding, dedup the trigger upstream.** The token must bump once per real semantic change — not once per emission of a noisy upstream event stream.

The check happens before the spread, inside the pure updater — no side effects in the updater body.

## Why This Matters

Identity-token bumps are designed to be cheap proxies for "something changed." When the upstream event source is noisy — emitting the same payload repeatedly — an unguarded bump turns that noise into guaranteed render thrash. The React effect sees a new token value on every frame and faithfully executes its teardown/setup cycle, potentially thousands of times per second on a continuous render pipeline.

This pattern is the **fallback** when delegation isn't available. The primary pattern — delegate identity-token ownership to the lifecycle hook that produces the new resource — eliminates the dedup question entirely because the bump only fires on real lifecycle events. See the related learning for the primary pattern.

## When to Apply

- A state action bumps a UUID or version counter to force `useEffect` rebinding.
- The upstream event source is a continuous pipeline (render loop, websocket, polling, retry loop).
- The same error message, result, or status can arrive repeatedly without semantic change.
- Lifecycle-hook delegation isn't possible (no hook owns the resource the effect cares about, or multiple sources legitimately need to bump the same token).

## Examples

**Before — unconditional bump:**

```typescript
// packages/app-core/src/state/compilation.ts
const handleLogError = (message: string) =>
    set((state) => ({
        compilation: {
            ...state.compilation,
            runtimeErrors: [...state.compilation.runtimeErrors, message]
        },
        interface: {
            ...state.interface,
            renderId: getNewUuid() // bumps on every emission, including duplicates
        }
    }));
```

**After — dedup guard:**

```typescript
const handleLogError = (message: string) =>
    set((state) => {
        const isDuplicate = state.compilation.runtimeErrors.includes(message);
        return {
            compilation: {
                ...state.compilation,
                runtimeErrors: isDuplicate
                    ? state.compilation.runtimeErrors
                    : [...state.compilation.runtimeErrors, message]
            },
            interface: {
                ...state.interface,
                renderId: isDuplicate ? state.interface.renderId : getNewUuid()
            }
        };
    });
```

The comparison happens before the spread, inside a pure updater — no side effects.

**Test — duplicate does not bump:**

```typescript
it('does not bump renderId when the same error message is logged again', () => {
    const message = 'Divide by zero';
    store.getState().handleLogError(message);
    const renderIdAfterFirst = store.getState().interface.renderId;

    store.getState().handleLogError(message);
    const renderIdAfterSecond = store.getState().interface.renderId;

    expect(renderIdAfterSecond).toBe(renderIdAfterFirst);
});
```

## Common offenders

- Vega runtime errors: same error string emitted on every render pulse.
- WebSocket heartbeat pulses carrying a steady-state status code.
- Polling returning an identical result object across multiple ticks.
- Retry loops emitting the same failure reason on each attempt.

## Related

- [`lifecycle-owns-effect-rebind-identity-token-2026-04-28.md`](lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) — the **primary pattern**: delegate `renderId` ownership to the lifecycle hook that produces the new resource, so noisy upstreams never reach the bump site. Apply the dedup guard from this doc only when delegation isn't available.
- [`singleton-worker-addEventListener-ownership-filter-2026-04-28.md`](singleton-worker-addEventListener-ownership-filter-2026-04-28.md) — co-discovered in the same review cycle; ownership filtering inside a functional updater is a complementary dedup technique.
- [`../logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md`](../logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md) — same family of bug (synthetic dispatch causing render thrash) on a different axis (bidirectional Power BI sync stale echo vs repeated-event listener churn).
- [`pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — the dedup guard adheres to this rule: the comparison is inside the updater body, with no DOM side-effects.
