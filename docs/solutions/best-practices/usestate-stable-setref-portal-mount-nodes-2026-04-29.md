---
title: "Portal-mount-ref slots use useState and identity-stable setters"
date: 2026-04-29
category: best-practices
module: app-core/debug-area, react, fluent-ui-9
problem_type: best_practice
component: tooling
severity: high
applies_when:
  - You are mounting a Fluent UI Tooltip (or any portal component) to a custom DOM node via `mountNode` / `portalRoot`
  - You hold a DOM reference whose value is read by JSX expressions during render (not just by event handlers)
  - You are consolidating multiple ref slots into a single useRef/useState record to "reduce boilerplate"
  - A reviewer recommends replacing several useState pairs with one useRef
  - You are writing a `setRef` callback inline as an arrow function rather than passing a setter directly
tags:
  - react
  - fluent-ui
  - tooltips
  - portal
  - useref-vs-usestate
  - ref-callback
  - render-loop
  - canonical-pattern
related_components:
  - app-core/components/ui/toolbar/toolbar-button-standard.tsx
  - app-core/features/debug-area/components/debug-toolbar.tsx
  - app-core/components/ui/tooltip-custom-mount.tsx
---

# Portal-mount-ref slots use useState and identity-stable setters

## Context

Fluent UI v9 (and similar component libraries) support custom portal mount points via a pattern where a child component (`<TooltipCustomMount>`) populates a parent-held ref slot via a `setRef` callback prop, and the parent passes that slot to `<Tooltip mountNode={...}>`. The canonical reference implementation in [`packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx`](packages/app-core/src/components/ui/toolbar/toolbar-button-standard.tsx#L80) uses ONE `useState<HTMLElement | null>` per button, passing the state setter directly as `setRef={setRef}`:

```tsx
const [ref, setRef] = useState<HTMLElement | null>();
// ...
<Tooltip mountNode={ref}>...</Tooltip>
<TooltipCustomMount setRef={setRef} />
```

For a four-button toolbar, a doc-review reviewer recommended "consolidate four `useState` pairs into one `useRef<Record<DebugPaneRole, HTMLElement | null>>`" as a "premature-complexity simplification." Two consecutive attempts to follow that direction violated different React contracts and broke the pattern in different ways.

## Guidance

Two invariants must BOTH hold for any portal-mount-ref slot. Violating either produces a distinct bug.

**Invariant 1: Use `useState`, not `useRef`, for the mount slot.**

The mount-ref assignment must trigger a re-render so the parent's `<Tooltip mountNode={...}>` (or equivalent prop on a similar component) picks up the populated DOM node on the next render. `useRef` mutations are invisible to React's render cycle — the prop value freezes at whatever the initial render saw (`null`).

**Invariant 2: The `setRef` callback identity must be stable across renders.**

React's ref-callback contract: when the callback's identity changes between renders, the OLD callback is called with `null` (detach) and the NEW callback is called with the element (attach). Inline arrow functions (`setRef={(el) => doStuff(el)}`) are recreated each render — new identity each render → infinite detach/reattach + setState + re-render loop.

The simplest way to satisfy both invariants: pass the React state setter directly as the ref callback. State setters are identity-stable by React's contract. Alternative: wrap the closure with `useCallback(fn, [])`.

**For multiple slots in one component, prefer N separate `useState` pairs over one `useState<Record<...>>` with inline closures.** The single-record approach forces inline-callback violations of Invariant 2 without ergonomic benefit. Consolidation is the wrong simplification axis here.

## Why This Matters

The two failure modes have very different visibility:

**Invariant 1 violation (`useRef`)** — silent breakage. The Tooltip mounts to Fluent's default portal target instead of the custom mount node. Visual symptoms only — wrong z-index, wrong stacking context, possible clipping at scroll boundaries. No error is thrown. No automated test in node-env vitest can catch it (the failure is in React's rendering output, not in the component's reasoning logic). This branch's review needed three independent reviewers (correctness, julik-frontend-races, reliability) at 0.88-0.97 confidence to surface it.

**Invariant 2 violation (inline closures)** — loud breakage. React immediately throws on first hover or first commit:

```text
Error: Maximum update depth exceeded.
    at dispatchSetState
    at setRef (debug-toolbar.tsx)
    at safelyDetachRef
    at commitMutationEffectsOnFiber
```

The crash is fast and obvious, but only surfaces during manual testing — pure-helper unit tests don't render React, so they pass while production crashes.

**Meta-lesson on reviewer feedback (auto memory [claude]):** a reviewer's high-confidence "premature complexity" or "simplification" suggestion deserves a verification step against the canonical pattern in the codebase, not blind compliance. The canonical pattern in this codebase exists *for a reason* — it was deliberately written to satisfy both invariants. Consolidating multiple slots into one record looked like reduced boilerplate but broke the underlying contract twice in a row. The codebase's functional-programming preference and behavior-not-implementation test philosophy don't help here either: both bugs are in the *rendering shape* of the component, which the test suite (vitest in node env, no jsdom) can't observe. Human eyes on the canonical pattern were the only catch.

## When to Apply

- Any pattern where a child component populates a parent-held slot via a ref callback prop.
- Fluent UI `<TooltipCustomMount setRef={...}>` paired with `<Tooltip mountNode={...}>`.
- Any library's "custom portal mount" API that hands back a DOM node via a callback.
- Anytime you reach for `useRef` to hold a DOM node whose value is read by another prop on the same render.
- When a reviewer suggests consolidating several `useState<HTMLElement | null>` pairs into one record — pause and verify the canonical pattern's intent before complying.

## Examples

**Before #1 — `useRef<Record<...>>` (silent breakage):**

```tsx
const mountRefs = useRef<Record<DebugPaneRole, HTMLElement | null>>({
    source: null, data: null, signal: null, log: null,
});
<Tooltip mountNode={mountRefs.current.source}>...</Tooltip>
<TooltipCustomMount setRef={(el) => { mountRefs.current.source = el; }} />
// First render: mountNode={null}. setRef fires in commit phase, mutates ref,
// but no re-render. Tooltip already mounted to default portal — for the
// component's lifetime. TooltipCustomMount is structurally pointless.
```

**Before #2 — `useState<Record<...>>` with inline closures (infinite loop):**

```tsx
const [mountNodes, setMountNodes] = useState<Record<DebugPaneRole, HTMLElement | null>>({
    source: null, data: null, signal: null, log: null,
});
<Tooltip mountNode={mountNodes.source}>...</Tooltip>
<TooltipCustomMount
    setRef={(el) => { setMountNodes((prev) => ({ ...prev, source: el })); }}
/>
// Each render creates a new arrow → new ref-callback identity →
// React calls old(null) + new(el) → setState → re-render → repeat.
// Crashes immediately with "Maximum update depth exceeded".
```

**Final — four `useState` pairs, setter passed directly:**

```tsx
const [sourceMount, setSourceMount] = useState<HTMLElement | null>(null);
const [dataMount, setDataMount] = useState<HTMLElement | null>(null);
const [signalMount, setSignalMount] = useState<HTMLElement | null>(null);
const [logMount, setLogMount] = useState<HTMLElement | null>(null);

<Tooltip mountNode={sourceMount}>...</Tooltip>
<TooltipCustomMount setRef={setSourceMount} />
// (× 4)
// State setters are identity-stable. Each assignment triggers exactly
// one re-render that picks up the populated mountNode. No detach/reattach
// loop. Matches the canonical toolbar-button-standard.tsx pattern.
```

## Related

- [`keep-non-canonical-children-out-of-dom-positional-parents-2026-04-29.md`](keep-non-canonical-children-out-of-dom-positional-parents-2026-04-29.md) — companion finding from the same PR. This doc covers the React render-cycle invariants (`useState` over `useRef`, stable callback identity); the companion covers the DOM placement invariant (mount divs go *outside* the radio group, not inside). Both must hold for the pattern to be durable.
- [`render-self-contained-components-bare-2026-04-29.md`](render-self-contained-components-bare-2026-04-29.md) — third companion from the same PR. The "check the canonical pattern before consolidating" discipline behind this doc generalises to the "check the component's render output before wrapping it" discipline that one captures.
- [`pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — sibling "React contract violation caught by reviewer" pattern; same debug-pane toolbar context. Renders-synced refs + pure updaters address a different invariant; the canonical-pattern verification discipline is the same.
- [`lifecycle-owns-effect-rebind-identity-token-2026-04-28.md`](lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) — companion: identity tokens for effect rebinding share the same "React contract about identity" family as ref-callback identity stability.
- [`singleton-worker-addEventListener-ownership-filter-2026-04-28.md`](singleton-worker-addEventListener-ownership-filter-2026-04-28.md) — "one owner per channel" applied to Worker `onmessage`; callback-identity invariants matter here too.
- [`extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md`](extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — reviewer-recommended consolidation that introduced drift; same pattern of "simplification suggestion that violated an invariant."
- [`../logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md`](../logic-errors/stale-echo-triple-render-on-apply-2026-04-10.md) — render-thrash bug; same family of "state setter churn produces unexpected render cycles."
