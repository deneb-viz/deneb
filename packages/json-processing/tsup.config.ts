import { defineConfig } from 'tsup';
import fs from 'fs';

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
    dts: true,
    sourcemap: true,
    treeshake: true,
    minify: false,
    splitting: false,
    // Ensure shared runtime instance; avoid bundling peer dependencies.
    external: [
        '@deneb-viz/powerbi-compat',
        '@deneb-viz/powerbi-compat/*',
        '@deneb-viz/vega-runtime',
        '@deneb-viz/vega-runtime/*'
    ],
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
    ]
});
