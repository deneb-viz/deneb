/** @type {import('jest').Config} */
module.exports = {
    maxWorkers: 2,
    roots: ['<rootDir>'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    modulePathIgnorePatterns: [
        '<rootDir>/test/__fixtures__',
        '<rootDir>/node_modules',
        '<rootDir>/dist'
    ],
    moduleNameMapper: {
        '@deneb-viz/template-usermeta-schema':
            '<rootDir>/../template-usermeta-schema/dist/deneb-template-usermeta.json',
        // Not ideal, mitigates issues with powerbi-visuals-utils-formattingmodel import
        '@deneb-viz/integration-powerbi':
            '<rootDir>/../integration-powerbi/dist/index.cjs',
        '@deneb-viz/(.*)': '<rootDir>/../$1/src'
    },
    preset: 'ts-jest',
    collectCoverage: true
};
