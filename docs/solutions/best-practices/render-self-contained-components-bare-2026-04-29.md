---
title: 'Render self-contained components bare — avoid doubled layout chrome'
date: 2026-04-29
category: best-practices
module: app-core/debug-area, react
problem_type: best_practice
component: tooling
severity: low
applies_when:
    - You're about to wrap a component invocation in a styled `<div>` chain
    - You find yourself copying the same wrapper structure across multiple call sites of one component
    - The component's name signals completeness — `ProcessingDataMessage`, `EmptyState`, `LoadingPanel`, etc.
    - During code review, an early-return contains layout chrome plus a single component invocation
    - You're reviewing JSX that has more wrapper divs than meaningful elements
tags:
    - react
    - layout
    - composition
    - dom-noise
    - structural-duplication
    - self-contained
related_components:
    - app-core/features/debug-area/components/data-table/processing-data-message.tsx
    - app-core/features/debug-area/components/dataset-viewer/data-tab.tsx
    - app-core/features/debug-area/components/dataset-viewer/source-tab.tsx
---

# Render self-contained components bare — avoid doubled layout chrome

## Context

In Deneb, two data-viewer tab components (`data-tab.tsx` and `source-tab.tsx`) each had early-return guards that wrapped a `<ProcessingDataMessage />` invocation in three nested `<div>` elements using `useDebugWrapperStyles`-derived classes. `ProcessingDataMessage` renders that same three-level wrapper internally via the same hook. The result was a doubled shell: `container > wrapper > details > container > wrapper > details > Spinner`. The pattern predated the polish-pass branch; a PR reviewer flagged it when an `aria-busy` addition drew fresh attention to the file.

## Guidance

Before adding layout chrome around a component invocation, inspect the component's render output. If it already returns a styled root element — particularly one using `makeStyles`, `useStyles`, or an equivalent hook — the outer wrapper is redundant. Drop it and render the component bare.

```tsx
// Before — doubled shell
if (isLoading) {
    return (
        <div className={classes.container}>
            <div className={classes.wrapper}>
                <div className={classes.details}>
                    <ProcessingDataMessage />
                </div>
            </div>
        </div>
    );
}

// After — component is self-contained
if (isLoading) {
    return <ProcessingDataMessage />;
}
```

The populated-data return path in the same file correctly keeps its wrapper because `<DataTableViewer />` does not render its own chrome — that wrapper earns its place. The distinction: does the child manage its own layout root? If yes, the outer wrapper is dead weight.

## Why This Matters

Doubled shells are visually silent — they don't throw errors, fail tests, or block ship. Their cost accumulates invisibly:

- **DOM noise:** extra nodes React reconciles, extra CSS classes browsers compute, extra levels accessibility tools traverse.
- **Debugging friction:** when overflow clipping, margin collapse, or focus trapping misbehaves, the doubled chrome doubles the surface area to inspect.
- **Ownership ambiguity:** two `container > wrapper > details` stacks with no clear authority — tuning spacing tokens on one may silently leave the other adrift.
- **Diff readability:** a 9-line early-return is harder to scan than a 1-line one; multiply across many call sites and the noise compounds.

The fix takes 60 seconds. The principle is simply: "if a function does X, don't wrap it in another function that does X."

## When to Apply

- Before wrapping any component invocation in a styled `<div>` chain.
- When you find yourself copying the same wrapper structure across multiple call sites of one component.
- When a component's name signals completeness: `ProcessingDataMessage`, `EmptyState`, `LoadingPanel` — names that imply the component owns its own presentation.
- During code review: an early-return containing layout chrome plus a single component invocation is the canonical smell.

## Examples

Canonical fix in this codebase: `data-tab.tsx` and `source-tab.tsx`, where three-level wrappers around `<ProcessingDataMessage />` were reduced to bare invocations. A quick grep surfaces similar patterns:

```bash
# Find call sites that wrap components in styled divs:
rg -B 2 -A 2 'classes\.(container|wrapper)' --type tsx
```

When the wrapper around `<SomeCompleteComponent />` mirrors the chrome inside it, drop the outer wrapper. If you DO need additional positioning at the call site (e.g. a Flex parent with specific gap/padding), reach for a single semantic wrapper instead of duplicating the component's entire chrome.

## Related

- [`extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md`](extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — doubled layout chrome is a structural form of dual maintenance: two wrappers must be kept in sync if either's shape changes. Different fix (delete vs extract), same underlying smell of structural duplication caught only by reviewer.
- [`usestate-stable-setref-portal-mount-nodes-2026-04-29.md`](usestate-stable-setref-portal-mount-nodes-2026-04-29.md) — companion finding from the same PR; pattern of "check the component's source before integrating it." That doc covers the React contract; this doc covers the DOM contract.
- [`keep-non-canonical-children-out-of-dom-positional-parents-2026-04-29.md`](keep-non-canonical-children-out-of-dom-positional-parents-2026-04-29.md) — companion from the same PR; structural-placement discipline. That doc covers child placement inside DOM-positional parents; this doc covers wrapping discipline at call sites.
- [`gate-feature-flagged-react-components-at-call-site-2026-05-06.md`](gate-feature-flagged-react-components-at-call-site-2026-05-06.md) — adjacent call-site discipline for a different mechanism: when a component is build-time feature-flagged, the gate belongs at the JSX call site so React doesn't run hooks the flag was meant to suppress.
