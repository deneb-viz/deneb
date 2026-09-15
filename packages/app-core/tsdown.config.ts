import { defineConfig, type Options } from 'tsdown';

export default defineConfig((options: Options) => ({
    entry: ['src/index.ts'],
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
            // Fluent UI - treat like React, consumers provide their own
            '@fluentui/react-components',
            '@fluentui/react-icons',
            /^@fluentui\//
        ]
    },
    sourcemap: true,
    outDir: 'dist',
    ...options
}));
