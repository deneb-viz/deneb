const { resolve } = require('node:path');

const project = resolve(process.cwd(), 'tsconfig.json');

/** @type {import("eslint").Linter.Config} */
module.exports = {
    extends: [
        'eslint:recommended',
        'prettier',
        'eslint-config-turbo',
        'plugin:@typescript-eslint/recommended'
    ],
    plugins: ['only-warn'],
    globals: {
        React: true,
        JSX: true
    },
    env: {
        node: true
    },
    settings: {
        'import/resolver': {
            typescript: {
                project
            }
        }
    },
    ignorePatterns: [
        // Ignore dotfiles
        '.*.js',
        'node_modules/',
        'dist/',
        'coverage/',
        'bin/'
    ],
    overrides: [
        {
            files: ['*.js?(x)', '*.ts?(x)']
        }
    ],
    rules: {
        'no-unused-vars': 'off'
    }
};
