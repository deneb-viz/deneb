import '@dotenvx/dotenvx/config';
import { exit } from 'process';
import { parseLogLevel } from '@deneb-viz/utils/logging';
import { toBoolean } from '@deneb-viz/utils/type-conversion';

console.log('Checking visual configuration is correct...\n');
const MODE = process.env.DENEB_PACKAGE_MODE;
const LOG_LEVEL = parseLogLevel(process.env.LOG_LEVEL, 0);
const REDUX_DEV_TOOLS = toBoolean(process.env.ZUSTAND_DEV_TOOLS);
const PBIVIZ_DEV_MODE = toBoolean(process.env.PBIVIZ_DEV_MODE);
const PBIVIZ_DEV_OVERLAY = toBoolean(process.env.PBIVIZ_DEV_OVERLAY);
const ALLOW_EXTERNAL_URI = toBoolean(process.env.ALLOW_EXTERNAL_URI);
const allowExternalUri = MODE === 'standalone';
const errors: string[] = [];

// Redux dev tools: Should not be set in committed code
if (REDUX_DEV_TOOLS) {
    errors.push(
        '❌ .env ZUSTAND_DEV_TOOLS flag is true; this should be false.'
    );
}
// PBI Developer mode: Should not be set in committed code
if (PBIVIZ_DEV_MODE) {
    errors.push('❌ .env PBIVIZ_DEV_MODE flag is true; this should be false.');
}
// PBI Developer overlay: Should not be set in committed code
if (PBIVIZ_DEV_OVERLAY) {
    errors.push(
        '❌ .env PBIVIZ_DEV_OVERLAY flag is true; this should be false.'
    );
}
// Log level: should be 0 (NONE) in committed code
if (LOG_LEVEL !== 0) {
    errors.push(`❌ .env LOG_LEVEL is ${LOG_LEVEL}; this should be 0 (NONE).`);
}
// External URIs: Not permitted in certified visual; allowed only for standalone packaging mode
if (ALLOW_EXTERNAL_URI && !allowExternalUri) {
    errors.push(
        '❌ .env ALLOW_EXTERNAL_URI flag is true; this should be false.'
    );
}

if (errors.length > 0) {
    console.error(
        '===\nIssues found with configuration. Please resolve the following:\n===\n'
    );
    errors.forEach((e, i) => console.error(` ${i + 1}. ${e}`));
    exit(1);
}
console.log('✅ No configuration issues found :)');
exit(0);
