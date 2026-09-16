import { defineConfig, type Options } from 'tsdown';
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

export default defineConfig((options: Options) => ({
    entry: ['src/index.ts'],
    // Do not clean dist/ - build:worker runs first and this build reads its
    // output (dist/worker/*.worker.js) via the rawWorkerText plugin below.
    clean: false,
    dts: true,
    format: ['esm'],
    // tsdown's `fixedExtension` defaults to true for platform "node" (the
    // default platform), which forces .mjs/.d.mts output regardless of the
    // package's "type": "module". The exports map and consumers (webpack)
    // expect the original .js/.d.ts contract, so pin it off explicitly.
    fixedExtension: false,
    define: {
        global: 'globalThis'
    },
    // Never inline the packages that must stay single runtime instances
    // (app-core owns the store; powerbi-compat, vega-runtime, vega-react
    // and json-processing are shared with it). Fluent UI and Monaco are
    // provided by the consumer.
    deps: {
        // Wildcard subpath imports are matched with a regex so ALL
        // subpaths are externalized.
        neverBundle: [
            '@deneb-viz/app-core',
            /^@deneb-viz\/app-core(\/|$)/,
            '@deneb-viz/powerbi-compat',
            /^@deneb-viz\/powerbi-compat(\/|$)/,
            '@deneb-viz/vega-runtime',
            /^@deneb-viz\/vega-runtime(\/|$)/,
            '@deneb-viz/vega-react',
            /^@deneb-viz\/vega-react(\/|$)/,
            '@deneb-viz/json-processing',
            /^@deneb-viz\/json-processing(\/|$)/,
            /^@monaco-editor\//,
            'monaco-editor',
            /^monaco-editor\//,
            '@fluentui/react-components',
            '@fluentui/react-icons',
            /^@fluentui\//
        ]
    },
    sourcemap: true,
    outDir: 'dist',
    plugins: [rawWorkerText],
    ...options
}));
