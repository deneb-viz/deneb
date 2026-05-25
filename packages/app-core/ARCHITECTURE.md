# app-core Architecture

`@deneb-viz/app-core` is organised as a strict layered codebase: composition layers sit on top, utility layers sit on the bottom, and dependencies only ever point downward (with carefully-scoped exceptions for state and context, which are also low-level enough that lib may consume them).

## Layers

The codebase is partitioned into nine layers, each rooted at a specific path under `src/`:

- **entry** — `src/index.ts`, `src/editor.ts`. The package's public surface. Wires everything together for consumers.
- **app** — `src/app/**`. Top-level orchestration: screens, root providers, composition of multiple features into a coherent application shell.
- **feature** — `src/features/<name>/**`. Self-contained feature slices (e.g. `features/spec-editor`, `features/command-bar`). Each feature owns its UI, local state, and types.
- **components** — `src/components/**`. Reusable UI primitives shared across features (buttons, panels, icons).
- **lib** — `src/lib/**`. Pure helpers, contract types, and small utilities with no React or platform coupling required at the call-site.
- **state** — `src/state/**`. Zustand slices and store assembly. Synchronous, framework-agnostic application state.
- **context** — `src/context/**`. React context providers and the hooks that read them.
- **i18n** — `src/i18n/**`. Translation primitives and locale-bound strings.
- **catalog** — `src/catalog/**`. Static catalogues (operators, templates, registries) that downstream layers look up by key.

## Dependency direction (matrix)

The table below lists, for every "from" layer, the set of layers it is allowed to import from. Self-imports are always allowed and listed explicitly. Anything not in the row is rejected.

| From \ may import from | entry | app | feature | components | lib | state | context | i18n | catalog |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **entry**      | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| **app**        |  -  | yes | yes | yes | yes | yes | yes | yes | yes |
| **feature**    |  -  |  -  | self only | yes | yes | yes | yes | yes | yes |
| **components** |  -  |  -  |  -  | yes | yes | yes | yes | yes | yes |
| **lib**        |  -  |  -  |  -  |  -  | yes | yes | yes | yes | yes |
| **state**      |  -  |  -  |  -  |  -  | yes | yes | yes | yes | yes |
| **context**    |  -  |  -  |  -  |  -  | yes | yes | yes | yes | yes |
| **i18n**       |  -  |  -  |  -  |  -  |  -  |  -  |  -  | yes |  -  |
| **catalog**    |  -  |  -  |  -  |  -  | yes |  -  |  -  | yes | yes |

The runtime source of truth for this matrix is `packages/app-core/eslint.config.js`. If this document and the eslint config ever disagree, **the eslint config wins** — please update this doc to match.

A few things worth noting:

- `lib`, `i18n`, and `catalog` are the lowest-level utility layers; every UI-composition layer above them may depend on them.
- `state` and `context` sit just above `lib`. They may depend on `lib` (for constants, contracts, and persistence helpers) and on each other (a Zustand slice may reach for a React context's typed contract, and vice versa), but they may not reach up into `components`, `features`, `app`, or `entry`.
- `lib` is allowed to consume `state` and `context` because some helpers in `lib/` are typed shims that bind to a slice or context shape. This is a deliberate, narrow exception — most files in `lib/` import nothing higher than `lib` itself.
- `i18n` is fully isolated: it imports nothing but itself. This keeps locale bundles free of accidental application coupling.
- `catalog` is small and read-only by design; it may peek at `lib` (for shared types) and `i18n` (for label keys), but nothing else.

## Same-feature semantics

Each subfolder of `src/features/` is treated as one **element instance**. Files inside `features/spec-editor/` may import each other freely — they are all the same element. What is forbidden is cross-feature imports:

```text
features/spec-editor/foo.ts    -> features/command-bar/bar.ts    REJECTED
features/spec-editor/foo.ts    -> features/spec-editor/baz.ts    OK
```

This is configured via the `capture: ['featureName']` setting on the `feature` element in eslint.config.js. If two features genuinely need to share code, that code must be promoted out of `features/` and into `components/`, `lib/`, `state/`, or `context/`, whichever fits.

## Enforcement

Layering is enforced by `eslint-plugin-boundaries` (configured in `packages/app-core/eslint.config.js`). A vitest canary at `packages/app-core/src/__tests__/architecture-boundaries.test.ts` re-runs ESLint over `src/` in test scope and fails CI if any `boundaries/element-types` violation appears.

Why a canary on top of ESLint? Because the repo uses `eslint-plugin-only-warn`, which downgrades all ESLint errors to warnings during `npm run eslint`. Without the canary, `boundaries/element-types` violations would be silently surfaced as warnings and never block a merge. The canary asserts zero matching messages, which makes the rule effectively `error` again at CI time.

## Where does new code go?

A short decision guide:

- New piece of UI used by only one feature → put it inside that feature's folder.
- New piece of UI used by two or more features → promote it to `components/`.
- New cross-cutting React context provider → `context/`.
- New pure helper or shared contract type (no React) → `lib/`.
- New Zustand slice or store wiring → `state/`.
- New static lookup table (operators, templates, registry entries) → `catalog/`.
- New screen, layout, or composition that wires multiple features together → `app/`.

If you are unsure, default to the most-restricted layer that still works. It is always easier to relocate a file upward later than to untangle a feature that has been allowed to grow tendrils.

## Known transitional exceptions

`src/index.ts` (the root barrel) currently re-exports a small number of feature primitives as a transitional API for consumers (notably the visual entry point) that have not yet been hoisted to the `app/` layer. These re-exports are marked in source with a `// TEMPORARY API WHILE WE HOIST APP OUT OF POWER BI` comment.

This is the only intentional layering exception in the package; it is tracked for removal as the visual entry point migrates onto the `app/` composition layer.

## Historical context

The layered model documented here was established by a focused refactor recorded in `docs/plans/2026-05-21-app-core-architecture-normalization.md`. That plan contains the original audit, the per-phase remediation steps (Phases A–E), and the rationale for individual decisions (for example, why `state` and `context` sit below `lib` in the dependency table, and why same-feature imports are permitted as one element instance).

Readers who need to understand *why* a particular layer is where it is, or who want the full history of how the boundaries fixture and canary came to exist, should start with that plan. This file is intentionally a practical reference for everyday work, not a historical record.
