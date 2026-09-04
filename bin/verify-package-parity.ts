/**
 * Compares two .pbiviz packages at the content level and reports exactly
 * which part differs. Byte-level comparison of the archives is not possible
 * (the zip stamps wall-clock entry mtimes), so content-level is the bar.
 *
 * Parts compared (sha256 of each):
 *   - content.js, content.css, content.iconBase64
 *   - capabilities (stringified)
 *   - metadata (visual/author/apiVersion/style/dependencies/
 *     visualEntryPoint/externalJS/assets, stringified)
 *   - the sorted set of locale keys, and each locale's resources
 *
 * This inherently catches the known silent traps of the apps/deneb move:
 * a root-cwd invocation ships an icon-less, locale-less package (icon and
 * stringResources hashes change), and an ajv hoisting swap changes
 * content.js.
 *
 * Usage:
 *   npm run verify-package-parity -- <baseline.pbiviz> <candidate.pbiviz>
 *
 * Exit codes: 0 all parts match; 1 at least one part differs; 2 usage error.
 */
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import JSZip from 'jszip';

interface PbivizResource {
    visual: Record<string, unknown>;
    author: Record<string, unknown>;
    apiVersion: string;
    style: string;
    dependencies?: unknown;
    stringResources?: Record<string, Record<string, string>>;
    capabilities: Record<string, unknown>;
    content: { js?: string; css?: string; iconBase64?: string };
    visualEntryPoint?: unknown;
    externalJS?: unknown;
    assets?: Record<string, unknown>;
}

const sha256 = (value: string): string =>
    createHash('sha256').update(value).digest('hex');

const loadResource = async (pbivizPath: string): Promise<PbivizResource> => {
    const zip = await JSZip.loadAsync(readFileSync(pbivizPath));
    const resourceFile = Object.keys(zip.files).find(
        (name) =>
            name.startsWith('resources/') && name.endsWith('.pbiviz.json')
    );
    if (!resourceFile) {
        throw new Error(`No resources/*.pbiviz.json found in ${pbivizPath}`);
    }
    return JSON.parse(
        await zip.files[resourceFile].async('string')
    ) as PbivizResource;
};

export const getPartHashes = (
    resource: PbivizResource
): Record<string, string> => {
    const locales = Object.keys(resource.stringResources ?? {}).sort();
    const parts: Record<string, string> = {
        'content.js': sha256(resource.content.js ?? ''),
        'content.css': sha256(resource.content.css ?? ''),
        'content.iconBase64': sha256(resource.content.iconBase64 ?? ''),
        capabilities: sha256(JSON.stringify(resource.capabilities ?? null)),
        metadata: sha256(
            JSON.stringify({
                visual: resource.visual,
                author: resource.author,
                apiVersion: resource.apiVersion,
                style: resource.style,
                dependencies: resource.dependencies ?? null,
                visualEntryPoint: resource.visualEntryPoint ?? null,
                externalJS: resource.externalJS ?? null,
                assets: resource.assets ?? null
            })
        ),
        'locales.keys': sha256(JSON.stringify(locales))
    };
    for (const locale of locales) {
        parts[`locale.${locale}`] = sha256(
            JSON.stringify(resource.stringResources?.[locale] ?? null)
        );
    }
    return parts;
};

const main = async (): Promise<void> => {
    const [baselinePath, candidatePath] = process.argv.slice(2);
    if (!baselinePath || !candidatePath) {
        console.error(
            'Usage: npm run verify-package-parity -- <baseline.pbiviz> <candidate.pbiviz>'
        );
        process.exit(2);
    }
    const baseline = getPartHashes(await loadResource(baselinePath));
    const candidate = getPartHashes(await loadResource(candidatePath));
    const partNames = [
        ...new Set([...Object.keys(baseline), ...Object.keys(candidate)])
    ].sort();
    let failed = false;
    console.log(`Baseline:  ${baselinePath}`);
    console.log(`Candidate: ${candidatePath}\n`);
    for (const part of partNames) {
        const left = baseline[part];
        const right = candidate[part];
        const match = left !== undefined && left === right;
        if (!match) {
            failed = true;
        }
        console.log(
            `${match ? 'PASS' : 'DIFF'}  ${part.padEnd(24)} ${(
                left ?? '(missing)'
            ).slice(0, 12)}  ${(right ?? '(missing)').slice(0, 12)}`
        );
    }
    console.log(
        failed
            ? '\nRESULT: PARITY FAILURE — parts marked DIFF above do not match.'
            : '\nRESULT: PARITY OK — all compared parts are content-identical.'
    );
    process.exit(failed ? 1 : 0);
};

main().catch((error) => {
    console.error(`[ERROR] ${error instanceof Error ? error.message : error}`);
    process.exit(2);
});
