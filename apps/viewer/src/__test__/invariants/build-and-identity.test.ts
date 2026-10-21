// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_ROOT, readAppJson } from './_files';

/**
 * Canary: build orchestration and identity invariants that live as strings
 * in manifests and scripts, where a well-meaning edit could silently break
 * them.
 */
const manifest = readAppJson<{
    name: string;
    scripts: Record<string, string>;
}>('package.json');
const pbiviz = readAppJson<{
    visual: { guid: string; visualClassName: string };
}>('pbiviz.json');
const capabilities = readAppJson<{
    advancedEditModeSupport?: number;
    objects: Record<string, unknown>;
}>('capabilities.json');
const entrySource = readFileSync(join(APP_ROOT, 'src', 'index.ts'), 'utf8');
const devRunner = readFileSync(
    join(APP_ROOT, 'bin', 'dev-with-prime.js'),
    'utf8'
);

describe('package build covers this visual and its dependencies', () => {
    it('builds the visual and the workspace packages it depends on, naming no other workspace', () => {
        expect(manifest.scripts['build:package']).toContain(
            `--filter=${manifest.name}...`
        );
        expect(manifest.scripts['build:package']).not.toContain('--filter=!');
    });

    it('validates certification config after building packages and before webpack packaging', () => {
        const script = manifest.scripts.package;
        const order = [
            'build:package',
            'validate-config-for-commit',
            'webpack:package'
        ].map((step) => script.indexOf(step));
        expect(order.every((index) => index >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
    });

    it('runs turbo over this visual and the workspace packages it depends on in dev', () => {
        expect(devRunner).toContain(`--filter=${manifest.name}...`);
    });
});

describe('visual identity', () => {
    it('uses the permanent GUID', () => {
        expect(pbiviz.visual.guid).toBe('denebRuntime');
    });

    it('exports the class pbiviz.json names, extending the kernel and only composing it', () => {
        expect(entrySource).toContain(
            `class ${pbiviz.visual.visualClassName} extends VisualKernel`
        );
        expect(entrySource).not.toContain('SAFETY_NET');
        expect(entrySource).not.toContain('destroy(');
    });

    it('declares no editor object and no advanced edit mode', () => {
        expect(capabilities.objects).not.toHaveProperty('editor');
        expect(capabilities.advancedEditModeSupport).toBeUndefined();
    });
});
