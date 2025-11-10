import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/lib/dom.ts', 'src/lib/worker.ts'],
    clean: true,
    target: 'es2022',
    format: ['esm'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    minify: false
});
