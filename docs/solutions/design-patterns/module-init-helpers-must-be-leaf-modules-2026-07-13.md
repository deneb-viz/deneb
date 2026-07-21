---
title: A helper invoked at module-init must be a leaf module, or a barrel round-trip causes a circular-init TDZ
date: 2026-07-13
category: design-patterns
module: app-core catalog, module structure
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
    - Extracting a shared helper that is invoked at module top-level (not inside a function or component body)
    - The helper would live in, or be re-exported from, a package/feature barrel (index.ts)
    - That barrel imports the very modules that call the helper (a dependency cycle exists)
    - Refactoring static template/config/registry definitions into a shared factory
tags:
    - typescript
    - esm
    - circular-dependency
    - tdz
    - module-structure
    - barrel-exports
    - refactor
related_components:
    - tooling
---

# A helper invoked at module-init must be a leaf module, or a barrel round-trip causes a circular-init TDZ

## Context

During the 2026-07-03 audit-remediation program (unit U17, duplication cleanup / P5-D2), the two-field "category + measure" `dataset` definition was duplicated four ways across the included bar-chart templates — `catalog/vega/v-bar-{simple,interactive}.ts` and `catalog/vega-lite/vl-bar-{simple,interactive}.ts`. The obvious dedup is a `getStandardBarDataset({ interactive })` factory.

The obvious *home* for that factory — the catalog barrel `catalog/index.ts`, next to the existing `getNewIncludedTemplateMetadata` helper the same template files already import — is a trap. `catalog/index.ts` imports `./vega` and `./vega-lite` (to build `VEGA_INCLUDED_TEMPLATES`). The template files import back from the barrel. And critically, each template file **calls the helper at module-init**:

```typescript
// v-bar-interactive.ts — top level, runs during module evaluation
const dataset = getStandardBarDataset({ interactive: true });
```

Routing `getStandardBarDataset` through the barrel would have produced a circular-initialization TDZ: `ReferenceError: Cannot access 'getStandardBarDataset' before initialization`.

## Guidance

**Rule:** If a symbol is invoked at **module-initialization time** (a top-level `const x = helper()`, not a call inside a function or component that runs later), it must be imported from a **leaf module** — one that imports only leaves, never from a barrel that (transitively) imports the calling module. Put the helper in its own dependency-free file and import it *directly*, bypassing the barrel.

```typescript
// catalog/standard-bar-dataset.ts — a LEAF: imports only data-core
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';

export const getStandardBarDataset = (
    options: { interactive?: boolean } = {}
): UsermetaDatasetField[] => [ /* ... */ ];
```

```typescript
// v-bar-interactive.ts — imports the helper DIRECTLY, not via `..`
import { getStandardBarDataset } from '../standard-bar-dataset';
const dataset = getStandardBarDataset({ interactive: true });
```

The existing `getNewIncludedTemplateMetadata` gets away with living in the barrel **only because it is called lazily** — inside the `vBarInteractive()` factory function, which runs long after every module has finished initializing. That is the distinction that matters: *when* the call happens, not *whether* a cycle exists.

## Why This Matters

ES modules initialize depth-first. When something imports `catalog/index.ts`:

1. `index.ts` starts evaluating; it hits `import { VEGA_INCLUDED_TEMPLATES } from './vega'` **before** its own `const` declarations run.
2. `./vega` loads `v-bar-interactive.ts`, whose top-level `const dataset = getStandardBarDataset(...)` executes **now**.
3. But `getStandardBarDataset`, declared as a `const` in the still-initializing `index.ts`, is in its temporal dead zone — its initializer hasn't run yet.
4. `ReferenceError: Cannot access 'getStandardBarDataset' before initialization`.

The failure is **load-order dependent and invisible to the type-checker** — TypeScript happily resolves the import; the cycle only bites at runtime, and only because the call is eager. A lazily-called symbol in the same cycle (like `getNewIncludedTemplateMetadata`) never faults, which makes the trap easy to walk into by analogy ("the other helper lives in the barrel, so mine can too").

A leaf module has no path back to its callers, so there is no cycle and no TDZ, regardless of call timing.

## When to Apply

- Extracting a factory/constant used to build **static registries, templates, catalogs, or config** that are assembled at import time.
- Any shared helper whose call site is a **top-level `const`/`let`** rather than inside a function, method, hook, or component body.
- Before adding a new export to a **barrel (`index.ts`) that imports its own siblings** — ask "is this called eagerly by anything the barrel pulls in?" If yes, make it a leaf.

Conversely, you do **not** need a leaf module when the only call sites are lazy (inside functions/components that run after module graph initialization). Those tolerate the cycle.

## Examples

### The trap (do not do this)

```typescript
// catalog/index.ts
import { VEGA_INCLUDED_TEMPLATES } from './vega';   // (1) loads template files...
export const getStandardBarDataset = (/* ... */) => [ /* ... */ ]; // (2) ...before this const initializes

// catalog/vega/v-bar-interactive.ts
import { getStandardBarDataset } from '..';          // resolves to the mid-init barrel
const dataset = getStandardBarDataset({ interactive: true }); // TDZ ReferenceError at load
```

### The fix (leaf module, direct import)

```typescript
// catalog/standard-bar-dataset.ts  — leaf, imports only @deneb-viz/data-core
export const getStandardBarDataset = (/* ... */) => [ /* ... */ ];

// catalog/vega/v-bar-interactive.ts
import { getStandardBarDataset } from '../standard-bar-dataset'; // bypasses the barrel
const dataset = getStandardBarDataset({ interactive: true });    // no cycle, no TDZ
```

Reference: [packages/app-core/src/catalog/standard-bar-dataset.ts](../../../packages/app-core/src/catalog/standard-bar-dataset.ts) and its callers under [packages/app-core/src/catalog/](../../../packages/app-core/src/catalog/).

## Prevention

- When extracting a helper, check its call sites first: **top-level call → leaf module; lazy call → placement is free.**
- Prefer a dedicated single-purpose file over the barrel for anything eagerly consumed by the module graph. The barrel is for the public surface, not for eagerly-shared internals.
- The build passes and types resolve either way — so this is not something a type-check or a green `tsc --noEmit` will catch. The full app build (webpack) or the app's own runtime is what surfaces it; running the workspace build after such an extraction is the check.

## Related

- [docs/solutions/design-patterns/module-level-singleton-escape-hatch-for-context-refs-2026-05-27.md](./module-level-singleton-escape-hatch-for-context-refs-2026-05-27.md) — another case where *module-level* evaluation order and identity drove the design, rather than component/runtime timing.
- [docs/solutions/best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md](../best-practices/extract-shared-semantics-to-avoid-dual-maintenance-2026-04-24.md) — the dedup discipline that motivates extractions like `getStandardBarDataset`; this doc is the placement constraint that comes with them.
- [packages/app-core/ARCHITECTURE.md](../../../packages/app-core/ARCHITECTURE.md) — the app-core layer/barrel discipline; this TDZ rule is the runtime-initialization corollary to it (barrels are for the public surface, not eagerly-shared internals).
