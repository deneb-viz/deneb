import { exit } from 'process';
import { FEATURES, LOG_LEVEL } from '../config';

console.log('Checking visual configuration is correct...\n');
const MODE = process.env.DENEB_PACKAGE_MODE;
const allowExternalUri = MODE === 'standalone';
const errors: string[] = [];

// Developer mode: Should not be set in committed code
if (FEATURES.developer_mode) {
    errors.push(
        '❌ FEATURES.developer_mode flag is true; this should be false.'
    );
}
// Visual update history overlay: Should not be set in committed code
if (FEATURES.visual_update_history_overlay) {
    errors.push(
        '❌ FEATURES.visual_update_history_overlay flag is true; this should be false.'
    );
}
// Log level: should be 0 (NONE) in committed code
if (LOG_LEVEL !== 0) {
    errors.push(`❌ logLevel is ${LOG_LEVEL}; this should be 0 (NONE).`);
}
// External URIs: Not permitted in certified visual; allowed only for standalone packaging mode
if (FEATURES.enable_external_uri && !allowExternalUri) {
    errors.push(
        '❌ FEATURES.enable_external_uri is true; this should be false.'
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
