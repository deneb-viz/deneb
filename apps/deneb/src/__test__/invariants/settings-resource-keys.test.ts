// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_ROOT, REPO_ROOT } from './_packages';

/**
 * Canary: every `displayNameKey` / `descriptionKey` (and the equivalent
 * `i18n` field used by the debug-pane log-level configuration) referenced by
 * the visual's settings models must resolve to an entry in the en-US
 * resource file. A typo'd or never-added key silently falls back to raw-key
 * display text in the Power BI formatting pane (audit finding, fix 4.5) -
 * this canary converts that class of drift into a CI failure instead of a
 * user-visible "Objects_Foo_Bar" string in production.
 *
 * Scope: `src/lib/persistence/model/*.ts` (the generic formattingSettings
 * classes that back the formatting pane), `src/app/settings-editor.ts` and
 * `src/app/visual-settings.ts` (the app-composed editor card), plus
 * `packages/configuration/src/index.ts` (the log-level enum configuration
 * consumed by the debug pane / Vega logging settings). All source string
 * literal keys via a regex scan rather than instantiating the
 * formattingSettings classes - those extend
 * `powerbi-visuals-utils-formattingmodel` types that expect a live
 * PowerBI formatting-pane object, which is out of scope for a lightweight
 * node-environment canary.
 */

const RESOURCE_KEY_PATTERN =
    /(?:displayNameKey|descriptionKey|i18n)\s*[:=]\s*\r?\n?\s*'([^']+)'/g;

// matchAll iterates on an internal clone of the regex, so the shared
// pattern's lastIndex is never mutated across calls.
const extractKeys = (source: string): string[] =>
    [...source.matchAll(RESOURCE_KEY_PATTERN)].map((match) => match[1]);

const SETTINGS_MODEL_DIR = join(APP_ROOT, 'src', 'lib', 'persistence', 'model');

const genericSettingsModelKeys = readdirSync(SETTINGS_MODEL_DIR)
    .filter((file) => file.endsWith('.ts'))
    .flatMap((file) =>
        extractKeys(readFileSync(join(SETTINGS_MODEL_DIR, file), 'utf8'))
    );

// The editor card composes onto the generic model from the app layer (see
// apps/deneb/src/app/visual-settings.ts) rather than living alongside the
// generic cards in SETTINGS_MODEL_DIR, so it is scanned separately.
const EDITOR_MODEL_FILES = [
    join(APP_ROOT, 'src', 'app', 'settings-editor.ts'),
    join(APP_ROOT, 'src', 'app', 'visual-settings.ts')
];

const editorModelKeys = EDITOR_MODEL_FILES.flatMap((file) =>
    extractKeys(readFileSync(file, 'utf8'))
);

const settingsModelKeys = [...genericSettingsModelKeys, ...editorModelKeys];

const configurationSource = readFileSync(
    join(REPO_ROOT, 'packages', 'configuration', 'src', 'index.ts'),
    'utf8'
);
const configurationKeys = extractKeys(configurationSource);

// Distinct keys across both sources, sorted for stable, readable failure output.
const referencedKeys = [
    ...new Set([...settingsModelKeys, ...configurationKeys])
].sort();

const enUsResources = JSON.parse(
    readFileSync(
        join(APP_ROOT, 'stringResources', 'en-US', 'resources.resjson'),
        'utf8'
    )
) as Record<string, string>;

describe('settings resource keys resolve to en-US entries', () => {
    it('finds referenced keys (guards against a vacuous canary)', () => {
        // Floor, not just non-zero: 99 distinct keys are referenced at the
        // time of writing, so a regex/scan-path drift that silently drops
        // keys from the extraction fails loudly here rather than shrinking
        // the canary's coverage unnoticed. Lower this floor only
        // deliberately (i.e. when keys are genuinely removed from the
        // settings models / configuration).
        expect(referencedKeys.length).toBeGreaterThanOrEqual(90);
    });

    it('counts the editor card keys composed from the app layer (guards against relocation silently shrinking coverage)', () => {
        expect(editorModelKeys.length).toBeGreaterThan(0);
        editorModelKeys.forEach((key) => {
            expect(referencedKeys).toContain(key);
        });
    });

    it.each(referencedKeys)('%s resolves to an en-US entry', (key) => {
        expect(Object.prototype.hasOwnProperty.call(enUsResources, key)).toBe(
            true
        );
    });
});
