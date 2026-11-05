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

Griffel's `mergeClasses` (from `@fluentui/react-components`) doesn't pass a lone class through. It dedupes the atomic classes and adds a sequence-hash class, even when there is nothing to merge:

```tsx
mergeClasses(classes.card, false) !== classes.card; // same styles, different string
```

## Symptoms

- The page looks the same, so nothing is visibly wrong.
- Deneb's `class` attributes differ from before the move, so any markup comparison or snapshot fails with a diff the code doesn't explain.

## What Didn't Work

Merging unconditionally, for example `mergeClasses(classes.cardSection, isCurrent && cardClasses.current)`. It reads cleanly and renders correctly, but it changed every card's class attribute in Deneb, which doesn't pass the prop. A throwaway `renderToStaticMarkup` comparison against the markup from before the move showed the difference.

## Solution

Call `mergeClasses` only when something is added, and pass the plain class through otherwise. In `landing-page-card.tsx`:

```tsx
<section
    // Only a current card merges classes: merging changes the class
    // string, and a card without a step keeps the plain section's.
    className={
        isCurrent
            ? mergeClasses(classes.cardSection, cardClasses.current)
            : classes.cardSection
    }
    aria-current={isCurrent ? 'step' : undefined}
>
```

`status-container.tsx` does the same with the `className` it accepts, and `landing-page-layout.tsx` passes `undefined` when there is no inset:

```tsx
// status-container.tsx
className={
    className
        ? mergeClasses(classes.flexContainerVertical, className)
        : classes.flexContainerVertical
}

// landing-page-layout.tsx
<StatusContainer className={inset ? layoutClasses.inset : undefined}>
```

## Why This Works

Without the extra prop, the code never calls `mergeClasses`, so the class string is exactly the one `useStatusStyles()` produces. A card with no step, or a done or upcoming step, renders the old markup. Only the current step and an inset page get a rewritten class.

## Prevention

- Merge only when a class is added. `cond ? mergeClasses(a, b) : a` keeps the plain path untouched; `mergeClasses(a, cond && b)` doesn't.
- Pin the plain path's class in a test. Both tests compare against the class a bare element gets from `useStatusStyles()`:
    - `packages/powerbi-host/src/features/status/components/__test__/landing-page-card.test.ts` renders `LandingPageCard` with `renderToStaticMarkup`. A card with no step, or a done or upcoming one, must keep the plain `cardSection` class, with no `aria-current` and no heading-row action. Only the current card differs and carries `aria-current="step"`.
    - `landing-page-layout.test.ts` in the same folder checks the content `div` keeps the plain `flexContainerVertical` class without an inset, and differs with one.
- For a refactor whose markup must not change, render before and after with `renderToStaticMarkup` and compare the strings.

## Related Issues

- [Sharing UI, strings and wiring between both visuals through powerbi-host](../architecture-patterns/share-between-visuals-through-powerbi-host-2026-11-06.md): optional props that only one visual passes.
- [Fluent UI v9 DataGrid migration landmines](./fluent-datagrid-migration-landmines-2026-07-20.md): other Fluent v9 behaviour that differs from what the API suggests.
- [Render self-contained components bare](../best-practices/render-self-contained-components-bare-2026-04-29.md): keeping a component's markup to what it needs.
