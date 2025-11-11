import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/lib/field-tracking/index.ts'],
    clean: true,
    target: 'es2022',
    format: ['esm'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    minify: false
});
