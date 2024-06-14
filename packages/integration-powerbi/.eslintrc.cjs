/** @type {import("eslint").Linter.Config} */
module.exports = {
    root: true,
    extends: ['@deneb-viz/eslint-config/library.js'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module'
    },
    env: {
        jest: true
    }
};
