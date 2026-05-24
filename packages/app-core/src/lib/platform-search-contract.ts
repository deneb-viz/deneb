/**
 * Public contract types for platform contributions to the settings-pane
 * search feature.
 *
 * Lives in lib/ so both consumers can depend on the shape without
 * importing through a feature folder:
 *   - features/settings-pane/search/resolve-descriptors.ts (implementer)
 *   - components/deneb-platform/types.ts (re-exporter for platforms)
 *
 * The settings-pane feature remains the authoritative implementer of
 * the resolution logic; this file owns only the shape that platforms
 * must produce and that the resolver consumes.
 */

/**
 * Translation function contract — matches the shape exposed by the
 * i18n slice of the Deneb state store.
 */
export type TranslateFn = (key: string) => string;

/**
 * Either a raw already-localised string, or a `{ key }` wrapper that
 * tells the resolver to call `translate(key)` instead.
 */
export type LocalisableText = string | { key: string };

/**
 * A single row in the platform contribution.
 */
export type PlatformSearchRow = {
    id: string;
    label: LocalisableText;
    assistive?: LocalisableText;
};

/**
 * Shape a platform provider supplies via
 * `settingsPanePlatformSearchable` to participate in the settings-pane
 * search filter.
 *
 * `id` must match the React `key` prop of the corresponding AccordionItem
 * element in `settingsPanePlatformComponent`. The pane uses that id to
 * decide whether the platform element is shortlisted by an active query
 * and to include it in the context menu's "Expand all" action.
 */
export type PlatformSearchContribution = {
    id: string;
    heading: LocalisableText;
    rows: readonly PlatformSearchRow[];
};
