---
title: 'vitest on Windows externalizes powerbi-visuals-utils packages, breaking extensionless ESM imports (masked by turbo cache)'
date: 2026-07-20
category: test-failures
module: app-core
problem_type: test_failure
component: testing_framework
severity: high
symptoms:
    - 'Error: Cannot find module ...\powerbi-visuals-utils-typeutils\lib\extensions\arrayExtensions imported from ...\lib\index.js'
    - 'Suite fails at collection ("no tests") on Windows while Linux CI is green on the identical commit'
    - 'Local ci:local passes on some runs and fails on others with no code change (turbo test-task cache hits vs misses)'
root_cause: config_error
resolution_type: config_change
related_components:
    - vega-runtime
    - powerbi-compat
tags:
    - vitest
    - vite-node
    - esm
    - externalization
    - powerbi-visuals-utils
    - turbo-cache
    - windows
---

# vitest externalizes powerbi-visuals-utils on Windows, breaking extensionless ESM

## Problem

`schema-service.test.ts` (app-core) failed at collection on Windows with an ESM resolution
error inside `powerbi-visuals-utils-typeutils`, while Linux CI passed the identical commit.
The failure predated the branch under test and had been invisible for months.

## Symptoms

`Cannot find module '...\powerbi-visuals-utils-typeutils\lib\extensions\arrayExtensions'
imported from '...\lib\index.js'` — the package's own internal, extensionless relative
import failing under native Node ESM resolution rules.

## What Didn't Work

- **Blaming the branch under test**: a clean-room clone of `next` + fresh `npm ci` + package
  build reproduced the failure — it was pre-existing. (Caution from the same investigation:
  a clean-room probe is only valid after `npm run build` — without built workspace `dist/`
  folders the test fails earlier with a *different* module-resolution error that is easy to
  misread as the same one.)
- **Blaming Node 24 vs CI's Node 22**: failed identically under both (verified via
  `npx -p node@22 -c "node .../vitest.mjs run ..."`).
- **`server.deps.inline`** (including `inline: true`): no effect. The import escapes vite's
  module graph before the inline list is consulted.
- **Dependency-tree theories** (styled-components removal changing hoisting): reinstalling
  the removed package changed nothing.

## Solution

`deps.optimizer.ssr` in the package's vitest config — esbuild pre-bundles the packages,
resolving the extensionless imports at bundle time:

```ts
// packages/app-core/vitest.config.ts
test: {
    deps: {
        optimizer: {
            ssr: {
                enabled: true,
                include: [
                    'powerbi-visuals-utils-formattingutils',
                    'powerbi-visuals-utils-typeutils',
                    'powerbi-visuals-utils-dataviewutils'
                ]
            }
        }
    }
}
```

Shipped in PR #723 (`a12120ee`); verified 12/12 in the clean-room clone.

## Why This Works

The `powerbi-visuals-utils-*` packages ship `main`/`module` pointing at ESM-syntax
`lib/index.js` with **extensionless** internal imports, no `exports` map, and no
`type: module` — a shape that only works when a bundler transforms it. On Windows,
vite-node externalizes these packages (Linux inlines them), handing them to Node's native
ESM loader, where extensionless relative imports are illegal. esbuild pre-bundling
(`deps.optimizer.ssr`) rewrites the whole package into one resolved bundle before vite-node
ever externalizes anything — which is why it works when `server.deps.inline` cannot.

## Prevention

- **Turbo's cached `test` task masks environment-dependent failures**: `npm run test` is
  `turbo run test` with caching, so a broken test can stay green locally for months until a
  source change busts the cache. When a test failure "appears from nowhere", suspect a cache
  miss exposing an old problem — bisect the environment, not just the diff.
- Diagnose externalization failures empirically with a clean-room clone
  (`git clone --local`, `npm ci`, `npm run build`, run the one failing test) before
  theorizing; three plausible theories (branch, Node version, hoisting) all died on
  clean-room evidence here.
- If another package starts consuming `powerbi-visuals-utils-*` directly in its tests, it
  needs the same optimizer block in its own vitest config.
