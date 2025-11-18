#!/usr/bin/env ts-node
/**
 * Synchronize selected root package.json metadata fields across all workspace packages.
 * This goes beyond what syncpack offers (it focuses on dependency version/range consistency).
 *
 * Usage (dry run):
 *   ts-node -P tsconfig.build-scripts.json bin/sync-package-metadata.ts --meta-dry
 *
 * Usage (apply changes):
 *   ts-node -P tsconfig.build-scripts.json bin/sync-package-metadata.ts
 */
import { promises as fs } from 'fs';
import path from 'path';

interface PackageJson {
    name?: string;
    license?: string;
    repository?: { type?: string; url?: string } | string;
    publishConfig?: { registry?: string; [k: string]: any };
    packageManager?: string;
    version?: string;
    author?: any;
    [k: string]: any;
}

const ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
// Use custom flags (--meta-dry / --metadata-dry-run) to avoid npm consuming --dry/--dry-run itself.
const argv = process.argv.slice(2);
const DRY_RUN =
    argv.includes('--meta-dry') || argv.includes('--metadata-dry-run');

// Canonical fields we want to keep in sync
const FIELDS: (keyof PackageJson)[] = [
    'version',
    'author',
    'license',
    'repository',
    'publishConfig',
    'packageManager'
];

async function readJson(file: string) {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as PackageJson;
}

async function writeJson(file: string, data: PackageJson) {
    const content = JSON.stringify(data, null, 4) + '\n';
    await fs.writeFile(file, content, 'utf8');
}

function differ(a: any, b: any) {
    return JSON.stringify(a) !== JSON.stringify(b);
}

async function main() {
    const rootPkgPath = path.join(ROOT, 'package.json');
    const rootPkg = await readJson(rootPkgPath);
    // Derive canonical version from pbiviz.json if requested
    let pbivizVersionShort: string | undefined;
    if (FIELDS.includes('version')) {
        try {
            const pbivizRaw = (await readJson(
                path.join(ROOT, 'pbiviz.json')
            )) as any;
            const fullVersion: string | undefined = pbivizRaw?.visual?.version;
            if (fullVersion) {
                const segments = fullVersion.split('.');
                pbivizVersionShort = segments.slice(0, 3).join('.');
            }
        } catch (e) {
            console.warn(
                '[sync] Unable to read pbiviz.json for version field:',
                (e as Error).message
            );
        }
    }

    const entries = await fs.readdir(PACKAGES_DIR, { withFileTypes: true });
    const packageDirs = entries
        .filter((e) => e.isDirectory())
        .map((e) => path.join(PACKAGES_DIR, e.name));

    let changed = 0;
    for (const dir of packageDirs) {
        const pkgPath = path.join(dir, 'package.json');
        try {
            const pkg = await readJson(pkgPath);
            let modified = false;
            const changedFields: string[] = [];
            for (const field of FIELDS) {
                const canonicalRoot = (rootPkg as any)[field];
                // Special handling: version comes from pbiviz.json, not root package.json
                const effectiveCanonical =
                    field === 'version'
                        ? (pbivizVersionShort ?? canonicalRoot)
                        : canonicalRoot;
                if (effectiveCanonical === undefined) continue; // nothing to sync
                if (differ(pkg[field], effectiveCanonical)) {
                    (pkg as any)[field] = effectiveCanonical;
                    modified = true;
                    changedFields.push(String(field));
                }
            }
            if (modified) {
                changed++;
                if (DRY_RUN) {
                    console.log(
                        `[dry] Would update: ${pkg.name ?? pkgPath} -> fields: ${changedFields.join(', ')}`
                    );
                } else {
                    await writeJson(pkgPath, pkg);
                    console.log(
                        `[sync] Updated: ${pkg.name ?? pkgPath} -> fields: ${changedFields.join(', ')}`
                    );
                }
            }
        } catch (e) {
            // silently ignore packages without package.json
            continue;
        }
    }

    if (changed === 0) {
        console.log('All package metadata already synchronized.');
    } else {
        console.log(
            `${DRY_RUN ? 'Would modify' : 'Modified'} ${changed} package(s).`
        );
    }

    if (DRY_RUN) {
        console.log('\nRe-run without --dry to apply changes.');
    }
}

main().catch((err) => {
    console.error('Metadata sync failed:', err);
    process.exit(1);
});
