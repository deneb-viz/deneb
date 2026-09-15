import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Editor tests import `@deneb-viz/app-core` (its built entry), whose
        // viewer modules touch `window` at load time, so every test file
        // runs under jsdom rather than opting in per file.
        environment: 'jsdom',
        deps: {
            optimizer: {
                ssr: {
                    enabled: true,
                    // The powerbi-visuals-utils packages ship an ESM entry
                    // (`main`/`module`: lib/index.js, no `exports` map, no
                    // `type: module`) whose internal imports are
                    // extensionless. When vite-node externalizes them
                    // (observed on Windows; Linux CI inlines them), Node's
                    // native ESM resolution fails with "Cannot find module
                    // .../extensions/arrayExtensions". Pre-bundling them via
                    // esbuild resolves the extensionless imports at bundle
                    // time. `server.deps.inline` does NOT fix this — the
                    // import escapes vite's module graph before matching.
                    include: [
                        'powerbi-visuals-utils-formattingutils',
                        'powerbi-visuals-utils-typeutils',
                        'powerbi-visuals-utils-dataviewutils'
                    ]
                }
            }
        },
        benchmark: {
            include: ['src/**/__bench__/**/*.bench.ts'],
            reporters: ['default'],
            outputJson: 'benchmarks/results/editor.json',
            includeSamples: false
        }
    }
});
