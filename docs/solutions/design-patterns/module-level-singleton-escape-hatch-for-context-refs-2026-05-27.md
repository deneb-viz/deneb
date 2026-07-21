---
title: 'Module-level singleton escape hatch for context refs (App-shell consumers)'
date: 2026-05-27
category: design-patterns
module: app-core
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
    - 'A React context value is a module-level singleton (refs, services, configured clients) that lives for the lifetime of the bundle'
    - 'The provider mounts conditionally somewhere in the tree (e.g. only inside the editor, not on cold viewer loads)'
    - 'A legitimate consumer is structurally a sibling of the provider rather than a descendant (App-shell toast, top-level overlay, platform router)'
    - 'You have already adopted the nullable-default + guard pattern from [[usecontext-guard-needs-nullable-default]] — the guard is the load-bearing signal you must preserve'
tags:
    - react
    - usecontext
    - module-level-singleton
    - cross-tree-consumer
    - provider-guard
    - escape-hatch
    - app-core
related_components:
    - testing_framework
---

# Module-level singleton escape hatch for context refs

## Context

The companion learning [[usecontext-guard-needs-nullable-default]] explains why a `useFoo` hook with a `!context` guard requires `createContext<T | null>(null)`: a truthy sentinel default silences the guard and lets out-of-provider consumers receive an empty object that crashes later with a confusing `TypeError`. Fixing that default is correct.

Adopting the nullable-default fix has a second-order effect that the original doc anticipated but did not prescribe a remedy for: **once the guard actually fires, you discover which consumers were silently surviving on the truthy sentinel**. Those callers fall into two categories.

- **True programmer errors.** A feature component was mounted without its provider — fix the mount, the guard's job is done, end of story.
- **Structural outsiders.** The caller is a legitimate part of the app shell that cannot live under the provider's subtree. The provider mounts conditionally inside a feature; the caller is a sibling of that feature, not a descendant. Moving the provider higher would mean mounting it always, which makes the guard dead code and re-creates the original anti-pattern.

This learning is about the second category.

A real example shipped in commit `ba63f0cf`: `NotificationApplyChanges` is mounted at the App level alongside `<RetainedDenebEditor>` and `<GatedDenebViewer>`. The `<SpecificationEditorProvider>` lives inside the editor tree. On a cold viewer load, `RetainedDenebEditor` returns `null`, so the provider never mounts; the toast called `useSpecificationEditor()` at render time, the guard threw, and React 18 unmounted the entire App tree — empty wrapper, no DOM, no error visible without DevTools open. Pre-fix the truthy sentinel had silently masked this for the toast's whole life, because its `useEffect` condition (`isDirty && type === 'viewer'`) prevented the empty refs from ever being dereferenced.

## Guidance

When the context value is a module-level singleton AND a real consumer cannot be a descendant of the provider, use the **dual-access pattern**:

1. **Construct the singleton at module scope**, separately from the provider.
2. **Export the singleton** as a named value alongside the provider and the hook.
3. **The provider passes the singleton as its `value`** so descendants and outsiders get the same object identity.
4. **Inside-the-provider consumers keep using the hook** — `useFoo()` with its guard.
5. **Outside-the-provider consumers import the singleton directly** — no hook, no guard, no provider required.

The two access paths converge on one object. There is no second source of truth, no risk of the provider and the direct-import consumer diverging. The guard stays load-bearing for the cases where it matters (a feature mounted without its provider is still a programmer error and still throws). The singleton starts at its empty state (typically `{ current: null }` for refs) and stays empty until whatever conditional code populates it (Monaco `onMount`, service `connect()`, etc.), so the click handler that reads it has to tolerate the empty case — usually trivially, with `?.` or an existing fallback.

## Why This Matters

Three properties hold together:

- **The guard remains reachable.** A new feature component that forgets the provider still throws at the call site with the intended message. The dual-access pattern doesn't broaden the provider; it adds a parallel route for outsiders, not a way around the guard.
- **Object identity is preserved.** The provider's `value` IS the exported singleton — `<Context.Provider value={fooRefs}>`, not `value={{ ...fooRefs }}` or `value={useMemo(() => fooRefs, [])}`. Any wrapping that creates a new object identity breaks consumers that compare references (or rely on the singleton-identity invariant tested below).
- **The narrow scope is enforceable.** A regression-lock test on the original out-of-provider consumer (a static import-check) and the singleton-identity test below pin the contract.

