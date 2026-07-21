import { config } from '@deneb-viz/eslint-config/base.js';
import boundaries from 'eslint-plugin-boundaries';

/** @type {import("eslint").Linter.Config} */
export default [
    ...config,
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: { boundaries },
        settings: {
            'import/resolver': {
                typescript: { project: './tsconfig.json' },
                node: true
            },
            'boundaries/root-path': '.',
            'boundaries/include': ['src/**/*.{ts,tsx}'],
            'boundaries/ignore': [
                'src/**/__tests__/**',
                'src/**/*.test.ts',
                'src/**/*.test.tsx',
                'src/**/__bench__/**',
                'src/**/*.bench.ts',
                'src/worker.types.d.ts'
            ],
            'boundaries/elements': [
                { type: 'entry', pattern: 'src/(index|editor).ts', mode: 'file' },
                { type: 'app', pattern: 'src/app', mode: 'folder' },
                { type: 'feature', pattern: 'src/features/*', mode: 'folder', capture: ['featureName'] },
                { type: 'components', pattern: 'src/components', mode: 'folder' },
                { type: 'lib', pattern: 'src/lib', mode: 'folder' },
                { type: 'state', pattern: 'src/state', mode: 'folder' },
                { type: 'context', pattern: 'src/context', mode: 'folder' },
                { type: 'i18n', pattern: 'src/i18n', mode: 'folder' },
                { type: 'catalog', pattern: 'src/catalog', mode: 'folder' }
            ]
        },
        rules: {
            // Layering model: lib/i18n/catalog are the lowest-level utility layers
            // everyone may depend on. state/context sit above lib (state slices and
            // contexts import from lib for sync, persistence, and constants).
            // features/components/app form the UI composition stack on top.
            'boundaries/element-types': ['error', {
                default: 'disallow',
                rules: [
                    { from: ['entry'], allow: ['entry', 'app', 'feature', 'components', 'lib', 'state', 'context', 'i18n', 'catalog'] },
                    { from: ['app'], allow: ['app', 'feature', 'components', 'lib', 'state', 'context', 'i18n', 'catalog'] },
                    { from: ['feature'], allow: ['components', 'lib', 'state', 'context', 'i18n', 'catalog'] },
                    { from: ['components'], allow: ['components', 'lib', 'state', 'context', 'i18n', 'catalog'] },
                    { from: ['state'], allow: ['state', 'lib', 'context', 'i18n', 'catalog'] },
                    { from: ['context'], allow: ['context', 'lib', 'state', 'i18n', 'catalog'] },
                    { from: ['catalog'], allow: ['catalog', 'lib', 'i18n'] },
                    { from: ['lib'], allow: ['lib', 'state', 'context', 'i18n', 'catalog'] },
                    { from: ['i18n'], allow: ['i18n'] }
                ]
            }],
            'boundaries/no-unknown': 'off',
            'boundaries/no-unknown-files': 'off'
        }
    }
];
