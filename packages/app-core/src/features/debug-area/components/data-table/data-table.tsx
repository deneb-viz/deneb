import { useMemo, useRef, useState } from 'react';
import {
    createTableColumn,
    DataGrid,
    DataGridBody,
    DataGridCell,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridRow,
    makeStyles,
    tokens,
    type DataGridProps,
    type TableColumnDefinition
} from '@fluentui/react-components';

import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { DataTableStatusBar } from './data-table-status-bar';
import { DataTableTooltipProvider } from './data-table-tooltip-context';
import { DataTableInspectorProvider } from './inspector-popover-context';
import { DataTableKeyboardProvider } from './data-table-keyboard-context';
import { InspectorPopover } from './inspector-popover';
import { resolveNextSortState, sortRows } from './data-table-sort';
import { getPageSlice } from './data-table-pagination';
import type {
    DataTableViewerColumn,
    DataTableViewerProps
} from './data-table-viewer-types';
import {
    DATA_TABLE_FONT_FAMILY,
    DATA_TABLE_FONT_SIZE,
    DATA_TABLE_ROW_HEIGHT,
    DATA_TABLE_ROW_PADDING_LEFT
} from '../../constants';
import { useDenebState } from '../../../../state';

const useDataTableStyles = makeStyles({
    enclosure: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        width: '100%'
    },
    // The single scrollable region. `flexGrow: 1` + `minHeight: 0` lets it
    // consume the space above the status bar and scroll internally; the
    // status bar (a non-growing sibling below) stays pinned to the bottom.
    // This is the flex contract the abandoned v8 upgrade got wrong.
    scroll: {
        flexGrow: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'auto',
        position: 'relative'
    },
    grid: {
        fontFamily: DATA_TABLE_FONT_FAMILY,
        fontSize: `${DATA_TABLE_FONT_SIZE}px`,
        width: '100%'
    },
    // Pin the header while the body scrolls (the previous `fixedHeader`).
    header: {
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: tokens.colorNeutralBackground1
    },
    // Fluent's `extra-small` size variant drops the built-in row
    // borderBottom that medium/small carry, so the header/body divider is
    // restated here (mirrors the old rdt `headRow` customStyles).
    headerRow: {
        paddingLeft: `${DATA_TABLE_ROW_PADDING_LEFT}px`,
        minHeight: `${DATA_TABLE_ROW_HEIGHT}px`,
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: tokens.colorNeutralStroke3
    },
    headerCell: {
        color: tokens.colorNeutralForeground1,
        fontWeight: tokens.fontWeightBold,
        fontSize: `${DATA_TABLE_FONT_SIZE}px`,
        backgroundColor: tokens.colorNeutralBackground1,
        whiteSpace: 'nowrap'
    },
    row: {
        paddingLeft: `${DATA_TABLE_ROW_PADDING_LEFT}px`,
        minHeight: `${DATA_TABLE_ROW_HEIGHT}px`,
        color: tokens.colorNeutralForeground2,
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: tokens.colorNeutralStroke3
    },
    // Single-line cells with clipping, matching rdt's built-in cell chrome
    // (`overflow: hidden; white-space: nowrap`). Content never wraps — a
    // column narrower than its content clips instead of growing the row.
    cell: {
        fontSize: `${DATA_TABLE_FONT_SIZE}px`,
        alignItems: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
    }
});

type LocalSortState = NonNullable<DataGridProps['sortState']>;

/**
 * Displays a table of data, either for a dataset or the signals in the Vega
 * view. Built on Fluent UI's `DataGrid`, with sorting and pagination owned
 * locally (external to the grid) so the FULL dataset is sorted before being
 * paged — matching the previous react-data-table-component behaviour.
 */
