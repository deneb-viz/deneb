import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/lib/base64.ts',
        'src/lib/crypto.ts',
        'src/lib/dom.ts',
        'src/lib/inspection.ts',
        'src/lib/object.ts',
        'src/lib/type-conversion.ts',
        'src/lib/versioning.ts',
        'src/lib/worker.ts'
    ],
    clean: false,
    target: 'es2022',
    format: ['esm'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    minify: false
});
