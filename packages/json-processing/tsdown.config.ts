import { defineConfig } from 'tsdown';
import fs from 'fs';

// Import built worker JS as a raw string (the esbuild version used the
// 'text' loader). Matches dist/worker/*.worker.js files only.
const rawWorkerText = {
    name: 'raw-worker-text',
    load(id: string) {
        if (/[\\/]worker[\\/].*\.worker\.js$/.test(id)) {
            return `export default ${JSON.stringify(
                fs.readFileSync(id, 'utf8')
            )};`;
        }
        return null;
    }
};

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/lib/field-tracking/index.ts',
        'src/lib/spec-processing/index.ts',
        'src/lib/template-processing/index.ts'
    ],
    clean: false,
    target: 'es2022',
    format: ['esm'],
    // tsdown's `fixedExtension` defaults to true for platform "node" (the
    // default platform), which forces .mjs/.d.mts output regardless of the
    // package's "type": "module". The exports map and consumers (webpack)
    // expect the original .js/.d.ts contract, so pin it off explicitly.
    fixedExtension: false,
    dts: true,
    sourcemap: true,
    treeshake: true,
    minify: false,
    // Ensure shared runtime instance; avoid bundling peer dependencies.
    deps: {
        neverBundle: [
            '@deneb-viz/powerbi-compat',
            /^@deneb-viz\/powerbi-compat(\/|$)/,
            '@deneb-viz/vega-runtime',
            /^@deneb-viz\/vega-runtime(\/|$)/
        ]
    },
    plugins: [rawWorkerText]
});
