---
title: Local green is not CI/production green — node-env test mocking and the full-build gate
date: 2026-07-13
category: best-practices
module: root visual, app-core, utils, testing + build toolchain
problem_type: best_practice
component: development_workflow
severity: high
applies_when:
    - Writing a vitest test (node environment) that imports app-core, the visual interactivity barrel, powerbi-compat/formatting, utils/logging, or powerbi-visuals-api
    - Changing an exported function's signature, or a value that flows into declaration (.d.ts) emit
    - Calling a Power BI host API that returns the host's IPromise rather than a native Promise
    - Deciding what to run before proposing a PR — and trusting or distrusting a fast local signal
tags:
    - vitest
    - esm
    - mocking
    - ci
    - typescript
    - build-gate
    - transpile-only
    - powerbi-visuals-api
related_components:
    - testing_framework
    - tooling
---

# Local green is not CI/production green — node-env test mocking and the full-build gate

## Context

The 2026-07-03 audit-remediation program shipped 18 units as per-unit PRs. Three separate times, a change that was green on the fast local signals would have been red on the real gate:

- A test that imported a workspace gateway passed locally but the extensionless ESM inside `powerbi-visuals-utils-typeutils` is rejected by CI's Node 22 (unit U9-era; recurred whenever `values.ts`-style modules were tested).
- `npm run ci:local` caught a ts-loader-only type error that `turbo`, `eslint`, and `vitest` all missed (unit U10).
- The production package build (ts-loader `transpileOnly: false`) caught `host.downloadService.exportStatus()` returning powerbi's `IPromise<PrivilegeStatus>`, which is **not** assignable to `Promise<number>` — invisible to transpile-only vitest and the dev build (unit U18).

The unifying lesson: **every fast local check is a strict subset of the real gate.** `vitest` (transpile-only), the dev webpack build (no full type-check), and even `tsc --noEmit` each have a specific blind spot that CI on Node 22 or the production package build (`transpileOnly: false`, with declaration emit) will surface. Know each blind spot; run the full gate before shipping.

## Guidance

### Rule 1 — node-env vitest must `vi.mock` the host/workspace gateways

A vitest file running in the **node** environment that transitively imports any of these must mock them, or CI (Node 22, stricter ESM resolution) rejects the extensionless `powerbi-visuals-utils-*` ESM even though the test passes on the author's machine:

- `@deneb-viz/app-core`
- the visual's `../interactivity` barrel
- `@deneb-viz/powerbi-compat/formatting`
- `@deneb-viz/utils/logging`
- `powerbi-visuals-api` → mock to `{}`

```typescript
// Mock the logging gateway so the test doesn't pull the extensionless
// powerbi-visuals-utils ESM that CI's Node 22 rejects.
vi.mock('@deneb-viz/utils/logging', () => ({ logError: vi.fn() }));

// If the module under test compares against a powerbi enum, either mock the
// API to {} and pass the sentinel in, or keep the helper powerbi-free:
vi.mock('powerbi-visuals-api', () => ({}));
```

The cleaner variant is to keep the unit under test **free of those imports** so no mock is needed — e.g. a helper that takes a status thunk + an "allowed" sentinel instead of importing `powerbi-visuals-api` itself (see Example B). Extraction-for-testability doubles as extraction-away-from-the-ESM-trap.

### Rule 2 — run the full production build as the gate, not just `tsc --noEmit` / vitest

vitest transpiles types away (`transpileOnly`), and the dev webpack build skips full type-checking for speed. Neither performs **declaration emit**. Run the production package build (ts-loader `transpileOnly: false`), which `npm run ci:local` bundles alongside eslint, prettier, syncpack, and the certified package. It is the only local step that catches:

- **Host `IPromise` vs native `Promise`** — powerbi's `IPromise<T>` lacks `[Symbol.toStringTag]`, so it fails assignment to `Promise<T>`. Fix by typing the boundary as `PromiseLike<T>` (a thenable is all `await` needs).
- **TS4023 "cannot be named"** — declaration emit for an exported symbol that references a non-exported type from **another** module. (Note the inverse, which is safe: a non-exported type used only within its **own** module emits as a local `declare type` — un-exporting a same-file type alias never triggers TS4023.)
- Const-enum inlining and other `powerbi-visuals-api` type interactions that only the full compile exercises.

## Why This Matters

The signals form a subset ladder, cheapest first, each blind to something the next catches:

| Signal | Blind to |
| --- | --- |
| dev webpack build | full type errors (speed-optimized, partial checking) |
| `vitest` (node, transpile-only) | all type errors; the ESM-resolution trap unless gateways are mocked |
| `tsc --noEmit` | declaration-emit errors (TS4023) that only surface when `.d.ts` is actually produced |
| **`ci:local` / production package build** | — (this is the gate CI reproduces) |

