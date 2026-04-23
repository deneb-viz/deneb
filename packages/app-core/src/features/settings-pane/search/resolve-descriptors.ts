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
 * `labelKey` / `assistiveKey` becomes a concrete string here, and every
 * searchable surface is pre-lowered once so the match engine can compare
 * against `*Lower` fields directly (see the plan P2 #3 refactor — avoids
 * ~15k per-keystroke `.toLowerCase()` calls on constant translated text).
 *
 * Uses plain `.toLowerCase()` to stay consistent with the engine's
 * `computeHighlightRanges` and `resolveQuery` contracts — locale-bound
 * case folding is a documented scope boundary.
 */
export const resolveSectionSchema = (
    schema: SectionSchema,
    translate: TranslateFn
): ResolvedSectionDescriptor => {
    const heading = translate(schema.headingKey);
    return {
        id: schema.id,
        heading,
        headingLower: heading.toLowerCase(),
        rows: schema.rows.map((row) => {
            const label = translate(row.labelKey);
            const assistive =
                row.assistiveKey !== undefined
                    ? translate(row.assistiveKey)
                    : null;
            return {
                id: row.id,
                label,
                labelLower: label.toLowerCase(),
                assistive,
                assistiveLower:
                    assistive !== null ? assistive.toLowerCase() : null
            };
        })
    };
};

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
        const heading = resolveText(contribution.heading, translate);
        resolved.push({
            id: contribution.id,
            heading,
            headingLower: heading.toLowerCase(),
            rows: contribution.rows.map((row) => {
                const label = resolveText(row.label, translate);
                const assistive =
                    row.assistive !== undefined
                        ? resolveText(row.assistive, translate)
                        : null;
                return {
                    id: row.id,
                    label,
                    labelLower: label.toLowerCase(),
                    assistive,
                    assistiveLower:
                        assistive !== null ? assistive.toLowerCase() : null
                };
            })
        });
    }
    return resolved;
};

/**
 * Normalise a raw query into the form the match engine expects.
 *
 * The engine compares case-folded strings strictly, so the pane
 * trims and lower-cases the user input here. Uses plain `toLowerCase`
 * to stay consistent with the engine's `computeHighlightRanges` (both
 * sides of the comparison must fold identically, or Turkish /
 * German edge cases produce spurious non-matches). Locale-bound search
 * is a documented scope boundary (see origin brainstorm).
 *
 * `locale` is accepted for forward compatibility but ignored today.
 */
export const resolveQuery = (raw: string, _locale?: string): string =>
    raw.trim().toLowerCase();
