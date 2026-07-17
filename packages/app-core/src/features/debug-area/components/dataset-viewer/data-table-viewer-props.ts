import { type DataTableViewerProps } from '../data-table/data-table-viewer-types';

/**
 * The `DataTableViewer` prop-wiring shared by the Data and Source tabs: the sort
 * defaults, the sort/page handlers, the current page, and processing state. Only
 * `columns` and `data` differ between the two tabs, so keeping the rest in one
 * builder stops the two prop blocks from drifting apart.
 *
 * `sortEntry` is typed structurally (rather than importing the debug-state type)
 * to keep this helper decoupled from the state layer.
 */
export const getSharedDataTableViewerProps = <T>(args: {
    sortEntry: { colId: string; asc: boolean } | null;
    onSort: DataTableViewerProps<T>['onSort'];
    onChangePage: DataTableViewerProps<T>['onChangePage'];
    page: DataTableViewerProps<T>['paginationDefaultPage'];
    progressPending: boolean;
}): Pick<
    DataTableViewerProps<T>,
    | 'defaultSortFieldId'
    | 'defaultSortAsc'
    | 'onSort'
    | 'onChangePage'
    | 'paginationDefaultPage'
    | 'progressPending'
> => ({
    defaultSortFieldId: args.sortEntry?.colId ?? null,
    defaultSortAsc: args.sortEntry?.asc ?? false,
    onSort: args.onSort,
    onChangePage: args.onChangePage,
    paginationDefaultPage: args.page,
    progressPending: args.progressPending
});
