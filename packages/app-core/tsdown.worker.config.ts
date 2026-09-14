import { defineConfig, type UserConfig } from 'tsdown';

// Shared options for every worker entry - build as IIFE and wrap in module export.
// Rolldown refuses IIFE output for code-splitting (shared-chunk) builds, and
// refuses to disable code-splitting when a config has multiple entries, so
// each worker gets its own single-entry config object below rather than one
// config with a multi-entry `entry` map.
const workerBase: Omit<UserConfig, 'entry'> = {
    format: ['iife'], // IIFE for worker execution
    platform: 'browser',
    outDir: 'dist/worker',
    // Do not clean dist/ - the sibling package build (build:package) writes
    // to the same dist root and reads these worker outputs back in.
    clean: false,
    tsconfig: 'tsconfig.worker.json',
    minify: true,
    treeshake: true,
    sourcemap: true,
    // tsdown auto-externalizes packages listed in this package's own
    // "dependencies" (matching tsup's behavior for the main ESM build).
    // Workers are loaded as raw IIFE text and eval'd with no module
    // resolution, so any workspace/npm package they use at runtime must be
    // force-bundled instead of left as a dangling global reference (or, for
    // monaco-editor, a `require()` call that doesn't exist in a Worker).
    // Shared across both worker entries below - monaco-editor is unreachable
    // from the data-viewer worker's graph, so listing it here is a no-op for
    // that entry and only affects json-language.
    deps: {
        alwaysBundle: [/^@deneb-viz\/utils(\/|$)/, /^monaco-editor(\/|$)/]
    },
    outputOptions: {
        entryFileNames: '[name].worker.js',
        codeSplitting: false
    }
};

export default defineConfig(() => [
    // Web worker entry points
    {
        entry: {
            'data-viewer':
                'src/features/debug-area/workers/data-viewer.worker.ts'
        },
        ...workerBase
    },
    {
        entry: {
            'json-language': 'src/lib/monaco/workers/json.worker.ts'
        },
        ...workerBase
    }
]);
