const { exit } = require('process');
const config = require('../config/deneb-config.json');

console.log('Checking visual configuration is correct...\n');
const errors = [];

// Developer mode: Should not be set in committed code
if (config.features.developerMode) {
    errors.push(
        '❌ features.developerMode flag is true; this should be false.'
    );
}
// React logging: Should not be set in committed code
if (config.features.enableReactLogging) {
    errors.push(
        '❌ features.enableReactLogging flag is true; this should be false.'
    );
}
// Log level: should be 0 (NONE) in committed code
if (config.logLevel !== 0) {
    errors.push(
        `❌ features.logLevel is ${config.features.logLevel}; this should be 0 (NONE).`
    );
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
