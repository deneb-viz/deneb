#!/usr/bin/env node
/**
 * Runs the same checks as the CI workflow locally, using .env.ci values.
 * Backs up .env before overwriting and restores it on completion.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
const envCiPath = path.join(root, '.env.ci');
const envBackupPath = path.join(root, '.env.backup');

const steps = [
    { name: 'Build packages', cmd: 'npm run build' },
    {
        name: 'Check Package Versions are in Sync',
        cmd: 'npm run validate-packages-sync'
    },
    {
        name: 'Validate Current Configuration',
        cmd: 'npm run validate-config-for-commit'
    },
    { name: 'Linting Checks', cmd: 'npm run eslint' },
    { name: 'Prettier Checks', cmd: 'npm run prettier-check' },
    { name: 'Tests', cmd: 'npm run test' },
    {
        name: 'Confirm pbiviz package (AppSource Version)',
        cmd: 'npm run package'
    }
];

function log(msg) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${msg}`);
    console.log('='.repeat(60));
}

function swapEnv() {
    if (fs.existsSync(envPath)) {
        fs.copyFileSync(envPath, envBackupPath);
    }
    if (!fs.existsSync(envCiPath)) {
        console.error('ERROR: .env.ci not found');
        process.exit(1);
    }
    fs.copyFileSync(envCiPath, envPath);
    console.log('Swapped .env with .env.ci values');
}

function restoreEnv() {
    if (fs.existsSync(envBackupPath)) {
        fs.copyFileSync(envBackupPath, envPath);
        fs.unlinkSync(envBackupPath);
        console.log('Restored original .env');
    }
}

let failed = false;

try {
    swapEnv();

    for (const step of steps) {
        log(step.name);
        try {
            execSync(step.cmd, { cwd: root, stdio: 'inherit' });
        } catch {
            console.error(`\nFAILED: ${step.name}`);
            failed = true;
            break;
        }
    }
} finally {
    restoreEnv();
}

if (failed) {
    log('CI LOCAL: FAILED');
    process.exit(1);
} else {
    log('CI LOCAL: ALL CHECKS PASSED');
}
