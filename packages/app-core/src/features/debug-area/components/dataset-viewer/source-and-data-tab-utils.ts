/**
 * Shared pure helpers for the Source and Data tabs of the dataset viewer.
 * Extracted so both tabs render from the same row-count, support-field, and
 * metadata-strip contract without dual-maintenance drift. No React, no
 * hooks, no Zustand — these are value-in, value-out.
 */

/**
 * Describes the metadata strip rendered at the top of each dataset-viewer
 * tab. Both tabs build one of these and hand it to a shared strip component;
 * new summary affordances are added as optional fields so existing callers
 * don't need to opt in.
 */
export type MetadataStripSpec = {
    rowCount: number;
    supportFields?: readonly string[];
    errorBadge?: boolean;
};

/**
 * Return the sorted list of support-field names present on a row (keys
 * matching `/^__.+__$/`). Source-tab metadata strip uses this to render a
 * Badge per support field. Sorted so the visual order is deterministic across
 * renders regardless of object-key iteration order.
 */
export const detectSupportFields = (
    row: Record<string, unknown> | undefined | null
): string[] => {
    if (!row) return [];
    return Object.keys(row)
        .filter((key) => /^__.+__$/.test(key))
        .sort();
};

/**
 * Return the row count of a dataset, treating null/undefined as empty.
 * Trivial today, centralised so a future provenance change (e.g. counting
 * filtered rows) has a single call site.
 */
export const getRowCount = (dataset: unknown[] | null | undefined): number =>
    dataset?.length ?? 0;