Hoisting the provider higher to "fix" the throw without the dual-access pattern is the trap. It silences the symptom but kills the guard's reachability — the very anti-pattern [[usecontext-guard-needs-nullable-default]] warned against, just on a different axis. If you find yourself moving a provider up the tree solely to satisfy a sibling consumer, you are working around the wrong half of the pattern.

## When to Apply

Apply when **all** of these hold:

- The context value is a module-level singleton (refs created with `createRef()`, service handles, configured clients) — not state that varies per provider mount.
- A real consumer is structurally a sibling of the provider, not a descendant, and cannot be moved into the subtree without significant restructuring.
- The consumer's read pattern tolerates the empty state of the singleton (cold reads return `null`/empty by design; the caller already has a fallback or is gated by another state condition).
- You have the nullable-default + guard already (this pattern composes with it, not against it).

Do **not** apply when:

- The provider's value is per-mount state (`useState`, derived data, callbacks closed over render props) — there is no singleton to export and the pattern doesn't fit.
- The consumer can structurally be made a descendant — do that instead.
- "Hoist the provider" is feasible without making the guard dead code — that's the simpler fix.
- The empty-state read is not actually safe — the dual-access pattern relies on the singleton having a sensible cold-load value (typically `null`); if the consumer would crash on `null`, the dual-access pattern just relocates the bug.

## Examples

### Anti-pattern — relying on a truthy sentinel to silence the guard

```ts
// foo-context.tsx
const fooRefs = { spec: createRef(), config: createRef() };
export const FooContext = createContext<FooRefs>({} as FooRefs); // truthy sentinel
export const FooProvider = (props) => (
    <FooContext.Provider value={fooRefs}>{props.children}</FooContext.Provider>
);

// use-foo.ts
export const useFoo = () => {
    const c = useContext(FooContext);
    if (!c) throw new Error('useFoo must be used within FooProvider'); // dead code
    return c;
};

// outside-the-provider-consumer.tsx (App shell)
const { spec } = useFoo(); // silently receives `{}`, crashes later on spec.current
```

The guard reads as defensive code but it is dead — `{} as FooRefs` is truthy. The crash is deferred to whichever caller first dereferences a missing field and gives a stack trace pointing away from the real cause.

### Correct — dual-access pattern

```ts
// foo-context.tsx
const specRef = createRef<EditorRef | null>();
const configRef = createRef<EditorRef | null>();

/**
 * Module-level singleton handle. Exported for consumers mounted outside
 * the `FooProvider` subtree — typically App-shell surfaces. Inside the
 * subtree, prefer `useFoo()` so the provider-missing guard catches
 * legitimate programmer errors.
 */
export const fooRefs: FooRefs = { spec: specRef, config: configRef };

export const FooContext = createContext<FooRefs | null>(null); // nullable default
export const FooProvider = (props) => (
    <FooContext.Provider value={fooRefs}>{props.children}</FooContext.Provider>
);

// use-foo.ts (unchanged from the nullable-default pattern)
/**
 * Returns the editor refs for consumers mounted inside `FooProvider`.
 * Throws if called outside the provider — that is intentional and
 * catches genuine programmer errors. If your component cannot
 * structurally live under the provider (e.g. an App-shell surface that
 * is a sibling of the provider), import `fooRefs` directly instead of
 * calling this hook.
 */
export const useFoo = () => {
    const c = useContext(FooContext);
    if (!c) throw new Error('useFoo must be used within FooProvider');
    return c; // narrowed to FooRefs
};

// inside-the-provider-consumer.tsx (editor tree)
const { spec, config } = useFoo(); // guard fires if provider missing — correct
spec.current?.someEditorMethod();

// outside-the-provider-consumer.tsx (App shell)
const { spec, config } = fooRefs; // direct import, no guard, no provider needed
const handleClick = () => persist(spec.current, config.current); // null-tolerant
```

The provider's `value={fooRefs}` is the load-bearing line: the descendants see the same object as the outsiders. Wrapping in a fresh object literal at the provider site (or memoising it) breaks the identity invariant; the test below catches that.