Treating a green subset check as proof of correctness is how "works on my machine" PRs turn red in CI or, worse, ship a type-unsound package. The failures are not flaky — they are deterministic consequences of *which* check ran.

## When to Apply

- **Before proposing any PR:** run `npm run ci:local`. In this repo a PreToolUse hook also gates `gh pr create` on it.
- **When writing a node-env test** that imports any gateway in Rule 1 — add the mocks, or refactor the unit to not need them.
- **After changing an exported signature**, a value that flows into `.d.ts`, or any call into a Power BI host API returning `IPromise`.
- **When a change touches a published package's public surface** — also build the external-embedder sample (here, `web-client-sample`) as the parity canary.

## Examples

### Example A — the `IPromise` boundary (U18 / L1)

```typescript
// Fails the production type-check: exportStatus() returns powerbi IPromise<PrivilegeStatus>
export const resolveDownloadPermitted = async (
    exportStatus: () => Promise<number>,   // WRONG: IPromise not assignable to Promise
    allowedStatus: number
): Promise<boolean> => { /* ... */ };

// Passes: PromiseLike<T> accepts any thenable, and the generic sidesteps the
// enum/number variance entirely.
export const resolveDownloadPermitted = async <T>(
    exportStatus: () => PromiseLike<T>,    // RIGHT: any thenable is enough for await
    allowedStatus: T
): Promise<boolean> => {
    try { return (await exportStatus()) === allowedStatus; }
    catch (e) { logError('…denying by default.', e); return false; }
};
```

`vitest` and the dev build accept both versions; only the production package build rejects the first.

### Example B — extract away from the mock trap

Typing `resolveDownloadPermitted(exportStatusThunk, allowedSentinel)` means its **test imports neither `powerbi-visuals-api` nor needs its mock** — only `@deneb-viz/utils/logging` is mocked. The three-branch test (allowed → true, other → false, reject → false) then runs clean in the node env.

### Example C — app-core has no RTL; characterize instead

app-core's vitest runs in the node environment with no `@testing-library/react`. Dep-array and pure-logic fixes are locked with **characterization tests** — a pure model of React's `Object.is`-per-slot recompute/rebind semantics — not by rendering the component. Extract the genuinely-testable core (e.g. `attach/detachSignalListener`, a scale calculator, a scheme predicate) and unit-test that.

## Prevention

- `npm run ci:local` before every PR — non-negotiable; it reproduces the CI job locally including the full type-check and package step.
- When a unit needs a test but its host imports are heavy, **extract a pure helper** (thunk + sentinel, or a leaf predicate module) so the test imports nothing that triggers the ESM trap — and the code is cleaner for it.
- Certification lint gotcha in the same family: `powerbi-visuals/no-http-string` forbids literal `http:` strings — use a regex (`/^https?:$/`) for scheme checks and a scoped `eslint-disable` for a deliberate `http://` test input. This too only fails at the eslint step of the full gate, not in vitest.

## Related

- [docs/solutions/best-practices/type-widening-requires-call-site-audit-2026-04-16.md](./type-widening-requires-call-site-audit-2026-04-16.md) — the sibling "the type-check proves nothing" lesson: there, a green compile hid semantic data loss; here, a green *subset* check hides a type or resolution error the full gate catches. Both say: know exactly what your green signal does and does not prove.
- [docs/solutions/build-errors/webpack-persistent-cache-ghost-export-warnings-2026-05-27.md](../build-errors/webpack-persistent-cache-ghost-export-warnings-2026-05-27.md) — another case where the build toolchain, not the source, produced the surprising signal.
- [docs/solutions/design-patterns/module-init-helpers-must-be-leaf-modules-2026-07-13.md](../design-patterns/module-init-helpers-must-be-leaf-modules-2026-07-13.md) — a companion "green types, red runtime" trap from the same program (a circular-init TDZ the type-check can't see).
- [docs/solutions/design-patterns/usecontext-guard-needs-nullable-default-2026-05-26.md](../design-patterns/usecontext-guard-needs-nullable-default-2026-05-26.md) — the existing write-up of Vitest's `vi.mock` hoisting and the "mock the exact import path, not a re-export" gotcha that Rule 1 generalizes. Reuse its mechanics; this doc adds the Node-22 / gateway-module / `powerbi-visuals-api → {}` layer.
- This doc is the canonical anchor for **node-env vitest with no `@testing-library/react`** — the convention several docs each restate independently: [segmented-fetch-viewer-editor-transition-quirks](../logic-errors/segmented-fetch-viewer-editor-transition-quirks-2026-05-27.md) and [signal-viewer-stale-memo-on-view-replacement](../logic-errors/signal-viewer-stale-memo-on-view-replacement-2026-05-20.md) both use the characterize-with-a-pure-model approach described in Example C.
