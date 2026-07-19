---
title: 'Stale workspace dist after a package watcher dies: committed fixes appear to have no effect'
date: 2026-07-20
category: workflow-issues
module: monorepo
problem_type: workflow_issue
component: development_workflow
severity: medium
symptoms:
    - 'Correct, committed, pushed changes produce "little to no improvement" when smoke-tested in the running visual'
    - 'Webpack dev server rebuilds and reloads, but behavior matches an older commit'
applies_when:
    - 'Smoke-testing changes to any workspace package (app-core, vega-runtime, etc.) through the webpack dev server'
    - 'After an IDE/terminal crash, or any event that may have killed the per-package tsup watchers started by npm run dev'
tags:
    - turbo
    - tsup
    - webpack
    - dev-server
    - stale-build
    - monorepo
---

# Stale workspace dist after a watcher death

## Context

During PR #723 smoke testing, two committed fixes (row-height `size` variant and
`autoFitColumns: false`) were reported as having "little to no improvement" in the running
visual. The fixes were correct — traced through the Fluent library source — which made the
report confusing. The actual cause: the app-core tsup watcher had died with an earlier VS
Code crash, so webpack kept bundling a `packages/app-core/dist` built *before* the fix
commits. The visual was faithfully running old code.

## Guidance

Before debugging why a change "doesn't work" in the running visual, verify the change is
actually IN the built package output:

```bash
# 1. Is dist newer than your last commit?  (mtime check)
node -e "const fs=require('fs');const glob=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?glob(d+'/'+e.name):[d+'/'+e.name]);let n=0;for(const f of glob('packages/app-core/dist'))n=Math.max(n,fs.statSync(f).mtimeMs);console.log(new Date(n).toISOString())"

# 2. Does dist contain a distinctive marker from the new code?
grep -rl "autoFitColumns" packages/app-core/dist/ || echo STALE
```

If stale: `npm run build` in the package (immediate fix), and restart `npm run dev` (per the
repo's own troubleshooting guidance — it clears `.tmp/`, rebuilds all packages, and restarts
every watcher) so the session doesn't hit the same trap again.

## Why This Matters

The failure mode is maximally misleading: the dev server IS rebuilding and reloading (the
webpack watcher is alive), so everything looks healthy — only the upstream package watcher
is dead. Time is then spent debugging correct code. The mtime + marker check takes seconds
and cleanly discriminates "code is wrong" from "build is stale".

## When to Apply

- Any "my change has no effect" report during dev-server smoke testing of workspace-package
  changes — run the check FIRST, before reading code.
- Routinely after IDE or terminal crashes: assume the `npm run dev` watcher set is degraded
  and restart it.

## Examples

From the incident: `packages/app-core/dist` was 20 minutes older than the fix commit and
`grep autoFitColumns dist/` returned nothing — one `npm run build` later, the same visual
session showed both fixes working.
