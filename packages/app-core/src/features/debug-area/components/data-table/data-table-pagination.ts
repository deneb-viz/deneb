/**
 * Return the rows for a single (1-based) page from an already-sorted set.
 *
 * Clamping rules:
 * - `perPage <= 0` (or an empty input) yields an empty page;
 * - a `page` beyond the last page is clamped to the last page;
 * - a `page` below 1 is clamped to the first page.
 *
 * The input array is never mutated (`slice` returns a shallow copy).
 */
export const getPageSlice = <T>(
    rows: T[],
    page: number,
    perPage: number
): T[] => {
    if (perPage <= 0 || rows.length === 0) {
        return [];
    }
    const numPages = Math.max(1, Math.ceil(rows.length / perPage));
    const clampedPage = Math.min(Math.max(1, page), numPages);
    const start = (clampedPage - 1) * perPage;
    return rows.slice(start, start + perPage);
};
