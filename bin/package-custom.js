const fs = require('fs');
const exec = require('child_process').exec;
const git = require('git-last-commit');
const _ = require('lodash');
const parseArgs = require('minimist');
const { exit } = require('process');
const config = require('../config/package-custom-config.json');
const pbivizFile = 'pbiviz.json';
const pbivizOriginal = require(`../${pbivizFile}`);

const runNpmScript = (script, callback) => {
    // keep track of whether callback has been invoked to prevent multiple invocations
    var invoked = false;
    var process = exec(script);
    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });
    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        var err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });
};

// Revert the pbiviz back to its original state
const cleanup = () => {
    console.log('Performing cleanup...');
    writePbiviz(pbivizOriginal);
    console.log('pbiviz.json reverted');
};

// Write a pbiviz.json to the project file system
const writePbiviz = (content) => {
    console.log(`Writing ${pbivizFile}...`);
    fs.writeFileSync(`./${pbivizFile}`, JSON.stringify(content, null, 4));
    console.log(`${pbivizFile}.updated`);
};

// Perform necessary patching of pbiviz.json for supplied mode
const getPatchedPbiviz = (packageConfig, commit) => {
    const { guid } = packageConfig.pbiviz.visual;
    const suffix = new Date().toISOString().substr(0, 10).replace(/-/g, '');
    return {
        visual: {
            version: pbivizOriginal.visual.version.replace(
                /(\d+\.\d+\.\d+.)(\d+)/,
                `$1${suffix}#${commit.shortHash}`
            ),
            guid: guid.replace(/(.*)(\{0\})/, `$1${pbivizOriginal.visual.guid}`)
        }
    };
};

try {
    git.getLastCommit(function (err, commit) {
        console.log('Checking for package configuration...');
        const argv = parseArgs(process.argv.slice(2));
        const packageConfig = config[argv.mode];
        console.log('Configuration', packageConfig);
        if (!packageConfig) {
            throw new Error('No configuration for package found!');
        }
        console.log(`Using configuration for [${argv.mode}]`);
        console.log(`Updating ${pbivizFile} with configuration...`);
        const pbivizNew = _.merge(
            _.cloneDeep(pbivizOriginal),
            packageConfig.pbiviz,
            getPatchedPbiviz(packageConfig, commit)
        );
        writePbiviz(pbivizNew);
        console.log('Running pbiviz package with new options...');
        runNpmScript('npm run package', (err) => {
            if (err) throw err;
            console.log('Completed package process.');
            cleanup();
            exit(0);
        });
    });
} catch (e) {
    console.error(`[ERROR] ${e.message}`);
    cleanup();
    exit(1);
}
