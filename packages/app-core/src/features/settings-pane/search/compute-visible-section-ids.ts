/**
 * Pure helper: compute the list of section ids currently visible in the
 * settings pane accordion, used by the context menu's "Expand all" action.
 *
 * Platform contributors inject N sibling AccordionItem elements (one per
 * platform concern — tooltips, context menu, cross-filter, etc.) alongside
 * the core sections (General / Performance / Dataset). Each platform
 * element's id is the React `key` of its rendered element. Some of those
 * elements may register a `PlatformSearchContribution` (participating in
 * search) — others do not (always-visible fallback).
 *
 * - When no query is active, every core section is visible along with
 *   every mounted platform element.
 * - When a query is active, only matched sections are visible, plus any
 *   platform elements that did NOT register a contribution (they stay
 *   always-visible because they opted out of search).
 */
export type ComputeVisibleSectionIdsInput = {
    /** The active query (trimmed or raw — only emptiness matters here). */
    query: string;
    /** Sections currently matched by the match engine. */
    matchedSections: ReadonlySet<string>;
    /**
     * All platform section ids currently mounted (i.e. the React keys of
     * every `settingsPanePlatformComponent` entry). Rendered in array order
     * after the core sections.
     */
    platformSectionIds: readonly string[];
    /**
     * Subset of {@link platformSectionIds} that are registered as
     * searchable via `settingsPanePlatformSearchable`. Ids that appear in
     * `platformSectionIds` but NOT here are treated as always-visible
     * (opt-out of search) and appear during active queries too.
     */
    registeredPlatformIds: readonly string[];
};

/** Fixed order in which the core flat sections render. */
const CORE_SECTIONS: readonly string[] = ['general', 'performance', 'dataset'];

/**
 * Returns the ids of sections currently visible in the accordion, in render
 * order. Stable across calls for equivalent inputs. Deduplicates where a
 * platform id is both matched and always-visible.
 */
export const computeVisibleSectionIds = ({
    query,
    matchedSections,
    platformSectionIds,
    registeredPlatformIds
}: ComputeVisibleSectionIdsInput): string[] => {
    const isSearching = query.trim().length > 0;
    const registered = new Set(registeredPlatformIds);
    const alwaysVisiblePlatformIds = platformSectionIds.filter(
        (id) => !registered.has(id)
    );
    if (!isSearching) {
        return [...CORE_SECTIONS, ...platformSectionIds];
    }
    const seen = new Set<string>();
    const ids: string[] = [];
    const push = (id: string) => {
        if (seen.has(id)) return;
        seen.add(id);
        ids.push(id);
    };
    for (const id of CORE_SECTIONS) {
        if (matchedSections.has(id)) push(id);
    }
    // Matched platform ids, in the render order established by
    // `platformSectionIds` (so output order matches the accordion).
    for (const id of platformSectionIds) {
        if (matchedSections.has(id)) push(id);
    }
    // Always-visible platform elements (not registered for search).
    for (const id of alwaysVisiblePlatformIds) push(id);
    // Any other matched ids that weren't already covered (defensive —
    // keeps the helper robust to surprise ids without re-ordering).
    for (const id of matchedSections) push(id);
    return ids;
};
