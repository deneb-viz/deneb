import { defineConfig } from 'tsdown';

export default defineConfig(() => [
    // Web worker entry points - build as IIFE and wrap in module export
    {
        entry: {
            'spec-processing':
                'src/lib/spec-processing/workers/spec-processing.worker.ts'
        },
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
        // The worker is loaded as raw IIFE text and eval'd with no module
        // resolution, so every dependency it uses at runtime must be
        // force-bundled instead of left as a dangling global reference.
        deps: {
            alwaysBundle: [
                /^@deneb-viz\/utils(\/|$)/,
                /^@deneb-viz\/data-core(\/|$)/,
                'jsonc-parser',
                'vega-expression',
                'mergician'
            ]
        },
        outputOptions: {
            entryFileNames: '[name].worker.js',
            // A fully self-contained IIFE - Rolldown refuses IIFE output for
            // code-splitting (shared-chunk) builds.
            codeSplitting: false
        }
    }
]);
