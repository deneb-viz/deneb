import '@dotenvx/dotenvx/config';
import { exit } from 'process';
import { collectConfigErrors } from './config-validation';

console.log('Checking visual configuration is correct...\n');

const errors = collectConfigErrors(process.env);

if (errors.length > 0) {
    console.error(
        '===\nIssues found with configuration. Please resolve the following:\n===\n'
    );
    errors.forEach((e, i) => console.error(` ${i + 1}. ${e}`));
    exit(1);
}
console.log('✅ No configuration issues found :)');
exit(0);
