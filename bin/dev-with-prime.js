#!/usr/bin/env node
/**
 * Dev script that ensures a predictable starting state for `npm run dev`:
 *
 *   1. Clears `.tmp/` so each session starts free of stale webpack persistent
 *      cache, stale `.tmp/precompile` / `.tmp/drop` assets, and any leftover
 *      state from previous branches.
 *   2. Builds the workspace packages so webpack can resolve `@deneb-viz/*`
 *      imports during the prime step (workspace exports point at `dist/`).
 *      Turbo's task cache makes this near-instant when nothing has changed.
 *   3. Primes dev assets (`.tmp/precompile/visualPlugin.ts` and
 *      `.tmp/drop/pbiviz.json`).
 *   4. Starts the dev server alongside the package watchers.
 *
 * The trade-off for clearing `.tmp/` is a ~22s first build per session
 * versus the unpredictable warnings/errors that result from stale cache
 * (e.g. cross-branch webpack cache reporting missing re-exports that exist
 * in the current source).
 */

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

// 1. Reset .tmp for a predictable dev start. rmSync with force:true no-ops
//    on ENOENT, so no existsSync guard is needed.
console.log('🧹 Resetting .tmp for a predictable dev start...');
try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
} catch (error) {
    console.error(
        '✗ Failed to clear .tmp — close any processes using files inside it and retry'
    );
    console.error(error.message);
    process.exit(1);
}

// 2. Build workspace packages so webpack can resolve @deneb-viz/* imports.
//    turbo's cache makes this fast (~1-2s) when packages are unchanged.
run('Building workspace packages', 'npm run build:package');

// 3. Prime dev assets.
run('Priming dev assets', 'npm run webpack:prime');
console.log('✓ Assets primed successfully');

// 4. Start the dev server alongside package watchers. `npx --no` resolves
//    `turbo` through node_modules/.bin regardless of whether the script was
//    invoked via `npm run dev` (PATH set) or directly (PATH not set).
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
