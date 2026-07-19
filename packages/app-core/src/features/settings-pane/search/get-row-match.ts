import type { RowMatch, SectionMatchView } from './types';

/**
 * Look up the row match for a given row id. Returns `undefined` when
 * the view is absent (no active filter) and `null` when the row is
 * explicitly filtered out.
 *
 * Shared by `general-settings.tsx` and `performance-settings.tsx` — both
 * row components look up their own `RowMatch` from the section-level
 * `sectionMatchView` prop so the section-level prop drilling stays
 * simple.
 */
export const getRowMatch = (
    view: SectionMatchView | null | undefined,
    rowId: string
): RowMatch | undefined | null => {
    if (!view) return undefined;
    const match = view.rows.get(rowId);
    if (!match) return null;
    return match.visible ? match : null;
};
