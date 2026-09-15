import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    // Resolve app-core to its source entry under test, the way app-core's
    // own tests see it, rather than through the built package.
    resolve: {
        alias: {
            '@deneb-viz/app-core': fileURLToPath(
                new URL('../app-core/src/index.ts', import.meta.url)
            )
        }
    },
    test: {
        // Editor tests reach app-core's viewer modules, which touch `window`
        // at load time, so every test file runs under jsdom rather than
        // opting in per file.
        environment: 'jsdom',
        benchmark: {
            include: ['src/**/__bench__/**/*.bench.ts'],
            reporters: ['default'],
            outputJson: 'benchmarks/results/editor.json',
            includeSamples: false
        }
    }
});
