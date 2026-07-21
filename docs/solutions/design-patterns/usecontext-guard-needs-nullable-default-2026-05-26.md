---
title: '`useContext` provider-missing guard requires a nullable context default'
date: 2026-05-26
category: design-patterns
module: app-core
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
    - "Writing a custom hook of the shape `useFoo = () => { const c = useContext(FooContext); if (!c) throw new Error(...); return c; }`"
    - "The context's value has no safe empty representation (`MutableRefObject`, services, store handles)"
    - "A missing `<FooProvider>` is a programmer error, not a valid runtime state"
    - "You want `useFoo()` callers to consume the return as `T` (non-nullable) without their own null checks"
tags:
    - react
    - usecontext
    - typescript
    - context-pattern
    - type-narrowing
    - provider-guard
    - dead-code
    - app-core
related_components:
    - testing_framework
---

# `useContext` provider-missing guard requires a nullable context default

## Context

A common React pattern is to wrap `useContext` in a custom hook (`useFoo`) and throw a helpful error when the hook is called outside its `Provider`:

```ts
export const useFoo = () => {
    const context = useContext(FooContext);
    if (!context) {
        throw new Error('useFoo must be used within a FooProvider');
    }
    return context;
};
```

The guard is only meaningful if `useContext(FooContext)` actually returns a falsy value when no provider is mounted — which depends on how the context was initialized via `createContext`. If the context was created with a truthy sentinel like `{} as FooValue` (or a cast-laundered `undefined as unknown as FooValue`), the guard becomes dead code: `useContext` returns the truthy default, `!context` is always `false`, the throw never fires, and consumers mounted outside the provider silently receive the empty sentinel. They then crash later with confusing `TypeError: Cannot read properties of undefined` errors when they try to dereference fields like `.spec.current` — exactly the failure mode the guard was supposed to surface helpfully.

This guidance came out of a real defect found during a refactor's adversarial code review: `SpecificationEditorContext` had been written as `createContext<SpecificationEditorRefs>({} as SpecificationEditorRefs)` since inception. The structural reviews of the prior refactor verified byte-equivalence but never asked whether the original guard was reachable. The bug was invisible because in practice every consumer was mounted inside the provider, but it would have actively misled the next developer who wasn't.

## Guidance

When `useContext` is used as a hook entry point with a provider-missing guard:

1. **Initialize the context with `null`**, not with `{} as T` and not with `undefined as unknown as T`.
2. **Widen the type to `T | null`** so the call signature reflects reality.
3. **Cover the guard with a unit test.** In environments without `@testing-library/react`, mock React's `useContext` via `vi.mock('react', ...)` and assert both branches (null → throws; refs → returns).

TypeScript's control-flow analysis narrows `T | null` to `T` after the `throw`, so callers keep their clean non-nullable type with zero ergonomic cost. The guard becomes meaningful, the default is honest, and missing-provider mounts surface as immediate, actionable errors instead of distant `TypeError`s.

## Why This Matters

The whole point of the guard pattern is to convert a developer error (a forgotten provider) into a clear, immediate failure at the call site. A truthy sentinel default defeats that goal silently — the consumer keeps running with an empty object until something downstream tries to use a missing field, at which point the stack trace points away from the real cause. Worse, the `as T` cast suppresses the type-checker signal that would otherwise flag the truthy default as suspicious.

The fix is one line and costs nothing at runtime. The cost of leaving it broken is paid once by every developer who debugs the wrong stack trace.

## When to Apply

- Any custom hook of the shape `useFoo = () => { const c = useContext(...); if (!c) throw ...; return c; }`.
- Any context whose value has no semantically valid "empty" representation (refs, service handles, configured clients).
- Any context where "no provider mounted" is a programmer error rather than a valid runtime state.

Skip this guidance when the context legitimately has a safe default (e.g. an `i18n` context whose default is "untranslated keys" or a theme context whose default is "light"). In those cases there is no guard and no dead-code risk.

## Examples

