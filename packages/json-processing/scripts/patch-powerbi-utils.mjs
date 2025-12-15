/**
 * Patches powerbi-visuals-utils packages to fix broken ESM imports.
 *
 * These packages use extensionless imports (e.g., './extensions/arrayExtensions')
 * which break under Node's strict ESM module resolution. This script adds the
 * .js extension to all relative imports in all JS files.
 *
 * Run this after npm install if tests are failing with:
 * "Cannot find module '...' imported from ...index.js"
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../..');
const nodeModulesDir = resolve(rootDir, 'node_modules');

// All the powerbi packages that have broken ESM imports
const packagesToPatch = [
    'powerbi-visuals-utils-typeutils',
    'powerbi-visuals-utils-dataviewutils',
    'powerbi-visuals-utils-formattingutils',
    'powerbi-visuals-utils-interactivityutils',
    'powerbi-visuals-utils-tooltiputils',
    'powerbi-visuals-utils-colorutils',
    'powerbi-visuals-utils-chartutils',
    'powerbi-visuals-utils-svgutils',
    'powerbi-visuals-utils-formattingmodel'
];

/**
 * Recursively find all .js files in a directory
 */
function findJsFiles(dir, files = []) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            findJsFiles(fullPath, files);
        } else if (extname(entry) === '.js') {
            files.push(fullPath);
        }
    }
    return files;
}

/**
 * Patch a single file to add .js extensions to relative imports
 */
function patchFile(filePath) {
    const content = readFileSync(filePath, 'utf8');

    // Add .js extension to relative imports that don't have it
    const patched = content.replace(
        /from\s+["'](\.\.?\/[^"']+)["']/g,
        (match, importPath) => {
            // Skip if already has .js extension
            if (importPath.endsWith('.js')) {
                return match;
            }
            return match.replace(importPath, `${importPath}.js`);
        }
    );

    if (patched !== content) {
        writeFileSync(filePath, patched, 'utf8');
        return true;
    }
    return false;
}

// Find and patch all JS files in each package
let totalPatched = 0;

for (const packageName of packagesToPatch) {
    const packageDir = join(nodeModulesDir, packageName, 'lib');
    
    if (!existsSync(packageDir)) {
        continue;
    }

    try {
        const jsFiles = findJsFiles(packageDir);
        let patchedCount = 0;

        for (const file of jsFiles) {
            if (patchFile(file)) {
                patchedCount++;
            }
        }

        if (patchedCount > 0) {
            console.log(`Patched ${patchedCount} files in ${packageName}`);
            totalPatched += patchedCount;
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Error patching ${packageName}:`, error.message);
        }
    }
}

if (totalPatched > 0) {
    console.log(`\nTotal: Patched ${totalPatched} files`);
} else {
    console.log('All packages already patched or no files need patching');
}
