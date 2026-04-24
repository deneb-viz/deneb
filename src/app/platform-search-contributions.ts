import { type PlatformSearchContribution } from '@deneb-viz/app-core';

/**
 * Ordered list of React `key` identifiers for the platform-injected
 * accordion items in the Settings pane. Exported as the single source of
 * truth so `app.tsx` can assign keys by index rather than hardcoding
 * strings in two places. The parity test (see
 * `src/app/__test__/platform-search-contributions.test.ts`) asserts that
 * `platformSearchContributions[i].id === PLATFORM_SECTION_KEYS[i]` for
 * every entry, catching drift between this list and the contributions
 * array at build time rather than via silent "section never filters"
 * runtime bugs.
 */
export const PLATFORM_SECTION_KEYS = [
    'semantic-model',
    'tooltips',
    'contextmenu',
    'crossfilter',
    'crosshighlight'
] as const;

export type PlatformSectionKey = (typeof PLATFORM_SECTION_KEYS)[number];

/**
 * Search contributions for the platform-injected accordion items in the
 * Settings pane. Each entry's `id` MUST match the React `key` on the
 * corresponding JSX.Element passed via `settingsPanePlatformComponent`
 * (see `app.tsx`) — that's how the pane correlates the rendered section
 * with its searchable descriptor. Keep this list and the `key` attributes
 * in lockstep; {@link PLATFORM_SECTION_KEYS} is the shared key source.
 *
 * Declared at module scope so the array reference is stable across every
 * render of `App` — the `useMemo` inside app-core's `SettingsPane` re-runs
 * only when the value reference changes.
 */
export const platformSearchContributions: PlatformSearchContribution[] = [
    {
        id: 'semantic-model',
        heading: { key: 'Text_Settings_SemanticModel' },
        rows: [
            {
                id: 'consolidate-field-parameters',
                label: { key: 'Text_Setting_ConsolidateFieldParameters' },
                assistive: {
                    key: 'Assistive_Text_ConsolidateFieldParameters'
                }
            }
        ]
    },
    {
        id: 'tooltips',
        heading: { key: 'PowerBI_Objects_Vega_Tooltips' },
        rows: [
            {
                id: 'enable-tooltips',
                label: { key: 'PowerBI_Objects_Vega_EnableTooltips' }
            }
        ]
    },
    {
        id: 'contextmenu',
        heading: { key: 'PowerBI_Objects_Vega_ContextMenu' },
        rows: [
            {
                id: 'enable-contextmenu',
                label: { key: 'PowerBI_Objects_Vega_EnableContextMenu' }
            },
            {
                id: 'enable-contextmenu-selector',
                label: {
                    key: 'PowerBI_Objects_Vega_EnableContextMenuSelector'
                }
            }
        ]
    },
    {
        id: 'crossfilter',
        heading: { key: 'PowerBI_Objects_Vega_CrossFiltering' },
        rows: [
            {
                id: 'enable-selection',
                label: { key: 'PowerBI_Objects_Vega_EnableSelection' }
            }
        ]
    },
    {
        id: 'crosshighlight',
        heading: { key: 'PowerBI_Objects_Vega_CrossHighlighting' },
        rows: [
            {
                id: 'enable-highlight',
                label: { key: 'PowerBI_Objects_Vega_EnableHighlight' }
            }
        ]
    }
];