### Anti-pattern — guard is dead code

```ts
// specification-editor-context.tsx
export const SpecificationEditorContext =
    createContext<SpecificationEditorRefs>({} as SpecificationEditorRefs);

// use-specification-editor.ts — hook body identical to corrected version below;
// the only difference is the context default. With {} as T the guard never fires.
```

### Correct — guard fires, type narrows

```ts
// specification-editor-context.tsx
export const SpecificationEditorContext =
    createContext<SpecificationEditorRefs | null>(null);

// use-specification-editor.ts — body unchanged
export const useSpecificationEditor = () => {
    const context = useContext(SpecificationEditorContext); // T | null
    if (!context) {
        throw new Error(
            'useSpecificationEditor must be used within a SpecificationEditorProvider'
        );
    }
    return context; // narrowed to T
};
```

Prefer `null` over `undefined` for the default — both narrow correctly under `strictNullChecks`, but `null` is the React idiom (matches `Ref<T>`, matches most community `createContext` examples).

### Test pattern (vitest, `node` environment, no `@testing-library/react`)

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();
    return { ...actual, useContext: vi.fn() };
});

import { useContext } from 'react';
import { useSpecificationEditor } from '../use-specification-editor';

const mockedUseContext = vi.mocked(useContext);

describe('useSpecificationEditor', () => {
    it('throws when called outside SpecificationEditorProvider', () => {
        mockedUseContext.mockReturnValueOnce(null);
        expect(() => useSpecificationEditor()).toThrow(
            'useSpecificationEditor must be used within a SpecificationEditorProvider'
        );
    });

    it('returns the refs unchanged when the Provider supplied a value', () => {
        const refs = { spec: { current: null }, config: { current: null } };
        mockedUseContext.mockReturnValueOnce(refs);
        expect(useSpecificationEditor()).toBe(refs);
    });
});
```

`vi.mock('react', ...)` is per-file scoped, so other test files in the same package are unaffected. Two gotchas worth knowing:

- Vitest hoists `vi.mock` above all imports, so the `import { useContext } from 'react'` statements that follow it will resolve to the mocked binding. The hook under test must also import `useContext` directly from `'react'` (not via `React.useContext` from a namespace import captured before the mock applies, and not via a project-internal re-export) — otherwise the mock misses.
- `importOriginal<typeof import('react')>()` keeps every other React export untouched. Skip the spread and you'll break unrelated React APIs in the same test file.

## Code-review checklist

When you see `createContext<T>(...)` paired with a `!context` guard:

- The default must be `null` (or `undefined`).
- The generic must be `T | null` (or `T | undefined`).
- A test that mocks `useContext` to return `null` must exist and assert the throw.

`createContext<T>({} as T)` or `createContext<T>(undefined as unknown as T)` paired with a `!context` guard is a smell — flag it.

`createContext<T>(null!)` is a near-miss variant worth distinguishing: the runtime value IS `null` (so the guard does fire), but the non-null assertion launders that out of the type, hiding nullability from anyone reading the context in isolation. Prefer the explicit `T | null` widening so the type, the default, and the guard all tell the same story.

## Related

- Commits `b8ca90e6` (fix) and `f1f5d925` (test) on the `refactor/app-core-normalization` branch documented in [`docs/plans/2026-05-21-app-core-architecture-normalization.md`](../../plans/2026-05-21-app-core-architecture-normalization.md).
- [`packages/app-core/ARCHITECTURE.md`](../../../packages/app-core/ARCHITECTURE.md) documents `context/` as a layer that hosts cross-cutting React providers like the one this pattern applies to.
- [`docs/solutions/best-practices/local-green-is-not-ci-or-production-green-2026-07-13.md`](../best-practices/local-green-is-not-ci-or-production-green-2026-07-13.md) — the canonical node-env-vitest reference. It reuses the `vi.mock` hoisting + exact-import-path mechanics written up here, and adds the CI-Node-22 / gateway-module dimension (why an unmocked workspace import can pass locally yet fail CI).
