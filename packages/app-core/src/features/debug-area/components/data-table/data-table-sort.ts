import type { DataTableViewerColumn } from './data-table-viewer-types';

export interface ViewerSortState {
    sortColumn: string | number | undefined;
    sortDirection: 'ascending' | 'descending';
}

/**
 * Resolve the next controlled sort state from a DataGrid header click,
 * upgrading Fluent's native two-state toggle to a tri-state cycle:
 * unsorted → ascending → descending → unsorted.
 *
 * Fluent's `toggleColumnSort` emits `ascending` for a newly-clicked column
 * and flips direction on repeat clicks — it never emits "unsorted". Because
 * the viewer controls `sortState`, a desc→asc flip on the SAME column is
 * interpreted as the third click and clears the sort instead.
 */
export const resolveNextSortState = (
    current: ViewerSortState,
    next: ViewerSortState
): ViewerSortState =>
    current.sortColumn !== undefined &&
    current.sortColumn === next.sortColumn &&
    current.sortDirection === 'descending' &&
    next.sortDirection === 'ascending'
        ? { sortColumn: undefined, sortDirection: 'ascending' }
        : next;

/**
 * Sort the FULL row set by a column's `selector`, external to the DataGrid.
 *
 * Deliberately owns sorting rather than delegating to the DataGrid's internal
 * `compare`: the grid only ever receives the current page's rows, so its
 * internal sort would order a single page. Sorting the whole set here (before
 * pagination slices it) reproduces react-data-table-component's behaviour.
 *
 * Ordering rules:
 * - numbers compared numerically, dates chronologically, booleans false<true,
 *   everything else via `localeCompare` on the string form;
 * - `null`, `undefined`, and `NaN` are always ordered last, regardless of the
 *   sort direction;
 * - ties preserve the original input order (stable sort).
 *
 * Returns a new array; the input is never mutated. When no sortable column is
 * supplied, a shallow copy of the input (original order) is returned.
 */
export const sortRows = <T>(
    rows: T[],
    column: DataTableViewerColumn<T> | null | undefined,
    asc: boolean
): T[] => {
    if (!column || !column.selector) {
        return rows.slice();
    }
    const selector = column.selector;
    const direction = asc ? 1 : -1;
    return rows
        .map((row, index) => ({ row, index }))
        .sort((a, b) => {
            const compared = compareValues(
                selector(a.row),
                selector(b.row),
                direction
            );
            if (compared !== 0) {
                return compared;
            }
            // Stable tie-break on original position.
            return a.index - b.index;
        })
        .map((entry) => entry.row);
};

/**
 * Whether a value should be treated as "empty" for sorting and pushed to the
 * end. `NaN` is included because a numeric comparison against it yields `NaN`,
 * which would otherwise destabilise the sort.
 */
const isNil = (value: unknown): boolean =>
    value === null ||
    value === undefined ||
    (typeof value === 'number' && Number.isNaN(value));

/**
 * Three-way compare that keeps nil values last independent of `direction`, and
 * applies `direction` only to the comparison between two real values.
 */
const compareValues = (a: unknown, b: unknown, direction: number): number => {
    const aNil = isNil(a);
    const bNil = isNil(b);
    if (aNil && bNil) return 0;
    if (aNil) return 1; // a after b
    if (bNil) return -1; // a before b
    return baseCompare(a, b) * direction;
};

/**
 * Type-aware comparison of two non-nil values.
 */
const baseCompare = (a: unknown, b: unknown): number => {
    if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
    }
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() - b.getTime();
    }
    if (typeof a === 'boolean' && typeof b === 'boolean') {
        return a === b ? 0 : a ? 1 : -1;
    }
    return String(a).localeCompare(String(b));
};
