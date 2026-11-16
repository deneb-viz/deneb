// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { findFilesContaining, readAppFiles, type SourceFile } from './_files';

/**
 * Canary: this visual never reaches the editor, and never reaches into the
 * Deneb visual's app. It must build and package from a checkout holding only
 * this app and the workspace packages it depends on.
 */
const EDITOR_SPECIFIERS = ['@deneb-viz/editor', 'monaco-editor'];
const DENEB_APP_REFERENCES = ['apps/deneb', '@deneb-viz/deneb', '../deneb/'];

// The canary's own needles must not count as references.
const files = readAppFiles().filter(
    (file) => !file.path.startsWith('src/__test__/invariants/')
);

describe('findFilesContaining (pure function)', () => {
    const synthetic: SourceFile[] = [
        { path: 'package.json', content: '{"@deneb-viz/editor": "*"}' },
        { path: 'src/a.ts', content: "import x from 'monaco-editor';" },
        { path: 'bin/b.js', content: "require('../../apps/deneb/bin/x');" },
        {
            path: 'src/clean.ts',
            content: "import { y } from '@deneb-viz/app-core';"
        }
    ];

    it('reports files naming an editor specifier', () => {
        expect(findFilesContaining(synthetic, EDITOR_SPECIFIERS)).toEqual([
            'package.json',
            'src/a.ts'
        ]);
    });

    it('reports files referencing the Deneb app', () => {
        expect(findFilesContaining(synthetic, DENEB_APP_REFERENCES)).toEqual([
            'bin/b.js'
        ]);
    });
});

describe('viewer boundaries', () => {
    it('reads a non-trivial file set (guards against a vacuous canary)', () => {
        expect(files.length).toBeGreaterThan(10);
        expect(files.map((file) => file.path)).toContain('package.json');
    });

    it('no source, script, config or manifest names the editor', () => {
        expect(findFilesContaining(files, EDITOR_SPECIFIERS)).toEqual([]);
    });

    it('nothing references the Deneb visual app', () => {
        expect(findFilesContaining(files, DENEB_APP_REFERENCES)).toEqual([]);
    });
});
