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

// tsdown's `loader: { '.png': 'dataurl' }` option (a tsup/esbuild carry-over)
// does not produce data URL output under tsdown 0.22.14, so PNG imports (the
// catalog thumbnails) are inlined via this load-hook plugin instead.
const pngDataUrl = {
    name: 'png-dataurl',
    load(id: string) {
        if (id.endsWith('.png')) {
            const base64 = fs.readFileSync(id).toString('base64');
            return `export default "data:image/png;base64,${base64}";`;
        }
        return null;
    }
};

export default defineConfig((options: Options) => ({
    entry: ['src/index.ts', 'src/editor.ts'],
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
    // Do not inline powerbi-compat and vega-runtime so that single runtime instances are shared.
    // Fluent UI is a peer dependency - consumers provide their own instance.
    deps: {
        // Wildcard subpath imports (e.g. /visual-host, /signals, /theme) are
        // matched with a regex so ALL subpaths are externalized.
        neverBundle: [
            '@deneb-viz/powerbi-compat',
            /^@deneb-viz\/powerbi-compat(\/|$)/,
            '@deneb-viz/vega-runtime',
            /^@deneb-viz\/vega-runtime(\/|$)/,
            '@deneb-viz/vega-react',
            /^@deneb-viz\/vega-react(\/|$)/,
            '@deneb-viz/json-processing',
            /^@deneb-viz\/json-processing(\/|$)/,
            // Monaco - externalized so webpack can tree-shake it from viewer-only builds.
            // Only the editor entry uses monaco at runtime; externalizing prevents esbuild
            // from pulling it into shared chunks that the main entry also depends on.
            /^@monaco-editor\//,
            'monaco-editor',
            /^monaco-editor\//,
            // Fluent UI - treat like React, consumers provide their own
            '@fluentui/react-components',
            '@fluentui/react-icons',
            /^@fluentui\//
        ]
    },
    sourcemap: true,
    outDir: 'dist',
    plugins: [rawWorkerText, pngDataUrl],
    ...options
}));
