#!/usr/bin/env node
/**
 * Runs eslint for a workspace package by resolving the eslint binary via
 * Node's module resolution (require.resolve) instead of relying on
 * node_modules/.bin symlinks, which npm doesn't create reliably in
 * workspace setups.
 *
 * Usage in workspace package.json scripts:
 *   "eslint": "node ../../bin/workspace-eslint.js"
 */

const { execFileSync } = require('child_process');
const path = require('path');

// eslint v9 doesn't export ./bin/eslint.js in its exports map, so we
// resolve the package.json (which IS exported) and derive the bin path.
const eslintPkgPath = require.resolve('eslint/package.json');
const eslintPath = path.join(path.dirname(eslintPkgPath), 'bin', 'eslint.js');

try {
    execFileSync(process.execPath, [eslintPath, '.'], {
        stdio: 'inherit',
        cwd: process.cwd()
    });
} catch (e) {
    process.exit(e.status || 1);
}
