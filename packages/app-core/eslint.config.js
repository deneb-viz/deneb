import { config } from '@deneb-viz/eslint-config/base.js';
import { createBoundariesConfig } from '@deneb-viz/eslint-config/boundaries.js';

/** @type {import("eslint").Linter.Config} */
export default [
    ...config,
    createBoundariesConfig({
        entry: 'src/(index|editor).ts',
        layers: [
            'app',
            'feature',
            'components',
            'lib',
            'state',
            'context',
            'i18n',
            'catalog'
        ]
    })
];
