import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['benchmarks/__tests__/**/*.test.mjs']
    }
});
