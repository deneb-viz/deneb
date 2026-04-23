/**
 * Pane-level descriptor resolver for the settings-pane search feature.
 *
 * Walks each static {@link SectionSchema} and an optional
 * {@link PlatformSearchContribution} and produces fully-resolved
 * {@link ResolvedSectionDescriptor} values consumable by the match
 * engine. The resolver owns all translation — the match engine sees
 * only strings.
 */
import type { SectionSchema } from './schema-types';
import type { ResolvedSectionDescriptor } from './types';

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

/**
 * Resolve a {@link LocalisableText} into a concrete string. Raw strings
 * pass through; `{ key }` variants are routed through `translate`.
 */
const resolveText = (text: LocalisableText, translate: TranslateFn): string =>
    typeof text === 'string' ? text : translate(text.key);

/**
 * Resolve a {@link SectionSchema} into a {@link ResolvedSectionDescriptor}.
 *
 * Pure — given the same schema + translate closure the output is
 * referentially stable within a single locale. Every row's
 * `labelKey` / `assistiveKey` becomes a concrete string here.
 */
export const resolveSectionSchema = (
    schema: SectionSchema,
    translate: TranslateFn
): ResolvedSectionDescriptor => ({
    id: schema.id,
    heading: translate(schema.headingKey),
    rows: schema.rows.map((row) => ({
        id: row.id,
        label: translate(row.labelKey),
        assistive:
            row.assistiveKey !== undefined ? translate(row.assistiveKey) : null
    }))
});

/**
 * Resolve a single platform-search contribution into a
 * {@link ResolvedSectionDescriptor}. Returns `null` when the
 * contribution is absent or has zero rows (the pane renders the
 * corresponding platform element as always-visible in that case).
 *
 * Preserved as a thin wrapper around {@link resolvePlatformSearchables}
 * for any single-contribution callsites; new code should prefer the
 * array-based resolver.
 */
export const resolvePlatformSearchable = (
    contribution: PlatformSearchContribution | null | undefined,
    translate: TranslateFn
): ResolvedSectionDescriptor | null => {
    const [resolved] = resolvePlatformSearchables(
        contribution ? [contribution] : [],
        translate
    );
    return resolved ?? null;
};

/**
 * Resolve an array of platform-search contributions into
 * {@link ResolvedSectionDescriptor} values, one per contribution.
 *
 * Platforms inject their settings pane UI as an array of sibling
 * AccordionItem elements (see `settingsPanePlatformComponent`), so the
 * search contract mirrors that: one contribution per injected element.
 * Each contribution's `id` is used verbatim as the resolved descriptor's
 * id and must match the React `key` of its AccordionItem so the pane
 * can filter / expand the element correctly.
 *
 * Contributions with zero rows are skipped (the corresponding element
 * falls back to always-visible behaviour). `null` / `undefined` inputs
 * short-circuit to an empty array.
 */
export const resolvePlatformSearchables = (
    contributions: readonly PlatformSearchContribution[] | null | undefined,
    translate: TranslateFn
): ResolvedSectionDescriptor[] => {
    if (!contributions || contributions.length === 0) return [];
    const resolved: ResolvedSectionDescriptor[] = [];
    for (const contribution of contributions) {
        if (contribution.rows.length === 0) continue;
        resolved.push({
            id: contribution.id,
            heading: resolveText(contribution.heading, translate),
            rows: contribution.rows.map((row) => ({
                id: row.id,
                label: resolveText(row.label, translate),
                assistive:
                    row.assistive !== undefined
                        ? resolveText(row.assistive, translate)
                        : null
            }))
        });
    }
    return resolved;
};

/**
 * Normalise a raw query into the form the match engine expects.
 *
 * The engine compares case-folded strings strictly, so the pane
 * trims and lower-cases the user input here. `locale` routes through
 * `toLocaleLowerCase` so locale-specific casing rules apply.
 */
export const resolveQuery = (raw: string, locale?: string): string =>
    raw.trim().toLocaleLowerCase(locale);
