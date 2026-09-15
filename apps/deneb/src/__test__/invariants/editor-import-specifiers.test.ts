// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { APP_ROOT, walkFiles } from './_packages';

/**
 * Canary: the visual consumes the editor from `@deneb-viz/editor`.
 *
 * `@deneb-viz/app-core` exports a single `.` entry carrying the viewer core,
 * so `@deneb-viz/app-core/editor` is not a resolvable module. Asserting that
 * no consumer imports it names the specifier in the failure instead of
 * leaving webpack to report a bare module-not-found. The scan derives the
 * file set from disk rather than listing consumers by name, so a new
 * editor-side import is covered automatically.
 */
const UNEXPORTED_SPECIFIER = '@deneb-viz/app-core/editor';
const EDITOR_SPECIFIER = '@deneb-viz/editor';

/** Every non-test TypeScript source file under apps/deneb/src: app-relative path → text. */
const sources = new Map(
    walkFiles(join(APP_ROOT, 'src'))
        .filter((file) => /\.(ts|tsx)$/.test(file))
        .filter((file) => !/__test__|\.test\./.test(file))
        .map((file) => [
            relative(APP_ROOT, file).split(sep).join('/'),
            readFileSync(file, 'utf8')
        ])
);

const importSpecifiers = (source: string): string[] =>
    [...source.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);

const filesImporting = (specifier: string): string[] =>
    [...sources]
        .filter(([, text]) =>
            importSpecifiers(text).some(
                (imported) =>
                    imported === specifier ||
                    imported.startsWith(`${specifier}/`)
            )
        )
        .map(([file]) => file);

describe('editor import specifiers', () => {
    it('scans a non-trivial number of source files (guards against a vacuous canary)', () => {
        expect(sources.size).toBeGreaterThan(20);
    });

    it('imports the editor from @deneb-viz/editor in at least one file', () => {
        expect(filesImporting(EDITOR_SPECIFIER).length).toBeGreaterThan(0);
    });

    it('imports nothing from the unexported @deneb-viz/app-core/editor subpath', () => {
        expect(filesImporting(UNEXPORTED_SPECIFIER)).toEqual([]);
    });
});
