import { defineConfig, type Options } from 'tsup';
import fs from 'fs';

export default defineConfig((options: Options) => ({
    entryPoints: ['src/index.ts'],
    dts: true,
    format: ['esm'],
    define: {
        global: 'globalThis'
    },
    // Do not inline powerbi-compat and vega-runtime so that single runtime instances are shared.
    // Fluent UI is a peer dependency - consumers provide their own instance.
    external: [
        // Wildcard ensures ALL subpath imports (e.g. /visual-host, /signals, /theme) are externalized.
        '@deneb-viz/powerbi-compat',
        '@deneb-viz/powerbi-compat/*',
        '@deneb-viz/vega-runtime',
        '@deneb-viz/vega-runtime/*',
        '@deneb-viz/json-processing',
        '@deneb-viz/json-processing/*',
        // Fluent UI - treat like React, consumers provide their own
        '@fluentui/react-components',
        '@fluentui/react-icons',
        /^@fluentui\//
    ],
    sourcemap: true,
    splitting: false,
    outDir: 'dist',
    loader: { '.png': 'dataurl' },
    esbuildPlugins: [
        {
            // Ensure that workers are loaded as raw files.
            name: 'raw',
            setup(build) {
                build.onLoad(
                    { filter: /[\\/]worker[\\/].*\.worker\.js$/ },
                    (args) => {
                        return {
                            contents: fs.readFileSync(args.path, 'utf8'),
                            loader: 'text'
                        };
                    }
                );
            }
        }
    ],
    ...options
}));
