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
 * --expect-module-id-renumbering:
 * Webpack's production module IDs are hashes of module paths RELATIVE TO THE
 * BUILD CONTEXT, so physically relocating the source tree renumbers every ID
 * while leaving the code itself untouched — byte parity of content.js across
 * a move is unattainable by construction. With this flag, a raw content.js
 * mismatch triggers a structural equivalence proof instead of an immediate
 * failure: both bundles are parsed (acorn), the webpack module map is
 * extracted, each module's body is hashed with its require-call IDs blinded,
 * and the module graphs are compared via iterative canonical labeling. The
 * runtime/entry glue outside the map must be byte-identical except at
 * numeric-literal positions (located via the AST, so string content is never
 * exempted), and each positional pair of numeric literals must either be
 * EQUAL (an ordinary constant — any change to it fails) or be a pair of
 * module IDs that reference corresponding modules under a consistent
 * renumbering. Only if the bundles are provably identical up to a consistent
 * ID renumbering does content.js count as a pass — any real code change
 * still fails. The flag never relaxes any other part.
 *
 * Usage:
 *   npm run verify-package-parity -- <baseline.pbiviz> <candidate.pbiviz>
 *       [--expect-module-id-renumbering]
 *
 * Exit codes: 0 all parts match; 1 at least one part differs; 2 usage error.
 */
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import JSZip from 'jszip';
import * as acorn from 'acorn';

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
        (name) => name.startsWith('resources/') && name.endsWith('.pbiviz.json')
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

/**
 * Structural equivalence proof for two webpack bundles that are expected to
 * differ only by module-ID renumbering. Minified ASTs are traversed with a
 * generic walker (loose `any` typing is deliberate — acorn's node shapes are
 * dynamic and this is an analysis script, not shipped code).
 */

interface ModuleInfo {
    /** sha256 of the module's source with require-call IDs blinded. */
    blindedHash: string;
    /** Referenced module IDs in call order. */
    refs: number[];
}

