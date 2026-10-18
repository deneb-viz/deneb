import * as ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

/**
 * Reachability walker for the "kernel is editor-free" canary.
 *
 * Builds the value-import graph reachable from a set of entry files by
 * parsing each reached file's import/export declarations, dynamic
 * `import('...')` calls, and `require('...')` calls (anywhere in the
 * file, including nested inside function bodies) and resolving their
 * module specifiers the same way the TypeScript compiler would -- via
 * `ts.resolveModuleName` against the package's own `tsconfig.json` compiler options and a `ts.sys`-backed resolution host.
 *
 * Only VALUE edges are followed. `import type ...`, `export type ...`,
 * and any `import`/`export { ... } from '...'` clause whose every named
 * specifier is individually marked `isTypeOnly` carry no runtime
 * dependency and are skipped -- a type-only reference to `monaco-editor`
 * does not put Monaco in the kernel's bundle, so the canary must not
 * treat it as coupling. This is why a regex-based walker cannot stand in
 * for this one: distinguishing `import type { Foo }` from `import { Foo }`
 * requires the parser's type-only bit, not string matching.
 *
 * Resolves against the package's own tsconfig. `PACKAGE_ROOT` accounts for
 * this file's depth: it lives at `src/__tests__/` (one directory under
 * `src/`), so the package root is two levels up from `__dirname`.
 */

/** Absolute path to the package root (this file lives at src/__tests__). */
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
/** Absolute path to the package's src/ directory. */
const SRC_ROOT = path.join(PACKAGE_ROOT, 'src');
const TSCONFIG_PATH = path.join(PACKAGE_ROOT, 'tsconfig.json');

export interface ReachabilityResult {
    /**
     * Every reached source file under `src/`, relative to `src/` and
     * forward-slash separated (so patterns read the same on Windows and
     * POSIX). Excludes `.d.ts` files -- they carry no runtime code.
     */
    files: string[];
    /**
     * Every external (outside this package's own `src/`, including
     * node_modules and workspace-sibling packages) module specifier
     * reached by a value edge, exactly as written at the import site.
     */
    externals: string[];
}

let cachedCompilerOptions: ts.CompilerOptions | undefined;

/** Reads and parses the package's own tsconfig.json once per process. */
function getCompilerOptions(): ts.CompilerOptions {
    if (cachedCompilerOptions) {
        return cachedCompilerOptions;
    }
    const configFile = ts.readConfigFile(TSCONFIG_PATH, ts.sys.readFile);
    if (configFile.error) {
        throw new Error(
            `Failed to read ${TSCONFIG_PATH}: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')}`
        );
    }
    const parsed = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        PACKAGE_ROOT
    );
    cachedCompilerOptions = parsed.options;
    return parsed.options;
}

/** True when a named import/export clause carries no value edge (every specifier is type-only). */
function isEffectivelyTypeOnly(
    elements: readonly (ts.ImportSpecifier | ts.ExportSpecifier)[]
): boolean {
    return elements.every((el) => el.isTypeOnly);
}

function toPosix(filePath: string): string {
    return filePath.split(path.sep).join('/');
}

function getStringLiteralText(expr: ts.Expression): string | undefined {
    return ts.isStringLiteralLike(expr) ? expr.text : undefined;
}

/**
 * Returns the module specifier text of `statement` when it carries a
 * value (runtime) edge, or `undefined` when the statement is type-only,
 * has no module specifier, or is not an import/export declaration at all.
 */
function valueEdgeSpecifier(statement: ts.Node): string | undefined {
    if (ts.isImportDeclaration(statement)) {
        const clause = statement.importClause;
        if (!clause) {
            // Side-effect import: `import './foo';` -- always a value edge.
            return getStringLiteralText(statement.moduleSpecifier);
        }
        if (clause.isTypeOnly) {
            return undefined;
        }
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            const namedOnlyTypeOnly =
                clause.namedBindings.elements.length > 0 &&
                isEffectivelyTypeOnly(clause.namedBindings.elements);
            // A default import (clause.name) is never itself type-only, so
            // its presence keeps the edge live even if every named
            // specifier alongside it is type-only.
            if (namedOnlyTypeOnly && !clause.name) {
                return undefined;
            }
        }
        return getStringLiteralText(statement.moduleSpecifier);
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
        if (statement.isTypeOnly) {
            return undefined;
        }
        const exportClause = statement.exportClause;
        if (exportClause && ts.isNamedExports(exportClause)) {
            if (isEffectivelyTypeOnly(exportClause.elements)) {
                return undefined;
            }
        }
        // No exportClause (`export * from '...'`) or a namespace export
        // (`export * as ns from '...'`) are always value edges once the
        // `isTypeOnly` check above has passed.
        return getStringLiteralText(statement.moduleSpecifier);
    }

    return undefined;
}

