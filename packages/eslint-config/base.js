import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import turboPlugin from 'eslint-plugin-turbo';
import tseslint from 'typescript-eslint';
import onlyWarn from 'eslint-plugin-only-warn';
import importPlugin from 'eslint-plugin-import-x';

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
    js.configs.recommended,
    eslintConfigPrettier,
    ...tseslint.configs.recommended,
    {
        plugins: {
            turbo: turboPlugin
        },
        rules: {
            'turbo/no-undeclared-env-vars': 'warn'
        }
    },
    {
        plugins: {
            onlyWarn
        }
    },
    {
        plugins: {
            'import-x': importPlugin
        },
        rules: {
            'import-x/no-cycle': 'warn'
        },
        settings: {
            'import-x/resolver': {
                typescript: true
            }
        }
    },
    {
        ignores: ['dist/**']
    }
];
