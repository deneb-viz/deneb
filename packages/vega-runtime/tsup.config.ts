import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/lib/embed/index.ts',
        'src/lib/extensibility/index.ts',
        'src/lib/pattern-fill/index.ts'
    ],
    clean: false,
    target: 'es2022',
    format: ['esm'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    minify: false,
    external: [
        'vega',
        'vega-lite',
        'd3-interpolate',
        'powerbi-visuals-api',
        'powerbi-visuals-utils-formattingutils',
        '@deneb-viz/powerbi-compat',
        '@deneb-viz/powerbi-compat/formatting',
        '@deneb-viz/powerbi-compat/theme'
    ]
});
