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
 * Scope: `packages/powerbi-host/src/lib/persistence/model/*.ts` (the generic
 * formattingSettings classes that back the formatting pane),
 * `src/app/settings-editor.ts` and
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
    /(?:displayNameKey|descriptionKey|disabledReasonKey|i18n)\s*[:=]\s*\r?\n?\s*'([^']+)'/g;

// matchAll iterates on an internal clone of the regex, so the shared
// pattern's lastIndex is never mutated across calls.
const extractKeys = (source: string): string[] =>
    [...source.matchAll(RESOURCE_KEY_PATTERN)].map((match) => match[1]);

const SETTINGS_MODEL_DIR = join(
    REPO_ROOT,
    'packages',
    'powerbi-host',
    'src',
    'lib',
    'persistence',
    'model'
);

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

const readJson = <T>(path: string): T =>
    JSON.parse(readFileSync(path, 'utf8')) as T;

/** Every `displayNameKey` and `descriptionKey` value in a capabilities tree. */
const extractCapabilityKeys = (node: unknown): string[] => {
    if (Array.isArray(node)) return node.flatMap(extractCapabilityKeys);
    if (node === null || typeof node !== 'object') return [];
    return Object.entries(node).flatMap(([key, value]) =>
        (key === 'displayNameKey' || key === 'descriptionKey') &&
        typeof value === 'string'
            ? [value]
            : extractCapabilityKeys(value)
    );
};

const capabilityKeys = extractCapabilityKeys(
    readJson(join(APP_ROOT, 'capabilities.json'))
);

// Distinct keys across all sources, sorted for stable, readable failure output.
const referencedKeys = [
    ...new Set([...settingsModelKeys, ...configurationKeys, ...capabilityKeys])
].sort();

// Power BI receives the strings shared by every visual (in powerbi-host)
// with this app's own resources merged over them; see
// webpack.common.config.js.
const sharedResources = readJson<{
    locale: string;
    values: Record<string, string>;
}>(
    join(REPO_ROOT, 'packages', 'powerbi-host', 'stringResources', 'en-US.json')
);

const appResources = readJson<Record<string, string>>(
    join(APP_ROOT, 'stringResources', 'en-US', 'resources.resjson')
);

const enUsResources = { ...sharedResources.values, ...appResources };

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

describe('en-US string resources', () => {
    it('declares the shared strings as en-US', () => {
        expect(sharedResources.locale).toBe('en-US');
    });

    it('keeps app strings out of the shared keys, so neither silently overrides the other', () => {
        expect(
            Object.keys(appResources).filter(
                (key) => key in sharedResources.values
            )
        ).toEqual([]);
    });

    // Dead strings would still be sent for translation.
    it('holds only strings the settings models, configuration or capabilities use', () => {
        const used = new Set(referencedKeys);
        expect(
            Object.keys(enUsResources).filter((key) => !used.has(key))
        ).toEqual([]);
    });
});

/**
 * A setting reads the same in the format pane as in the settings pane. The
 * two use separate string systems (Power BI resources and the visual's
 * translations), so this pairs each format pane key with the settings
 * pane's key for the same text.
 */
const SETTINGS_PANE_TEXT: Record<string, { source: string; key: string }> = {
    Objects_Interactivity_Group_Tooltips: {
        source: 'app',
        key: 'PowerBI_Objects_Vega_Tooltips'
    },
    Objects_Vega_EnableTooltips: {
        source: 'app',
        key: 'PowerBI_Objects_Vega_EnableTooltips'
    },
    Objects_Vega_EnableTooltips_Description: {
        source: 'app',
        key: 'PowerBI_Assistive_Text_Tooltip'
    },
    Objects_Interactivity_Group_ContextMenu: {
        source: 'app',
        key: 'PowerBI_Objects_Vega_ContextMenu'
    },
    Objects_Vega_EnableContextMenu: {
        source: 'app',
        key: 'PowerBI_Objects_Vega_EnableContextMenu'
    },
    Objects_Vega_EnableContextMenu_Description: {
        source: 'app',
        key: 'PowerBI_Assistive_Text_ContextMenu'
    },
    Objects_Vega_EnableContextMenuSelector: {
        source: 'app',
        key: 'PowerBI_Objects_Vega_EnableContextMenuSelector'
    },
    Objects_Vega_EnableContextMenuSelector_Description: {
        source: 'app',
        key: 'PowerBI_Assistive_Text_ContextMenuSelector'
    },
    Objects_Interactivity_Group_CrossFiltering: {
        source: 'app',
        key: 'PowerBI_Objects_Vega_CrossFiltering'
    },
    Objects_Vega_EnableSelection: {
        source: 'app',
        key: 'PowerBI_Objects_Vega_EnableSelection'
    },
    Objects_Vega_EnableSelection_Description: {
        source: 'app',
        key: 'PowerBI_Assistive_Text_Selection'
    },
    Objects_Vega_SelectionMode: {
        source: 'app',
        key: 'PowerBI_Objects_Vega_SelectionMode'
    },
    Objects_Vega_SelectionMode_Description: {
        source: 'app',
        key: 'PowerBI_Assistive_Text_SelectionMode'
    },
    Enum_SelectionMode_Simple: {
        source: 'app',
        key: 'PowerBI_Enum_SelectionMode_Simple'
    },
    Enum_SelectionMode_Advanced: {
        source: 'app',
        key: 'PowerBI_Enum_SelectionMode_Advanced'
    },
    Objects_Vega_SelectionMaxDataPoints: {
        source: 'app',
        key: 'PowerBI_Objects_Vega_SelectionMaxDataPoints'
    },
    Objects_Interactivity_Group_CrossHighlighting: {
        source: 'app',
        key: 'PowerBI_Objects_Vega_CrossHighlighting'
    },
    Objects_Vega_EnableHighlight: {
        source: 'app',
        key: 'PowerBI_Objects_Vega_EnableHighlight'
    },
    Objects_Vega_EnableHighlight_Description: {
        source: 'app',
        key: 'PowerBI_Assistive_Text_Highlight'
    },
    Objects_Vega_RenderMode: {
        source: 'app-core',
        key: 'Text_Vega_RenderMode'
    },
    Objects_Vega_RenderMode_Description: {
        source: 'app-core',
        key: 'Assistive_Text_RenderMode'
    },
    Objects_StateManagement_ScaleToZoom: {
        source: 'app-core',
        key: 'Text_Setting_ScaleToZoom'
    },
    Objects_StateManagement_ScaleToZoom_Description: {
        source: 'app-core',
        key: 'Assistive_Text_ScaleToZoom'
    }
};

const settingsPaneTranslations: Record<string, Record<string, string>> = {
    app: readJson(join(APP_ROOT, 'src', 'i18n', 'en-US.json')),
    'app-core': readJson(
        join(REPO_ROOT, 'packages', 'app-core', 'src', 'i18n', 'en-US.json')
    )
};

describe('format pane text matches the settings pane', () => {
    it.each(Object.entries(SETTINGS_PANE_TEXT))(
        '%s',
        (formatPaneKey, { source, key }) => {
            expect(enUsResources[formatPaneKey]).toBe(
                settingsPaneTranslations[source][key]
            );
        }
    );
});
