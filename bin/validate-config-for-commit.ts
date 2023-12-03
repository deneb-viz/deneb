import { exit } from 'process';
import * as config from '../config/deneb-config.json';

console.log('Checking visual configuration is correct...\n');
const errors: string[] = [];

// Developer mode: Should not be set in committed code
if (config.features.developerMode) {
    errors.push(
        '❌ features.developerMode flag is true; this should be false.'
    );
}
// Visual update history overlay: Should not be set in committed code
if (config.features.visualUpdateHistoryOverlay) {
    errors.push(
        '❌ features.visualUpdateHistoryOverlay flag is true; this should be false.'
    );
}
// Log level: should be 0 (NONE) in committed code
if (config.logLevel !== 0) {
    errors.push(`❌ logLevel is ${config.logLevel}; this should be 0 (NONE).`);
}
// External URIs: Not permitted in certified visual, so needs to be disabled in committed code.
if (config.features.enableExternalUri) {
    errors.push('❌ features.enableExternalUri is true; this should be false.');
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
