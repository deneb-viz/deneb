import type { ReactNode } from 'react';

/**
 * Local column contract for `DataTableViewer`, decoupled from any table
 * library. Only the fields the three debug-area viewers (Data tab, Source
 * tab, Signal viewer) genuinely use are modelled here — this replaces the
 * former dependency on react-data-table-component's `TableColumn` type.
 */
export interface DataTableViewerColumn<T> {
    /** Stable id — keyboard-nav registration + sort identity. */
    id: string;
    /** Header content (JSX via `DataTableHeaderCell`). */
    name: ReactNode;
    /**
     * Raw value accessor. Used for sorting (and, in principle, default cell
     * text — though every viewer supplies an explicit `cell`, so the text
     * role is unused today). Returns the underlying raw value so sorting
     * matches the previous rawValue-based `sortFunction` behaviour.
     */
    selector: (row: T) => unknown;
    /** When `false`/absent, the column header does not toggle sort. */
    sortable?: boolean;
    /**
     * Pre-computed pixel width (worker-measured for the dataset viewers).
     * Fed to the DataGrid's `columnSizingOptions` as the column's ideal
     * width. Optional — columns without a measured width fall back to the
     * grid's default sizing.
     */
    width?: number;
    /**
     * Cell renderer (JSX via `DataTableCell`). `rowIndex` is the
     * page-relative row index (0-based within the currently visible page),
     * matching what react-data-table-component passed previously.
     */
    cell: (row: T, rowIndex: number) => ReactNode;
}

/**
 * Local prop contract for `DataTableViewer`. Mirrors the exact set of props
 * the three viewers pass today, mapped off react-data-table-component's
 * `TableProps`. Sorting is reported up as `(colId, asc)` rather than rdt's
 * `(column, direction, rows)` triple.
 */
export interface DataTableViewerProps<T> {
    columns: DataTableViewerColumn<T>[];
    data: T[];
    /** Column id to seed the initial sort from (null/undefined => unsorted). */
    defaultSortFieldId?: string | null;
    /** Initial sort direction when `defaultSortFieldId` is set. */
    defaultSortAsc?: boolean;
    /** Reports a sort change up so it can be persisted in debug state. */
    onSort?: (colId: string, asc: boolean) => void;
    /** Reports a page change up so it can be persisted in debug state. */
    onChangePage?: (page: number) => void;
    /** Initial (1-based) page to display. */
    paginationDefaultPage?: number;
    /**
     * Retained for API parity with the previous contract. In practice the
     * tabs gate the loading state at the tab level (rendering
     * `ProcessingDataMessage`) so the viewer only mounts once processing is
     * complete; this flag is therefore always false at render time.
     */
    progressPending?: boolean;
}
