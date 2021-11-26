const { exit } = require('process');
const config = require('../config/deneb-config.json');

console.log('Checking visual configuration is correct...\n');
const errors = [];

if (config.features.developerMode) {
    errors.push('features.developerMode flag is true; this should be false.');
}
if (config.features.enableExternalUri) {
    errors.push('features.enableExternalUri is true; this should be false.');
}

if (errors.length > 0) {
    console.error(
        '===\nIssues found with configuration. Please resolve the following:\n===\n'
    );
    errors.forEach((e, i) => console.error(` ${i + 1}. ${e}`));
    exit(1);
}
console.log('No configuration issues found :)');
exit(0);
