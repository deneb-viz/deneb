import { createRequire } from 'node:module';
import { config } from '@deneb-viz/eslint-config/base.js';
import { createBoundariesConfig } from '@deneb-viz/eslint-config/boundaries.js';

const require = createRequire(import.meta.url);
const powerbiVisualsConfigs = require('eslint-plugin-powerbi-visuals');

/** @type {import("eslint").Linter.Config} */
export default [
    ...config,
    powerbiVisualsConfigs.configs.recommended,
    createBoundariesConfig({
        layers: ['app', 'feature', 'components', 'lib', 'state', 'i18n']
    })
];
