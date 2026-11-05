// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
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
    visual: { guid: string; visualClassName: string; version: string };
    assets: { icon: string };
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

    // Power BI shows the icon at 20×20 in the Visualizations pane, beside
    // Deneb's. Deneb's is matched by hash so this holds without its app.
    it('has its own 20×20 icon, not Deneb’s', () => {
        const icon = readFileSync(join(APP_ROOT, pbiviz.assets.icon));
        const DENEB_ICON_SHA256 =
            '11eda39164e7154c31960eb867082cfe90dedef5fb2b8b9d81681dd6f187f03f';
        expect([icon.readUInt32BE(16), icon.readUInt32BE(20)]).toEqual([
            20, 20
        ]);
        expect(createHash('sha256').update(icon).digest('hex')).not.toBe(
            DENEB_ICON_SHA256
        );
    });

    // The shared kernel's migrations treat a stamped version below 2.0.0 as
    // a legacy visual and remap its interactivity settings on any version
    // change, so this visual must never be versioned below that line.
    it('is versioned at 2.0.0 or later', () => {
        const [major] = pbiviz.visual.version.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(2);
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