### Test template

Four assertions lock the singleton's contract. Co-locate them with the context module's existing tests.

```ts
import { describe, expect, it } from 'vitest';
import { fooRefs } from '../foo-context';

describe('fooRefs', () => {
    it('exposes the expected handles', () => {
        expect(fooRefs.spec).toBeDefined();
        expect(fooRefs.config).toBeDefined();
    });

    it('each handle is a React-shaped ref object with `current`', () => {
        expect(fooRefs.spec).toHaveProperty('current');
        expect(fooRefs.config).toHaveProperty('current');
    });

    it('starts with `current === null` before any provider populates it', () => {
        expect(fooRefs.spec.current).toBeNull();
        expect(fooRefs.config.current).toBeNull();
    });

    it('is a stable module-level singleton across imports', async () => {
        // The module-cache identity matters: provider value and direct-import
        // consumer must hold the same object. A bundler misconfiguration or
        // `vi.resetModules()` slip-up that creates two copies would silently
        // break the toast's apply handler.
        const reimported = await import('../foo-context');
        expect(reimported.fooRefs).toBe(fooRefs);
    });
});
```

The fourth test is the load-bearing one. If a future refactor breaks module-cache identity (separate bundles, mis-aliased imports, a stray `vi.resetModules()` in a sibling test), the descendants and outsiders read different ref objects — descendants see the populated refs, outsiders read null forever, and click handlers no-op silently. The static failure here is far cheaper than the silent runtime failure.

For the outsider consumer itself, add a static import-check canary in its own test file. Anything that re-introduces the hook on a structural-outsider component will fail CI before reaching Power BI Desktop. See `src/features/toaster/__test__/notification-apply-changes-imports.test.ts` for the in-repo example.

## Code-review checklist

When you see `createContext` paired with an exported module-level singleton:

- The context default must be `null` (or `undefined`), the generic widened to `T | null` — same rule as [[usecontext-guard-needs-nullable-default]].
- The provider's `value=` must be the singleton itself, not a fresh object literal or a re-memoised wrapper. Object identity is load-bearing.
- A test asserts `await import(...)` returns the same singleton instance across re-imports.
- The outsider consumer has a regression-lock test (static import check or equivalent) preventing accidental reversion to the hook.
- The hook itself has a JSDoc naming the escape hatch so the next developer who hits the guard knows about the singleton route. Without that pointer, future out-of-provider consumers will reach for the hook (it's the obvious entry point), see the guard message, and try to restructure the tree before finding the singleton.

When you see a `useFoo` consumer outside its provider's natural subtree:

- It must use the singleton import, not the hook.
- The consumer's read of `.current` must tolerate null (cold-load before anything populates).
- The component must not be moved under the provider purely to "fix" the guard — that resurrects the dead-guard anti-pattern.

## Related

- [[usecontext-guard-needs-nullable-default]] — the first half of this pattern. Fixes the default so the guard can fire at all. This learning is the necessary companion when fixing the default exposes legitimate out-of-provider consumers.
- [`packages/app-core/src/context/specification-editor/specification-editor-context.tsx`](../../../packages/app-core/src/context/specification-editor/specification-editor-context.tsx) — the in-repo implementation of this pattern.
- [`packages/app-core/src/context/specification-editor/__tests__/specification-editor-refs.test.ts`](../../../packages/app-core/src/context/specification-editor/__tests__/specification-editor-refs.test.ts) — the singleton-identity test in this repo.
- [`src/features/toaster/__test__/notification-apply-changes-imports.test.ts`](../../../src/features/toaster/__test__/notification-apply-changes-imports.test.ts) — the regression-lock test for the App-shell consumer.
- [`packages/app-core/ARCHITECTURE.md`](../../../packages/app-core/ARCHITECTURE.md) — the layering decision-guide notes that `context/` is for cross-cutting React infrastructure; the bare singleton co-located with its provider is a defensible inhabitant of that layer.
- [`docs/solutions/best-practices/local-green-is-not-ci-or-production-green-2026-07-13.md`](../best-practices/local-green-is-not-ci-or-production-green-2026-07-13.md) — the canonical node-env-vitest reference; the static import-check canary here is another instance of its "test in the node env, mock or characterize, no `@testing-library/react`" convention.