interface BundleShape {
    modules: Map<number, ModuleInfo>;
    /**
     * Bundle source outside the module map with every numeric literal
     * blinded (AST-positionally, so digits inside strings are untouched);
     * all non-numeric content must match byte-for-byte.
     */
    blindedGlue: string;
    /** The glue's numeric-literal values, in source order. */
    glueNumbers: number[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const walkAst = (node: any, visit: (node: any) => void): void => {
    if (!node || typeof node.type !== 'string') {
        return;
    }
    visit(node);
    for (const key of Object.keys(node)) {
        const value = node[key];
        if (Array.isArray(value)) {
            for (const child of value) {
                if (child && child.type) {
                    walkAst(child, visit);
                }
            }
        } else if (value && value.type) {
            walkAst(value, visit);
        }
    }
};

const MIN_MODULE_MAP_ENTRIES = 100;

/**
 * A webpack module-map entry is a numeric-keyed function. Requiring the
 * function-shaped value guards against misdetecting a large numeric-keyed
 * DATA object (e.g. an embedded locale/lookup table) as the module map.
 */
const isModuleEntry = (property: any): boolean =>
    property.key &&
    property.key.type === 'Literal' &&
    typeof property.key.value === 'number' &&
    property.value &&
    (property.value.type === 'FunctionExpression' ||
        property.value.type === 'ArrowFunctionExpression');

const extractBundleShape = (source: string, label: string): BundleShape => {
    const ast = acorn.parse(source, { ecmaVersion: 'latest' }) as any;
    // The webpack module map is the largest object literal keyed (almost)
    // entirely by numeric module IDs with function values.
    let moduleMap: any = null;
    walkAst(ast, (node) => {
        if (
            node.type === 'ObjectExpression' &&
            node.properties.length > MIN_MODULE_MAP_ENTRIES
        ) {
            const entries = node.properties.filter(isModuleEntry);
            if (
                entries.length > MIN_MODULE_MAP_ENTRIES &&
                (!moduleMap ||
                    node.properties.length > moduleMap.properties.length)
            ) {
                moduleMap = node;
            }
        }
    });
    if (!moduleMap) {
        throw new Error(`${label}: webpack module map not found in bundle`);
    }
    const moduleEntries = moduleMap.properties.filter(isModuleEntry);
    const modules = new Map<number, ModuleInfo>();
    for (const property of moduleEntries) {
        const id = property.key.value as number;
        const fn = property.value;
        // Webpack passes the require function as the module's third parameter;
        // calls to it with a single numeric literal are module references.
        // Scope is deliberately narrowed to this observed call shape (no
        // code-splitting in a .pbiviz bundle): any other ID-bearing construct
        // is left un-blinded and fails safe as a body-hash mismatch (DIFF).
        const requireName: string | undefined = (fn.params ?? [])[2]?.name;
        const refs: number[] = [];
        const blindSpans: { start: number; end: number }[] = [];
        walkAst(fn, (node) => {
            if (
                node.type === 'CallExpression' &&
                node.callee.type === 'Identifier' &&
                node.callee.name === requireName &&
                node.arguments.length === 1 &&
                node.arguments[0].type === 'Literal' &&
                typeof node.arguments[0].value === 'number'
            ) {
                refs.push(node.arguments[0].value);
                blindSpans.push({
                    start: node.arguments[0].start,
                    end: node.arguments[0].end
                });
            }
        });
        blindSpans.sort((a, b) => a.start - b.start);
        let blinded = '';
        let position = fn.start;
        for (const span of blindSpans) {
            blinded += source.slice(position, span.start) + '#';
            position = span.end;
        }
        blinded += source.slice(position, fn.end);
        modules.set(id, { blindedHash: sha256(blinded), refs });
    }
    // Glue (webpack bootstrap + entry code outside the map): blind EVERY
    // numeric literal positionally via the AST — digits inside strings are
    // never touched, so any string change fails the byte comparison. The
    // literal VALUES are recorded in source order; the equivalence check
    // requires each positional pair to be equal (an ordinary constant) or a
    // corresponding pair of module IDs. Module references here take several
    // shapes (direct require calls, require.bind for lazy workers), so no
    // call-shape heuristic is used — value pairing decides.
    const glueNumbers: number[] = [];
    const replacements: { start: number; end: number; text: string }[] = [
        { start: moduleMap.start, end: moduleMap.end, text: '<<MODULE_MAP>>' }
    ];
    walkAst(ast, (node) => {
        if (
            node.type === 'Literal' &&
            typeof node.value === 'number' &&
            (node.start < moduleMap.start || node.start >= moduleMap.end)
        ) {
            glueNumbers.push(node.value);
            replacements.push({
                start: node.start,
                end: node.end,
                text: '#'
            });
        }
    });
    replacements.sort((a, b) => a.start - b.start);
    let blindedGlue = '';
    let gluePosition = 0;
    for (const replacement of replacements) {
        blindedGlue +=
            source.slice(gluePosition, replacement.start) + replacement.text;
        gluePosition = replacement.end;
    }
    blindedGlue += source.slice(gluePosition);
    return { modules, blindedGlue, glueNumbers };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

const CANONICAL_LABEL_ROUNDS = 6;

/**
 * Canonical label per module via iterative refinement: start from the
 * blinded-body hash and repeatedly fold in the labels of referenced modules
 * (in call order). After a few rounds, matching label multisets mean the two
 * module graphs are identical up to a bijective renaming of module IDs.
 */
const canonicalLabels = (
    modules: Map<number, ModuleInfo>
): Map<number, string> => {
    let labels = new Map<number, string>(
        [...modules].map(([id, info]) => [id, info.blindedHash])
    );
    for (let round = 0; round < CANONICAL_LABEL_ROUNDS; round++) {
        const next = new Map<number, string>();
        for (const [id, info] of modules) {
            const refLabels = info.refs
                .map((ref) => labels.get(ref) ?? `external:${ref}`)
                .join(',');
            next.set(id, sha256(`${labels.get(id)}|${refLabels}`));
        }
        labels = next;
    }
    return labels;
};

interface EquivalenceResult {
    equivalent: boolean;
    detail: string;
}

export const verifyModuleIdRenumberingOnly = (
    baselineJs: string,
    candidateJs: string
): EquivalenceResult => {
    const baseline = extractBundleShape(baselineJs, 'baseline');
    const candidate = extractBundleShape(candidateJs, 'candidate');
    if (baseline.modules.size !== candidate.modules.size) {
        return {
            equivalent: false,
            detail: `module counts differ (${baseline.modules.size} vs ${candidate.modules.size})`
        };
    }
    if (baseline.blindedGlue !== candidate.blindedGlue) {
        return {
            equivalent: false,
            detail: 'runtime/entry code outside the module map differs'
        };
    }
    const baselineLabelMap = canonicalLabels(baseline.modules);
    const candidateLabelMap = canonicalLabels(candidate.modules);
    const baselineLabels = [...baselineLabelMap.values()].sort();
    const candidateLabels = [...candidateLabelMap.values()].sort();
    const graphsMatch = baselineLabels.every(
        (labelValue, index) => labelValue === candidateLabels[index]
    );
    // Every numeric literal in the glue was blinded positionally; require
    // each positional value pair to be EQUAL (an ordinary constant — any
    // change fails) or a pair of module IDs referencing corresponding
    // modules (same canonical label) under a consistent one-to-one
    // renumbering.
    if (baseline.glueNumbers.length !== candidate.glueNumbers.length) {
        return {
            equivalent: false,
            detail: 'numeric literals in the runtime/entry glue differ in count'
        };
    }
    const forward = new Map<number, number>();
    const reverse = new Map<number, number>();
    for (let index = 0; index < baseline.glueNumbers.length; index++) {
        const baselineValue = baseline.glueNumbers[index];
        const candidateValue = candidate.glueNumbers[index];
        if (baselineValue === candidateValue) {
            continue;
        }
        const labelsCorrespond =
            baselineLabelMap.get(baselineValue) !== undefined &&
            baselineLabelMap.get(baselineValue) ===
                candidateLabelMap.get(candidateValue);
        const forwardConsistent =
            (forward.get(baselineValue) ?? candidateValue) === candidateValue;
        const reverseConsistent =
            (reverse.get(candidateValue) ?? baselineValue) === baselineValue;
        if (!labelsCorrespond || !forwardConsistent || !reverseConsistent) {
            return {
                equivalent: false,
                detail: `numeric literal in the runtime/entry glue changed (${baselineValue} vs ${candidateValue}) without corresponding module-ID renumbering`
            };
        }
        forward.set(baselineValue, candidateValue);
        reverse.set(candidateValue, baselineValue);
    }
    // Canonical labeling compares label multisets (1-WL refinement), which is
    // exact only when labels are distinct. Modules sharing a final label are
    // interchangeable "twins" (identical bodies AND reference structure to
    // the refinement depth) — surface the count so a reviewer knows how much
    // of the proof rests on that interchangeability.
    const twinCount = baselineLabels.length - new Set(baselineLabels).size;
    return graphsMatch
        ? {
              equivalent: true,
              detail:
                  `${baseline.modules.size} modules; graphs identical up to ID renumbering` +
                  (twinCount > 0
                      ? `; ${twinCount} twin modules share canonical labels`
                      : '')
          }
        : {
              equivalent: false,
              detail: 'module code or reference structure differs'
          };
};

const main = async (): Promise<void> => {
    const args = process.argv.slice(2);
    const expectModuleIdRenumbering = args.includes(
        '--expect-module-id-renumbering'
    );
    const [baselinePath, candidatePath] = args.filter(
        (arg) => !arg.startsWith('--')
    );
    if (!baselinePath || !candidatePath) {
        console.error(
            'Usage: npm run verify-package-parity -- <baseline.pbiviz> <candidate.pbiviz> [--expect-module-id-renumbering]'
        );
        process.exit(2);
    }
    const baselineResource = await loadResource(baselinePath);
    const candidateResource = await loadResource(candidatePath);
    const baseline = getPartHashes(baselineResource);
    const candidate = getPartHashes(candidateResource);
    const partNames = [
        ...new Set([...Object.keys(baseline), ...Object.keys(candidate)])
    ].sort();
    let failed = false;
    let renumberingNote = '';
    console.log(`Baseline:  ${baselinePath}`);
    console.log(`Candidate: ${candidatePath}\n`);
    for (const part of partNames) {
        const left = baseline[part];
        const right = candidate[part];
        let match = left !== undefined && left === right;
        let annotation = '';
        if (!match && part === 'content.js' && expectModuleIdRenumbering) {
            const equivalence = verifyModuleIdRenumberingOnly(
                baselineResource.content.js ?? '',
                candidateResource.content.js ?? ''
            );
            if (equivalence.equivalent) {
                match = true;
                annotation = `  (module-ID renumbering only: ${equivalence.detail})`;
                renumberingNote =
                    '\nNote: content.js hashes differ but the bundles were proven identical\n' +
                    'up to webpack module-ID renumbering (--expect-module-id-renumbering).';
            } else {
                annotation = `  (equivalence check FAILED: ${equivalence.detail})`;
            }
        }
        if (!match) {
            failed = true;
        }
        console.log(
            `${match ? 'PASS' : 'DIFF'}  ${part.padEnd(24)} ${(
                left ?? '(missing)'
            ).slice(0, 12)}  ${(right ?? '(missing)').slice(
                0,
                12
            )}${annotation}`
        );
    }
    console.log(
        failed
            ? '\nRESULT: PARITY FAILURE — parts marked DIFF above do not match.'
            : '\nRESULT: PARITY OK — all compared parts are content-identical.'
    );
    console.log(renumberingNote);
    process.exit(failed ? 1 : 0);
};

main().catch((error) => {
    console.error(`[ERROR] ${error instanceof Error ? error.message : error}`);
    process.exit(2);
});
