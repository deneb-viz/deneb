const powerbiVisualsConfigs = require('eslint-plugin-powerbi-visuals');

module.exports = [
    powerbiVisualsConfigs.configs.recommended,
    {
        ignores: ['node_modules/**', 'dist/**', '.tmp/**', 'bin/**']
    }
];
