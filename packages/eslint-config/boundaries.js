import boundaries from 'eslint-plugin-boundaries';

/**
 * Shared `eslint-plugin-boundaries` configuration for the layered app
 * packages (`@deneb-viz/app-core`, `@deneb-viz/editor`).
 *
 * Every layered package uses the same layer vocabulary — one folder per
 * layer under `src/`, plus the package entry file — and the same dependency
 * matrix between layers. A package declares only the layers it actually
 * has; the matrix is filtered to those, so a package without (say) a
 * `catalog/` folder never has to mention it.
 *
 * The human-readable form of the matrix lives in
 * `packages/app-core/ARCHITECTURE.md`; this file is the runtime source of
 * truth and wins if the two ever disagree.
 */

/** Folder-rooted layers, keyed by layer name. `entry` is file-rooted and added per package. */
const FOLDER_LAYERS = {
    app: { type: 'app', pattern: 'src/app', mode: 'folder' },
    feature: {
        type: 'feature',
        pattern: 'src/features/*',
        mode: 'folder',
        capture: ['featureName']
    },
    components: { type: 'components', pattern: 'src/components', mode: 'folder' },
    lib: { type: 'lib', pattern: 'src/lib', mode: 'folder' },
    state: { type: 'state', pattern: 'src/state', mode: 'folder' },
    context: { type: 'context', pattern: 'src/context', mode: 'folder' },
    i18n: { type: 'i18n', pattern: 'src/i18n', mode: 'folder' },
    catalog: { type: 'catalog', pattern: 'src/catalog', mode: 'folder' }
};

/**
 * Dependency matrix: for each layer, the layers it may import from
 * (self-imports listed explicitly; anything absent is rejected).
 *
 * Layering model: lib/i18n/catalog are the lowest-level utility layers
 * everyone may depend on. state/context sit above lib (state slices and
 * contexts import from lib for sync, persistence, and constants).
 * features/components/app form the UI composition stack on top.
 */
const ALLOWED_IMPORTS = {
    entry: [
        'entry',
        'app',
        'feature',
        'components',
        'lib',
        'state',
        'context',
        'i18n',
        'catalog'
    ],
    app: [
        'app',
        'feature',
        'components',
        'lib',
        'state',
        'context',
        'i18n',
        'catalog'
    ],
    feature: ['components', 'lib', 'state', 'context', 'i18n', 'catalog'],
    components: ['components', 'lib', 'state', 'context', 'i18n', 'catalog'],
    state: ['state', 'lib', 'context', 'i18n', 'catalog'],
    context: ['context', 'lib', 'state', 'i18n', 'catalog'],
    catalog: ['catalog', 'lib', 'i18n'],
    lib: ['lib', 'state', 'context', 'i18n', 'catalog'],
    i18n: ['i18n']
};

/**
 * Builds the boundaries config block for one package.
 *
 * @param {object} options
 * @param {string} [options.entry='src/index.ts'] Entry-file pattern (the
 * `entry` element, `mode: 'file'`).
 * @param {Array<keyof typeof FOLDER_LAYERS>} options.layers Folder layers
 * present in the package, e.g. `['app', 'feature', 'components', 'lib',
 * 'state', 'i18n']`.
 * @returns {import("eslint").Linter.Config}
 */
export const createBoundariesConfig = ({ entry = 'src/index.ts', layers }) => {
    const unknown = layers.filter((layer) => !(layer in FOLDER_LAYERS));
    if (unknown.length > 0) {
        throw new Error(
            `Unknown boundaries layer(s): ${unknown.join(', ')}. Known: ${Object.keys(FOLDER_LAYERS).join(', ')}.`
        );
    }
    const present = ['entry', ...layers];
    const isPresent = (layer) => present.includes(layer);
    return {
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
                'src/**/*.d.ts'
            ],
            'boundaries/elements': [
                { type: 'entry', pattern: entry, mode: 'file' },
                ...layers.map((layer) => FOLDER_LAYERS[layer])
            ]
        },
        rules: {
            'boundaries/element-types': [
                'error',
                {
                    default: 'disallow',
                    rules: present.map((from) => ({
                        from: [from],
                        allow: ALLOWED_IMPORTS[from].filter(isPresent)
                    }))
                }
            ],
            'boundaries/no-unknown': 'off',
            'boundaries/no-unknown-files': 'off'
        }
    };
};
