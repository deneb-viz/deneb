import fs from 'fs';
import { exec } from 'child_process';
import git from 'git-last-commit';
import _ from 'lodash';
import parseArgs from 'minimist';
import process, { exit } from 'process';
import config from '../config/package-custom.json';

const pbivizFile = 'pbiviz.json';
const pbivizFilePath = '.';
const featuresFile = 'features.json';
const featuresFilePath = './config';
const capabilitiesFile = 'capabilities.json';
const capabilitiesFilePath = '.';
const pbivizOriginal = require(`../${pbivizFile}`);
const featuresOriginal = require(`../config/${featuresFile}`);
const capabilitiesOriginal = require(`../${capabilitiesFile}`);

const runNpmScript = (
    script: string,
    callback: (err: Error | null) => void | null
) => {
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

// Revert the modified files back to their original state
const cleanup = () => {
    console.log('Performing cleanup...');
    writeFile(pbivizFile, pbivizFilePath, pbivizOriginal);
    console.log(`${pbivizFile} reverted`);
    writeFile(featuresFile, featuresFilePath, featuresOriginal);
    console.log(`${featuresFile} reverted`);
    writeFile(capabilitiesFile, capabilitiesFilePath, capabilitiesOriginal);
    console.log(`${capabilitiesFile} reverted`);
};

// Write a pbiviz.json to the project file system
const writeFile = (name: string, path: string, content: string) => {
    console.log(`Writing ${name}...`);
    fs.writeFileSync(`${path}/${name}`, JSON.stringify(content, null, 4));
    console.log(`${name}.updated`);
};

// Perform necessary patching of pbiviz.json for supplied mode
const getPatchedPbiviz = (packageConfig, commit) => {
    const { guid } = packageConfig.pbiviz.visual;
    const suffix = new Date().toISOString().substr(0, 10).replace(/-/g, '');
    return {
        visual: {
            version: pbivizOriginal.visual.version.replace(
                /(\d+\.\d+\.\d+.)(\d+)/,
                `$1${suffix}#${commit?.shortHash || '0000000'}`
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
        writeFile(pbivizFile, pbivizFilePath, pbivizNew);
        console.log(`Updating ${featuresFile} with configuration...`);
        const featuresFileNew = _.merge(
            _.cloneDeep(featuresOriginal),
            packageConfig.features
        );
        writeFile(featuresFile, featuresFilePath, featuresFileNew);
        console.log(`Updating ${capabilitiesFile} with configuration...`);
        const capabilitiesFileNew = _.merge(
            _.cloneDeep(capabilitiesOriginal),
            packageConfig.capabilities
        );
        writeFile(capabilitiesFile, capabilitiesFilePath, capabilitiesFileNew);
        console.log('Running pbiviz package with new options...');
        runNpmScript(
            `pbiviz package --all-locales ${
                !featuresFileNew.enable_external_uri
                    ? '--certification-fix'
                    : ''
            }`,
            (err) => {
                if (err) throw err;
                console.log('Completed package process.');
                cleanup();
                exit(0);
            }
        );
    });
} catch (e) {
    console.error(`[ERROR] ${e.message}`);
    cleanup();
    exit(1);
}
