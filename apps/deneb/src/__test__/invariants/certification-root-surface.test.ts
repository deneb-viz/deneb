// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from './_packages';

/**
 * Canary: the Microsoft certification file requirements that must hold at
 * the REPOSITORY ROOT (the repo the certification team reviews): an eslint
 * script, the sanctioned `npm run package` build command, and the
 * typescript / eslint / eslint-plugin-powerbi-visuals packages installed.
 * These live in the root manifest, which no other test guards - a
 * well-meaning cleanup could drop one and only fail at submission time.
 */
const rootManifest = JSON.parse(
    readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')
) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
};

describe('certification root surface', () => {
    it('root package.json has an eslint script', () => {
        expect(rootManifest.scripts?.eslint).toBeDefined();
    });

    it('root package.json has the sanctioned package script', () => {
        expect(rootManifest.scripts?.package).toBeDefined();
    });

    it.each(['typescript', 'eslint', 'eslint-plugin-powerbi-visuals'])(
        'root devDependencies contain %s',
        (dependency) => {
            expect(rootManifest.devDependencies?.[dependency]).toBeDefined();
        }
    );
});

const { selectVisualApp } = createRequire(__filename)(
    join(REPO_ROOT, 'bin', 'package-visual.js')
) as { selectVisualApp: (appsDir: string) => string };

/** Runs the selector over a throwaway apps/ folder; true marks a visual app. */
const selectAmong = (apps: Record<string, boolean>): string => {
    const appsDir = mkdtempSync(join(tmpdir(), 'visual-apps-'));
    try {
        for (const [name, isVisual] of Object.entries(apps)) {
            mkdirSync(join(appsDir, name));
            if (isVisual)
                writeFileSync(join(appsDir, name, 'pbiviz.json'), '{}');
        }
        return selectVisualApp(appsDir);
    } finally {
        rmSync(appsDir, { recursive: true, force: true });
    }
};

describe('root packaging scripts run in the visual app', () => {
    it.each(['package', 'package-alpha', 'package-beta', 'package-standalone'])(
        '%s goes through the visual selector',
        (script) => {
            expect(rootManifest.scripts?.[script]).toBe(
                `node bin/package-visual.js ${script}`
            );
        }
    );

    it('selects apps/deneb in this repository', () => {
        expect(selectVisualApp(join(REPO_ROOT, 'apps'))).toBe('deneb');
    });

    it('selects the only app with a pbiviz.json when apps/deneb is absent', () => {
        expect(selectAmong({ sample: false, viz: true })).toBe('viz');
    });

    it('refuses to choose between several visual apps when apps/deneb is absent', () => {
        expect(() => selectAmong({ one: true, two: true })).toThrow(
            /exactly one/
        );
    });
});
