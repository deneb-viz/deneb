import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/__tests__/**',
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
                'src/**/types.ts',
                'src/**/index.ts'
            ],
            thresholds: {
                // Global thresholds for new code (≥90% for Phase 1 additions)
                // Existing modules (extensibility, view, pattern-fill) not yet covered
                'src/lib/signals/**/*.ts': {
                    lines: 90,
                    functions: 80,
                    branches: 90,
                    statements: 90
                },
                'src/lib/spec-processing/**/*.ts': {
                    lines: 90,
                    functions: 90,
                    branches: 90,
                    statements: 90
                }
            }
        }
    }
});
