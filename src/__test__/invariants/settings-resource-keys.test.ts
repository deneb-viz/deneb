// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './_packages';

/**
 * Canary: every `displayNameKey` / `descriptionKey` (and the equivalent
 * `i18n` field used by the debug-pane log-level configuration) referenced by
 * the visual's settings models must resolve to an entry in the en-US
 * resource file. A typo'd or never-added key silently falls back to raw-key
 * display text in the Power BI formatting pane (audit finding, fix 4.5) -
 * this canary converts that class of drift into a CI failure instead of a
 * user-visible "Objects_Foo_Bar" string in production.
 *
 * Scope: `src/lib/persistence/model/*.ts` (the formattingSettings classes
 * that back the formatting pane) plus `packages/configuration/src/index.ts`
 * (the log-level enum configuration consumed by the debug pane / Vega
 * logging settings). Both source string literal keys via a regex scan
 * rather than instantiating the formattingSettings classes - those extend
 * `powerbi-visuals-utils-formattingmodel` types that expect a live
 * PowerBI formatting-pane object, which is out of scope for a lightweight
 * node-environment canary.
 */

const RESOURCE_KEY_PATTERN =
    /(?:displayNameKey|descriptionKey|i18n)\s*[:=]\s*\r?\n?\s*'([^']+)'/g;

const extractKeys = (source: string): string[] => {
    const found: string[] = [];
    let match: RegExpExecArray | null;
    // Reset lastIndex-bearing global regex state per call.
    RESOURCE_KEY_PATTERN.lastIndex = 0;
    while ((match = RESOURCE_KEY_PATTERN.exec(source)) !== null) {
        found.push(match[1]);
    }
    return found;
};

const SETTINGS_MODEL_DIR = join(
    REPO_ROOT,
    'src',
    'lib',
    'persistence',
    'model'
);

const settingsModelKeys = readdirSync(SETTINGS_MODEL_DIR)
    .filter((file) => file.endsWith('.ts'))
    .flatMap((file) =>
        extractKeys(readFileSync(join(SETTINGS_MODEL_DIR, file), 'utf8'))
    );

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
        join(REPO_ROOT, 'stringResources', 'en-US', 'resources.resjson'),
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

    it.each(referencedKeys)('%s resolves to an en-US entry', (key) => {
        expect(Object.prototype.hasOwnProperty.call(enUsResources, key)).toBe(
            true
        );
    });
});