/**
 * Returns the module specifier of `node` when it is a dynamic
 * `import('...')` or `require('...')` call with a string-literal (or
 * no-substitution template) argument; otherwise `undefined`.
 */
function dynamicEdgeSpecifier(node: ts.Node): string | undefined {
    if (!ts.isCallExpression(node)) {
        return undefined;
    }
    // TypeScript AST property name, not the legacy function-scoped `arguments` object.
    // eslint-disable-next-line powerbi-visuals/no-banned-terms
    const { arguments: callArgs } = node;
    if (callArgs.length === 0) {
        return undefined;
    }
    const isDynamicImport =
        node.expression.kind === ts.SyntaxKind.ImportKeyword;
    const isRequire =
        ts.isIdentifier(node.expression) && node.expression.text === 'require';
    return isDynamicImport || isRequire
        ? getStringLiteralText(callArgs[0])
        : undefined;
}

/**
 * Collects the module specifiers of every value edge in `sourceFile`:
 * static import/export declarations that are not type-only, plus dynamic
 * `import('...')` and `require('...')` calls at any nesting depth.
 * Pure over the parsed AST, so it needs no filesystem.
 */
export function collectValueEdgeSpecifiers(
    sourceFile: ts.SourceFile
): string[] {
    const specifiers: string[] = [];
    const visit = (node: ts.Node): void => {
        const specifier =
            valueEdgeSpecifier(node) ?? dynamicEdgeSpecifier(node);
        if (specifier) {
            specifiers.push(specifier);
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return specifiers;
}

/**
 * Walks the value-import graph reachable from `entryFiles` (absolute
 * paths). Pure BFS over the file system / AST -- no TypeScript
 * `Program`/type-checker is created, so this stays fast even for an
 * app-wide walk.
 */
export function walkReachability(entryFiles: string[]): ReachabilityResult {
    const options = getCompilerOptions();
    const resolutionHost: ts.ModuleResolutionHost = ts.sys;

    const reachedFiles = new Set<string>();
    const externals = new Set<string>();
    const visited = new Set<string>();
    const queue: string[] = [...entryFiles];

    while (queue.length > 0) {
        const filePath = queue.shift() as string;
        if (visited.has(filePath)) {
            continue;
        }
        visited.add(filePath);
        if (!ts.sys.fileExists(filePath)) {
            continue;
        }
        reachedFiles.add(filePath);

        const text = readFileSync(filePath, 'utf8');
        const sourceFile = ts.createSourceFile(
            filePath,
            text,
            options.target ?? ts.ScriptTarget.Latest,
            /* setParentNodes */ true,
            filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
        );

        for (const specifierText of collectValueEdgeSpecifiers(sourceFile)) {
            const resolution = ts.resolveModuleName(
                specifierText,
                filePath,
                options,
                resolutionHost
            );
            const resolved = resolution.resolvedModule;

            if (!resolved) {
                // Unresolvable specifier -- e.g. a bare package TypeScript
                // can't locate types for outside a full Program. Record it
                // as external rather than silently dropping it.
                externals.add(specifierText);
                continue;
            }
            // TypeScript always returns `resolvedFileName` with forward
            // slashes, even on Windows -- normalize to the platform
            // separator before any path comparison/lookup below, or a
            // Windows `SRC_ROOT` (backslashes) would never match and every
            // in-app file would be misreported as external.
            const resolvedFileName = path.normalize(resolved.resolvedFileName);
            if (
                resolved.isExternalLibraryImport ||
                resolvedFileName.includes('node_modules')
            ) {
                externals.add(specifierText);
                continue;
            }
            if (resolvedFileName.endsWith('.d.ts')) {
                // Declaration-only resolution -- no runtime file to walk.
                continue;
            }
            if (!resolvedFileName.startsWith(SRC_ROOT)) {
                // Resolves outside this package's own src/ (e.g. a sibling
                // workspace package via a path mapping) -- treat as
                // external rather than reaching across package boundaries.
                externals.add(specifierText);
                continue;
            }
            if (!visited.has(resolvedFileName)) {
                queue.push(resolvedFileName);
            }
        }
    }

    const files = [...reachedFiles]
        .filter((f) => f.startsWith(SRC_ROOT) && !f.endsWith('.d.ts'))
        .map((f) => toPosix(path.relative(SRC_ROOT, f)));

    return { files, externals: [...externals] };
}

/** Absolute path helper for entry files, e.g. `entryFile('index.ts')`. */
export function entryFile(relativeToSrc: string): string {
    return path.join(SRC_ROOT, relativeToSrc);
}
