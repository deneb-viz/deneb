/**
 * Ensures that a .env file exists in the project root.
 * If not present, it will be created by copying from .env.ci.
 * This is useful for new checkouts or CI/certification environments.
 */
import { existsSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '..');
const ENV_FILE = resolve(ROOT_DIR, '.env');
const ENV_CI_FILE = resolve(ROOT_DIR, '.env.ci');

function ensureEnvFile(): void {
    if (existsSync(ENV_FILE)) {
        console.log('✅ .env file already exists');
        return;
    }

    if (!existsSync(ENV_CI_FILE)) {
        console.error('❌ .env.ci file not found - cannot create .env');
        process.exit(1);
    }

    try {
        copyFileSync(ENV_CI_FILE, ENV_FILE);
        console.log('✅ Created .env file from .env.ci');
    } catch (error) {
        console.error('❌ Failed to create .env file:', error);
        process.exit(1);
    }
}

ensureEnvFile();
