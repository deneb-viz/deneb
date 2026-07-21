---
title: "Webpack persistent cache emits ghost export warnings after branch switch; dev broken on clean clone"
date: 2026-05-27
category: docs/solutions/build-errors/
module: dev-tooling
problem_type: build_error
component: development_workflow
related_components: [tooling]
symptoms:
  - "WARNING in ./src/lib/dataset/processing.ts — `export 'getEncodedFieldName' was not found in './fields'` despite being present in source"
  - Line numbers in the webpack warning do not match current file content — they reference a stale snapshot
  - "`npm run dev` fails on fresh clone: webpack cannot resolve `@deneb-viz/*` imports because `dist/` does not exist"
  - "`.tmp/` cache persists across branch switches, accumulating drift that produces incorrect cross-module export analysis"
root_cause: config_error
resolution_type: workflow_improvement
severity: high
tags: [webpack, persistent-cache, monorepo, dev-startup, clean-clone, ghost-warning, turbo, worktree]
---

# Webpack persistent cache emits ghost export warnings after branch switch; dev broken on clean clone

## Problem

`npm run dev` on a clean worktree emitted ghost webpack export warnings (e.g. `export 'getEncodedFieldName' was not found in './fields'`) even though the export exists at [`src/lib/dataset/fields.ts:82`](../../../src/lib/dataset/fields.ts#L82). CI never caught it because CI always runs on fresh clones. Two related issues compounded the problem: workspace packages were not built before webpack ran, so fresh clones couldn't resolve `@deneb-viz/*` imports at all; and `.tmp/` accumulated stale cache state across sessions with no automatic reset.

## Symptoms

- Webpack warned: `export 'getEncodedFieldName' (imported as 'getEncodedFieldName') was not found in './fields' (possible exports: getDatumFieldMetadataFromDataView, ...)` — the export was present in source but missing from the cached module graph.
- Warning line numbers (169, 224, 257, 309, 315, 325) did not match current line numbers in [`src/lib/dataset/processing.ts`](../../../src/lib/dataset/processing.ts) (actual usages at 276, 346, 382, 434, 443, 456) — confirming the warning derived from a stale cached module snapshot, not current source.
- Deleting `.tmp/webpack-cache` and re-running `npm run webpack:build` made all warnings vanish; a second build was also clean.
- On a fresh clone, `npm run dev` failed because workspace `dist/` directories did not exist — `webpack:prime` had no `dependsOn: ["^build"]` and ran before packages were built.
- `.tmp/` persisted indefinitely between dev sessions, requiring manual `rm -rf .tmp` to recover from drift.

## What Didn't Work

- Re-reading [`src/lib/dataset/processing.ts`](../../../src/lib/dataset/processing.ts) — the source was correct; the bug was not in the file.
- Checking the compiled `dist/` of `@deneb-viz/data-core` for the `getEncodedFieldName` export — the dist was also correct; the import target was fine.
- Investigating TypeScript re-export semantics (`isolatedModules`, `verbatimModuleSyntax`) — both are off; the `export { getEncodedFieldName }` pattern at [`fields.ts:82`](../../../src/lib/dataset/fields.ts#L82) is standard and compiles correctly.
- Searching for a webpack config bug that might suppress the re-export — the config was fine; the problem was cached state, not configuration.

## Solution

Rewrote [`bin/dev-with-prime.js`](../../../bin/dev-with-prime.js) to:
1. Clear `.tmp/` at startup (no `existsSync` guard needed — `fs.rmSync` with `force: true` no-ops on ENOENT)
2. Build workspace packages via `npm run build:package` before webpack runs (turbo's cache makes this ~190ms when packages are unchanged)
3. Prime dev assets via `npm run webpack:prime`
4. Start the dev server via `npx --no turbo run dev webpack:start --parallel --concurrency=25`, with signal-aware exit handling

```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const tmpDir = path.join(repoRoot, '.tmp');

// Distinguish clean shutdown (Ctrl+C, SIGTERM) from a real failure so outer
// wrappers (CI gates, agent harnesses) see the genuine exit code.
// POSIX: SIGINT/SIGTERM set error.signal, or the shell propagates 130.
// Windows: Ctrl+C surfaces as status 3221225786 (0xC000013A — STATUS_CONTROL_C_EXIT).
const isCleanShutdown = (error) =>
    error.signal === 'SIGINT' ||
    error.signal === 'SIGTERM' ||
    error.status === 130 ||
    error.status === 3221225786;

const run = (label, command) => {
    console.log(`\n→ ${label}`);
    try {
        execSync(command, { stdio: 'inherit', cwd: repoRoot });
    } catch (error) {
        if (isCleanShutdown(error)) {
            process.exit(0);
        }
        console.error(`✗ ${label} failed`);
        if (error.message) console.error(error.message);
        process.exit(error.status ?? 1);
    }
};

// 1. Reset .tmp for a predictable dev start.
console.log('🧹 Resetting .tmp for a predictable dev start...');
try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
} catch (error) {
    console.error('✗ Failed to clear .tmp — close any processes using files inside it and retry');
    console.error(error.message);
    process.exit(1);
}

// 2. Build workspace packages so webpack can resolve @deneb-viz/* imports.
run('Building workspace packages', 'npm run build:package');

// 3. Prime dev assets.
run('Priming dev assets', 'npm run webpack:prime');
console.log('✓ Assets primed successfully');

// 4. Start the dev server alongside package watchers.
console.log('\n→ Starting dev server...');
try {
    execSync(
        'npx --no turbo run dev webpack:start --parallel --concurrency=25',
        { stdio: 'inherit', cwd: repoRoot }
    );
} catch (error) {
    if (isCleanShutdown(error)) {
        process.exit(0);
    }
    console.error('✗ Dev server exited with error');
    if (error.message) console.error(error.message);
    process.exit(error.status ?? 1);
}
```

Two stale `auto-primes assets` references in [`CLAUDE.md`](../../../CLAUDE.md) (L54 First-Time Setup, L244 Quick Start) were updated to accurately describe the new startup sequence.

Trade-off accepted: every dev start does a fresh first build (~22s when turbo cache cold, ~5s when warm) rather than skipping when cached assets exist. In-session rebuilds remain ~1–2s via webpack's in-memory cache.

## Why This Works

**(a) Clearing `.tmp/` defeats stale-cache ghost warnings.** Webpack's filesystem cache at `.tmp/webpack-cache` stores the full module graph including cross-module export analysis. The `buildDependencies: { config: [__filename] }` setting at [`webpack.dev.config.js:30-36`](../../../webpack.dev.config.js#L30-L36) invalidates the cache when the webpack config changes, but not when workspace package source changes in ways that alter re-export topology. Deleting `.tmp/` at startup guarantees webpack rebuilds the module graph from scratch each dev session, eliminating the class of stale-cache warnings entirely.

**(b) Running `build:package` before `webpack:prime` is necessary on fresh clones.** All workspace packages in `packages/` declare `main` and `exports` pointing at `dist/`. If `dist/` does not exist, webpack's resolver cannot find `@deneb-viz/*` imports and fails at bundle time. `webpack:prime` is defined as `webpack --env generateResources=true` with no `dependsOn: ["^build"]` in [`turbo.json`](../../../turbo.json), so it has no mechanism to trigger package builds. Starting with `npm run build:package` (which turbo orchestrates with full `dependsOn` awareness) ensures all `dist/` outputs exist before webpack runs.

**(c) Signal-aware exit codes matter for outer wrappers.** When a developer presses Ctrl+C to stop the dev server, `execSync` throws with `error.signal === 'SIGINT'` (POSIX) or `error.status === 3221225786` (Windows `STATUS_CONTROL_C_EXIT`). Without the `isCleanShutdown` guard, the script would call `process.exit(1)`, which CI systems and agent harnesses interpret as a build failure — triggering alerts, retries, or branch protection blocks. Exiting 0 for clean shutdowns preserves the correct signal: the dev session ended normally, not in error.

## Prevention

- **The smoking gun for stale-cache ghost warnings is line numbers in the warning that don't match the current file.** When an agent or developer sees this pattern, the first action is: delete `.tmp/webpack-cache` (or all of `.tmp/`) and re-run. Do not spend time reading the source file or the dist of the imported package.
- **In a monorepo where workspace packages declare `main`/`exports` pointing at `dist/`, `dist/` must exist before webpack runs.** Never rely on `--parallel` turbo execution for build ordering — `--parallel` ignores `dependsOn` and does not guarantee ordering. Use an explicit sequential build step before starting the webpack server.
- **Always invoke turbo via `npx --no turbo` in scripts that may be called outside an `npm run` context.** `npx --no` prevents downloading a new version and uses the project-local binary; bare `turbo` is PATH-dependent and will fail if turbo is not globally installed (e.g. when the script is invoked directly via `node bin/dev-with-prime.js` from an IDE run config).
- **For dev scripts that wrap long-running processes, distinguish Ctrl+C / SIGTERM (exit 0) from genuine failures (propagate the non-zero exit code).** On POSIX, check `error.signal`; on Windows, check for status `3221225786` (`0xC000013A`). CI systems and agent harnesses treat any non-zero exit as a failure.
- **Webpack's `cache: { type: 'filesystem', buildDependencies: { config: [...] } }` only invalidates the cache when the listed config files change.** It does not detect all cross-module export topology changes — particularly re-exports from workspace packages that were rebuilt externally. In multi-branch workflows, either accept residual stale-cache risk between branch switches or adopt a per-session `.tmp/` wipe.

## Related Issues

None — this is the first entry in `docs/solutions/` on monorepo dev-startup reliability and webpack persistent-cache hygiene.
