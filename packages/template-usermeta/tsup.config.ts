import { defineConfig } from 'tsup';

// We now generate declaration files via a dedicated TypeScript build (tsc --emitDeclarationOnly)
// for faster incremental performance and clearer control. tsup just bundles JS here.
export default defineConfig({
    entry: ['src/index.ts'],
    clean: false,
    target: 'es2022',
    format: ['esm'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    minify: false
});
