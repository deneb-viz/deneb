import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        benchmark: {
            include: ['src/**/__bench__/**/*.bench.ts'],
            reporters: ['default'],
            outputJson: 'benchmarks/results/app-core.json',
            includeSamples: false
        }
    }
});
