---
title: "Lifecycle hooks own effect-rebind identity tokens"
date: 2026-04-28
category: best-practices
module: vega-react, app-core/state/compilation
problem_type: best_practice
component: tooling
severity: high
applies_when:
  - A useEffect depends on an identity token (UUID, renderId, version string) to force listener rebinding
  - The token is already bumped inside a lifecycle hook that runs after the async resource it guards is ready
  - A state-management action (Zustand slice reducer, thunk, saga) also dispatches a bump to the same token
  - A plan adds a "compensating dispatch" in multiple action handlers to substitute for a removed effect dependency
  - A code review surfaces a race between a synchronous dispatch and an async resolution (e.g. vegaEmbed promise)
tags:
  - react
  - useeffect
  - zustand
  - vega
  - identity-token
  - race-condition
  - single-writer
  - effect-rebinding
related_components:
  - vega-react/hooks/use-vega-embed
  - app-core/state/compilation
  - app-core/vega-embed.tsx
---

# Lifecycle hooks own effect-rebind identity tokens

## Context

During a refactor to decouple a `DataTab` listener `useEffect` from an ad-hoc rebind trigger (`state.debug.logAttention`), the replacement design dispatched `state.interface.renderId` from two state-management actions (`handleCompile`, `handleLogError` in [`packages/app-core/src/state/compilation.ts`](packages/app-core/src/state/compilation.ts)). A subsequent review pass found that this created a second writer for a token that [`packages/app-core/src/components/visual-viewer/components/vega-embed.tsx`](packages/app-core/src/components/visual-viewer/components/vega-embed.tsx)'s `handleEmbed` already owned — producing both a race condition and per-keystroke churn.

## Guidance

**Identity tokens used to force `useEffect` rebinding must have a single owner: the lifecycle hook that produces the resource the consuming effect depends on.**

State-management actions (Zustand slice updaters, thunks) that also bump the same token create a second writer. The result is either redundant churn (the token bumps on events that don't produce a new resource) or a race (the token bumps before the new resource is ready, so the consuming effect runs against stale or null state).

Identify which lifecycle hook produces the resource. Make that hook the sole source of truth for the token. State-management actions may flip auxiliary state but must not also dispatch the rebind token.

## Why This Matters

In the concrete case here:

- `handleCompile` bumped `renderId` synchronously at compile time. The `DataTab` effect fires on the next React commit and calls `VegaViewServices.getView()` before `vegaEmbed()` has resolved — so `getView()` returns `null`, rendering the empty-state incorrectly. (Race surfaced as JFR-003 in code review.)
- `renderId` also bumped on every debounced spec-only recompile (e.g. every keystroke during edits), causing the listener effect to cycle, re-read `getDataByName`, re-hash, and conditionally repost to the worker — on every keystroke. (Perf regression surfaced as REL-003.)

Deleting the slice-level bumps resolved both: `handleEmbed` already calls `generateRenderId()` after `vegaEmbed()` resolves and `setViewReady(true)` runs, making the token always post-view and bumped exactly once per real view replacement.

A second discovery fell out for free: `state.debug.logAttention` was now dead state. Audit found writes (compilation.ts setters), type declarations, and test assertions of the writes — but zero consumers. `LogErrorIndicator` reads `state.compilation.runtimeErrors` directly. The "compensating dispatch" was masking a bigger simplification.

## When to Apply

- Any time a UUID/version token is used as a `useEffect` dependency to force listener rebinding.
- Any time a second dispatch is added for a token already written by a lifecycle hook.
- During code review: if two distinct call sites write the same identity token, treat it as a multi-writer smell requiring justification.
- When a "compensating dispatch" is proposed in multiple action handlers as a substitute for a removed effect dependency, search for an existing lifecycle owner before adding the dispatches.

## Examples

**Before — slice-level dispatch creates a second writer:**

```typescript
// packages/app-core/src/state/compilation.ts
// handleCompile — BEFORE (deleted)
set((state) => ({
  compilation: { ...state.compilation, ...update },
  interface: { ...state.interface, renderId: generateRenderId() }, // ← second writer, racy
}));

// handleLogError — BEFORE (deleted)
set((state) => ({
  compilation: { ...state.compilation, ...update },
  interface: { ...state.interface, renderId: generateRenderId() }, // ← second writer, redundant
}));
```

**After — lifecycle hook is the sole owner:**

```typescript
// packages/app-core/src/components/visual-viewer/components/vega-embed.tsx
// handleEmbed — pre-existing; no change required
// runs AFTER vegaEmbed() resolves and setViewReady(true) runs
generateRenderId(); // ← sole writer; view is guaranteed non-null here
```

**Co-discovered cleanup — dead state deleted:**

```typescript
// state.debug.logAttention — written by compilation.ts setters,
// declared in types, asserted in tests — but ZERO consumers.
// LogErrorIndicator reads state.compilation.runtimeErrors directly.
// Deleted entirely; the "compensating dispatch" was holding it alive.
```

The consuming effect in `data-tab.tsx` with `deps: [datasetName, renderId]` required no change — once the slice-level bumps were removed, it fired at the correct time automatically (post-view, exactly once per view replacement).

## Related

- [`dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md`](dedup-synthetic-identity-token-rebind-trigger-2026-04-28.md) — **fallback pattern** for code paths where lifecycle-ownership delegation isn't available; dedup the trigger against the upstream event stream so noisy emissions don't thrash the dependent effect.
- [`singleton-worker-addEventListener-ownership-filter-2026-04-28.md`](singleton-worker-addEventListener-ownership-filter-2026-04-28.md) — co-discovered in the same review cycle; the sibling principle ("one owner per channel") applied to a Worker singleton's `onmessage` slot rather than to an identity token.
- [`../logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md`](../logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md) — complementary race-condition pattern; stale external echo vs. internal second-writer on a lifecycle trigger.
- [`../logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md`](../logic-errors/focus-mode-viewport-overwrites-persisted-dimensions-2026-04-16.md) — multi-writer hazard on persisted state; same principle applied to viewport dimensions.
- [`pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — keeping setState updaters pure prevents multi-writer drift from accumulating; identity-token bumps inside slice updaters violate the same principle.
- [`type-widening-requires-call-site-audit-2026-04-16.md`](type-widening-requires-call-site-audit-2026-04-16.md) — when shared state changes shape or semantics, audit all writers; the same discipline applies to identity tokens.
