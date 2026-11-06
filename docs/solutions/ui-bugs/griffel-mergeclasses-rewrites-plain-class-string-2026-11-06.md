---
title: 'Griffel mergeClasses rewrites the class string even with nothing to merge'
date: 2026-11-06
category: ui-bugs
module: powerbi-host
problem_type: ui_bug
component: tooling
severity: low
symptoms:
    - 'A component renders with the same styles but different `class` attributes after a refactor'
    - '`mergeClasses(classes.card, false)` returns a different string from `classes.card`'
    - 'A markup comparison or snapshot fails with a class-only diff that the code does not explain'
root_cause: wrong_api
resolution_type: code_fix
related_components:
    - testing_framework
tags:
    [
        griffel,
        fluent-ui,
        mergeclasses,
        makestyles,
        class-names,
        markup,
        landing-page
    ]
---

# Griffel mergeClasses rewrites the class string even with nothing to merge

## Problem

Deneb's landing page pieces moved into `packages/powerbi-host/src/features/status/components/` (`landing-page-card.tsx`, `landing-page-layout.tsx`, `status-container.tsx`) so both visuals could use them. The viewer-only build needed optional behaviour Deneb doesn't use: a highlight on the current step, an action in a card's heading row, and an inset page. Deneb's rendered markup had to stay byte-identical.

Griffel's `mergeClasses` (from `@fluentui/react-components`; seen with 9.73.6, Griffel 1.20.1) doesn't pass a lone class through. It dedupes the atomic classes and adds a sequence-hash class, even when there is nothing to merge:

```tsx
mergeClasses(classes.card, false) !== classes.card; // same styles, different string
```

## Symptoms

- The page looks the same, so nothing is visibly wrong.
- Deneb's `class` attributes differ from before the move, so any markup comparison or snapshot fails with a diff the code doesn't explain.

## What Didn't Work

Merging unconditionally, for example `mergeClasses(classes.cardSection, isCurrent && cardClasses.current)`. It reads cleanly and renders correctly, but it changed every card's class attribute in Deneb, which doesn't pass the prop. A throwaway `renderToStaticMarkup` comparison against the markup from before the move showed the difference.

## Solution

Call `mergeClasses` only when something is added, and pass the plain class through otherwise:

```tsx
className={
    isCurrent ? mergeClasses(classes.section, classes.current) : classes.section
}
```

In `packages/powerbi-host/src/features/status/components/`, `landing-page-card.tsx` merges only for the current step, `status-container.tsx` only when it is given a `className`, and `landing-page-layout.tsx` gives it one only for an inset page.

## Why This Works

Without the extra prop, the code never calls `mergeClasses`, so the class string is exactly the one the styles hook produces, and the markup is unchanged. Only the elements that take the extra class get a rewritten string.

## Prevention

- Merge only when a class is added. `cond ? mergeClasses(a, b) : a` keeps the plain path untouched; `mergeClasses(a, cond && b)` doesn't.
- Pin the plain path's class in a test: render the component with `renderToStaticMarkup` without the optional props, and compare its class with the one the styles hook gives a bare element. `landing-page-card.test.ts` and `landing-page-layout.test.ts` in that folder's `__test__/` do this.
- For a refactor whose markup must not change, render before and after with `renderToStaticMarkup` and compare the strings.

## Related Issues

- [Sharing UI, strings and wiring between both visuals through powerbi-host](../architecture-patterns/share-between-visuals-through-powerbi-host-2026-11-06.md): optional props that only one visual passes.
- [Fluent UI v9 DataGrid migration landmines](./fluent-datagrid-migration-landmines-2026-07-20.md): other Fluent v9 behaviour that differs from what the API suggests.
- [Render self-contained components bare](../best-practices/render-self-contained-components-bare-2026-04-29.md): keeping a component's markup to what it needs.
