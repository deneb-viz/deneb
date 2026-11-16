import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Absolute path to this visual app's root (this file lives at src/__test__/invariants). */
export const APP_ROOT = join(__dirname, '..', '..', '..');

export type SourceFile = {
    /** Path relative to the app root, with forward slashes. */
    path: string;
    content: string;
};

const SKIPPED_DIRECTORIES = new Set([
    'node_modules',
    '.tmp',
    'dist',
    'stringResources',
    'assets'
]);

const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
            return SKIPPED_DIRECTORIES.has(entry) ? [] : walk(path);
        }
        return [path];
    });

/**
 * Every text file this app owns (sources, scripts, configs and manifests),
 * excluding installed and generated output, string resources and binary
 * assets.
 */
export const readAppFiles = (): SourceFile[] =>
    walk(APP_ROOT)
        .filter((path) => /\.(ts|tsx|js|json|less)$/.test(path))
        .map((path) => ({
            path: relative(APP_ROOT, path).split(sep).join('/'),
            content: readFileSync(path, 'utf8')
        }));

export const readAppJson = <T>(fileName: string): T => {
    const path = join(APP_ROOT, fileName);
    if (!existsSync(path)) {
        throw new Error(`${fileName} not found in the app root`);
    }
    return JSON.parse(readFileSync(path, 'utf8')) as T;
};

/** Paths of the files whose content contains any of the given needles. */
export const findFilesContaining = (
    files: SourceFile[],
    needles: string[]
): string[] =>
    files
        .filter((file) =>
            needles.some((needle) => file.content.includes(needle))
        )
        .map((file) => file.path);
