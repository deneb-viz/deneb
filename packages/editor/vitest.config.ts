import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);
const cacheDir = join(
    dirname(fileURLToPath(import.meta.url)),
    'node_modules',
    '.cache',
    'vitest-prebundle'
);

/**
 * Bundles a CommonJS dependency, with its own dependencies inlined, into one
 * self-contained ESM file that Node can load natively.
 *
 * `powerbi-visuals-utils-formattingutils` is plain CommonJS whose
 * `require('powerbi-visuals-utils-typeutils')` hands Node an ESM-syntax entry
 * with extensionless internal imports, which Node's loader rejects. The chain
 * is reached through `@deneb-viz/powerbi-compat`'s built `formatting` entry,
 * an importer outside this package's root, so Vitest's own `deps.optimizer`
 * output is never substituted for it; a resolve alias applies to every
 * importer Vite processes, whatever its location.
 */
const prebundle = (packageName: string): string => {
    const outfile = join(cacheDir, `${packageName}.mjs`);
    mkdirSync(cacheDir, { recursive: true });
    buildSync({
        entryPoints: [require.resolve(packageName)],
        outfile,
        bundle: true,
        format: 'esm',
        platform: 'node',
        target: 'node22',
        logLevel: 'silent'
    });
    return outfile;
};

export default defineConfig({
    resolve: {
        alias: {
            'powerbi-visuals-utils-formattingutils': prebundle(
                'powerbi-visuals-utils-formattingutils'
            )
        }
    },
    test: {
        // Editor tests import `@deneb-viz/app-core`, whose viewer modules
        // touch `window` at load time, so every test file runs under jsdom
        // rather than opting in per file.
        environment: 'jsdom',
        benchmark: {
            include: ['src/**/__bench__/**/*.bench.ts'],
            reporters: ['default'],
            outputJson: 'benchmarks/results/editor.json',
            includeSamples: false
        }
    }
});
