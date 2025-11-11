import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/lib/formatting/index.ts',
        'src/lib/interactivity/index.ts',
        'src/lib/theme/index.ts'
    ],
    clean: true,
    target: 'es2022',
    format: ['esm'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    minify: false
});
