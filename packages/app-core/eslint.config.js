import { config } from '@deneb-viz/eslint-config/base.js';
import { createBoundariesConfig } from '@deneb-viz/eslint-config/boundaries.js';

/** @type {import("eslint").Linter.Config} */
export default [
    ...config,
    createBoundariesConfig({
        layers: ['app', 'feature', 'components', 'lib', 'state', 'i18n']
    })
];
