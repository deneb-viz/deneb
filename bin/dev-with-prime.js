#!/usr/bin/env node
/**
 * Dev script that primes assets if needed, then starts dev server
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pbivizPath = path.join(__dirname, '..', '.tmp', 'drop', 'pbiviz.json');
const pluginPath = path.join(
    __dirname,
    '..',
    '.tmp',
    'precompile',
    'visualPlugin.ts'
);

// Check if assets exist AND pbiviz.json has resources (not just metadata)
let allExist = fs.existsSync(pbivizPath) && fs.existsSync(pluginPath);

if (allExist) {
    // Verify pbiviz.json has stringResources (means it was fully generated)
    try {
        const pbiviz = JSON.parse(fs.readFileSync(pbivizPath, 'utf8'));
        if (!pbiviz.stringResources || Object.keys(pbiviz.stringResources).length === 0) {
            console.log('⚠ pbiviz.json exists but lacks resources');
            allExist = false;
        }
    } catch (error) {
        console.log('⚠ pbiviz.json is invalid or corrupted');
        allExist = false;
    }
}

if (!allExist) {
    console.log('⚠ Dev assets missing, priming...');
    try {
        execSync('npm run webpack:prime', { stdio: 'inherit' });
        console.log('✓ Assets primed successfully');
    } catch (error) {
        console.error('✗ Failed to prime assets');
        process.exit(1);
    }
} else {
    console.log('✓ Dev assets already exist, skipping prime step');
}

// Now start the dev server
console.log('Starting dev server...');
try {
    execSync('turbo run dev webpack:start --parallel --concurrency=25', {
        stdio: 'inherit'
    });
} catch (error) {
    // User likely pressed Ctrl+C to stop the server
    process.exit(0);
}
