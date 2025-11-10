import { defineConfig } from 'tsup';

export default defineConfig(() => [
    // Web worker entry points - build as IIFE and wrap in module export
    {
        entry: {
            'json-language': 'src/components/code-editor/workers/json.worker.ts'
        },
        format: ['iife'], // IIFE for worker execution
        platform: 'browser',
        outDir: 'dist/worker',
        tsconfig: 'tsconfig.worker.json',
        minify: true,
        treeshake: true,
        sourcemap: true,
        outExtension: () => ({ js: '.worker.js' })
    }
]);
