import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/lib/data/index.ts',
        'src/lib/datum/index.ts',
        'src/lib/field/index.ts'
    ],
    clean: false,
    target: 'es2022',
    format: ['esm'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    minify: false,
    splitting: false
});
