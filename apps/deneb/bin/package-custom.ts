import fs from 'fs';
import { exec, spawn } from 'child_process';
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
    env: NodeJS.ProcessEnv,
    callback: (err: Error | null) => void | null
) => {
    // Use spawn with stdio inherited so child output is visible in the console
    let invoked = false;
    const child = spawn(script, {
        env,
        shell: true,
        stdio: 'inherit'
    });

    child.on('error', (err) => {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    child.on('close', (code) => {
        if (invoked) return;
        invoked = true;
        const err = code === 0 ? null : new Error('exit code ' + code);
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
interface IPackageModeConfig {
    pbiviz: {
        visual: {
            displayName?: string;
            description?: string;
            guid: string;
            version?: string;
        };
        assets?: Record<string, unknown>;
    };
    features?: Record<string, unknown>;
    capabilities?: Record<string, unknown>;
}

interface ILastCommitInfo {
    shortHash?: string;
}

const getPatchedPbiviz = (
    packageConfig: IPackageModeConfig,
    commit: ILastCommitInfo | undefined
) => {
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
        const packageConfig: IPackageModeConfig | undefined = (config as any)[
            argv.mode
        ];
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
        console.log('Running webpack production package with new options...');
        const childEnv: NodeJS.ProcessEnv = { ...process.env };
        if (argv.mode === 'standalone') {
            childEnv.DENEB_PACKAGE_MODE = 'standalone';
            console.log(`Setting DENEB_PACKAGE_MODE=standalone`);
        } else {
            // Ensure no stale value leaks in from parent shell
            delete childEnv.DENEB_PACKAGE_MODE;
            console.log(
                `Ensuring DENEB_PACKAGE_MODE is unset for certified build`
            );
        }
        runNpmScript(`npm run webpack:package`, childEnv, (err) => {
            if (err) throw err;
            console.log('Completed package process.');
            cleanup();
            exit(0);
        });
    });
} catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[ERROR] ${message}`);
    cleanup();
    exit(1);
}