export const DataTableViewer = ({
    columns,
    data,
    defaultSortFieldId,
    defaultSortAsc = false,
    onSort,
    onChangePage,
    paginationDefaultPage
    // `progressPending` is intentionally not consumed: the tabs gate the
    // loading state upstream (rendering `ProcessingDataMessage`), so the
    // viewer only mounts with real rows. Kept in the prop contract for parity.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: DataTableViewerProps<any>) => {
    const { debugTableRowsPerPage } = useDenebState((state) => ({
        debugTableRowsPerPage: state.editorPreferences.dataViewerRowsPerPage
    }));
    const classes = useDataTableStyles();
    logRender('DataTableViewer');

    // Look up a column definition by its id — used by the sort helper and the
    // per-cell render path.
    const columnsById = useMemo(() => {
        const map = new Map<string, DataTableViewerColumn<unknown>>();
        columns.forEach((c) => map.set(c.id, c));
        return map;
    }, [columns]);

    const colOrder = useMemo(() => {
        const ids = columns.map((c) => String(c.id ?? ''));
        const filtered = ids.filter((id) => id !== '');
        if (filtered.length !== ids.length) {
            // Columns without an id can't participate in roving-tabindex
            // arrow navigation (cells in them register under their field
            // name but resolveArrowTarget can't locate the column). Warn
            // so callers notice the gap during development.
            logDebug(
                `DataTableViewer: ${ids.length - filtered.length} column(s) have no id and will be excluded from arrow-key navigation.`
            );
        }
        return filtered;
    }, [columns]);

    // `rowCount` reflects the FULL dataset length (not the visible page),
    // preserving the exact value the keyboard provider received previously.
    const rowCount = data?.length ?? 0;

    // Fluent column definitions. `renderCell`/`compare` are intentionally
    // inert: cells are rendered directly in the DataGridRow body below (so we
    // can pass the row index), and sorting is external (see `sortedRows`).
    // CAUTION: Fluent decides header sortability by the DECLARED ARITY of
    // `compare` (`isColumnSortable` is `column.compare.length > 0`), so the
    // no-op must take two parameters for sortable columns — an arity-0 no-op
    // silently disables header clicks. Non-sortable columns get the arity-0
    // form deliberately, which also suppresses their sort affordance.
    const gridColumns = useMemo<TableColumnDefinition<unknown>[]>(
        () =>
            columns.map((column) =>
                createTableColumn<unknown>({
                    columnId: column.id,
                    compare: column.sortable
                        ? (_a: unknown, _b: unknown) => 0
                        : () => 0,
                    renderHeaderCell: () => column.name,
                    renderCell: () => null
                })
            ),
        [columns]
    );

    // Per-column ideal/min widths from the worker-measured sizes.
    const sizingOptions = useMemo<
        NonNullable<DataGridProps['columnSizingOptions']>
    >(() => {
        const options: NonNullable<DataGridProps['columnSizingOptions']> = {};
        columns.forEach((column) => {
            if (typeof column.width === 'number') {
                options[column.id] = {
                    idealWidth: column.width,
                    minWidth: Math.min(column.width, 48)
                };
            }
        });
        return options;
    }, [columns]);

    // Controlled sort state, seeded once from the persisted default. Header
    // clicks update it (and report up via `onSort`); the actual row ordering
    // is applied by `sortRows` over the full dataset.
    const [sortState, setSortState] = useState<LocalSortState>(() =>
        defaultSortFieldId
            ? {
                  sortColumn: defaultSortFieldId,
                  sortDirection: defaultSortAsc ? 'ascending' : 'descending'
              }
            : { sortColumn: undefined, sortDirection: 'ascending' }
    );

    const handleSortChange: DataGridProps['onSortChange'] = (_e, nextSort) => {
        if (nextSort.sortColumn === undefined) return;
        const column = columnsById.get(String(nextSort.sortColumn));
        // Only sortable columns participate — mirrors rdt, where the signal
        // "value" column (no `sortable`) ignores header clicks.
        if (!column?.sortable) return;
        // Tri-state cycle: unsorted → ascending → descending → unsorted.
        const resolved = resolveNextSortState(sortState, nextSort);
        setSortState(resolved);
        if (resolved.sortColumn === undefined) {
            // Cleared — the tabs' handlers treat a falsy colId as "remove
            // the persisted sort entry" (rows return to dataset order).
            onSort?.('', false);
            return;
        }
        onSort?.(
            String(resolved.sortColumn),
            resolved.sortDirection === 'ascending'
        );
    };

    // External sort over the FULL dataset, before pagination. DataGrid's
    // internal compare is a no-op, so it never re-orders the page.
    const sortedRows = useMemo(() => {
        const column =
            sortState.sortColumn !== undefined
                ? columnsById.get(String(sortState.sortColumn))
                : null;
        return sortRows(data, column, sortState.sortDirection === 'ascending');
    }, [data, columnsById, sortState.sortColumn, sortState.sortDirection]);

    const perPage = debugTableRowsPerPage as number;
    const [page, setPage] = useState<number>(paginationDefaultPage ?? 1);

    const pageRows = useMemo(
        () => getPageSlice(sortedRows, page, perPage),
        [sortedRows, page, perPage]
    );

    const handleChangePage = (nextPage: number) => {
        setPage(nextPage);
        onChangePage?.(nextPage);
    };

    // Match rdt's `recalculatePage`: clamp the current page to the new page
    // count when rows-per-page changes (NOT first-visible-row preservation).
    const handleChangeRowsPerPage = (
        newPerPage: number,
        currentPage: number
    ) => {
        const numPages = Math.max(1, Math.ceil(rowCount / newPerPage));
        const nextPage = Math.min(currentPage, numPages);
        setPage(nextPage);
        onChangePage?.(nextPage);
    };

    // Owns the viewer-level scrollable enclosure reference so the inspector
    // popover can scope its scroll-dismissal listener to this viewer only —
    // scrolls in a sibling viewer no longer dismiss our popover. The listener
    // is capture-phase, so scrolls from the inner scroll region are caught.
    const enclosureRef = useRef<HTMLDivElement>(null);

    return (
        <DataTableInspectorProvider>
            <DataTableKeyboardProvider colOrder={colOrder} rowCount={rowCount}>
                <DataTableTooltipProvider>
                    <div ref={enclosureRef} className={classes.enclosure}>
                        <div className={classes.scroll}>
                            <DataGrid
                                className={classes.grid}
                                items={pageRows}
                                columns={gridColumns}
                                sortable
                                sortState={sortState}
                                onSortChange={handleSortChange}
                                resizableColumns
                                // Honour the worker-measured widths instead of
                                // compressing columns to fit the container —
                                // cumulative overflow scrolls horizontally in
                                // the enclosure, matching the previous rdt
                                // behaviour.
                                resizableColumnsOptions={{
                                    autoFitColumns: false
                                }}
                                columnSizingOptions={sizingOptions}
                                // 24px rows — matches DATA_TABLE_ROW_HEIGHT
                                // and rdt's `dense` chrome; Fluent's default
                                // `medium` renders 44px rows.
                                size='extra-small'
                                focusMode='none'
                                // No getRowId: Fluent's default rowId is the
                                // index within `items` (= pageRows), which is
                                // exactly the page-relative index the cell
                                // renderers expect (rdt parity).
                            >
                                <DataGridHeader className={classes.header}>
                                    <DataGridRow className={classes.headerRow}>
                                        {({ renderHeaderCell }) => (
                                            <DataGridHeaderCell
                                                className={classes.headerCell}
                                            >
                                                {renderHeaderCell()}
                                            </DataGridHeaderCell>
                                        )}
                                    </DataGridRow>
                                </DataGridHeader>
                                <DataGridBody<unknown>>
                                    {({ item, rowId }) => (
                                        <DataGridRow<unknown>
                                            key={rowId}
                                            className={classes.row}
                                        >
                                            {({ columnId }) => (
                                                <DataGridCell
                                                    className={classes.cell}
                                                >
                                                    {columnsById
                                                        .get(String(columnId))
                                                        ?.cell(
                                                            item,
                                                            Number(rowId)
                                                        )}
                                                </DataGridCell>
                                            )}
                                        </DataGridRow>
                                    )}
                                </DataGridBody>
                            </DataGrid>
                        </div>
                        {/* Match rdt: the pagination bar is hidden when there
                            are zero rows (rdt's `enabledPagination` required
                            `data.length > 0`). */}
                        {rowCount > 0 && (
                            <DataTableStatusBar
                                rowCount={rowCount}
                                rowsPerPage={perPage}
                                currentPage={page}
                                onChangePage={handleChangePage}
                                onChangeRowsPerPage={handleChangeRowsPerPage}
                            />
                        )}
                    </div>
                </DataTableTooltipProvider>
                <InspectorPopover scrollContainerRef={enclosureRef} />
            </DataTableKeyboardProvider>
        </DataTableInspectorProvider>
    );
};
