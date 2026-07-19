import { useMemo } from 'react';

import { logRender } from '@deneb-viz/utils/logging';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { DataTableViewer } from '../data-table/data-table';
import { type DataTableViewerColumn } from '../data-table/data-table-viewer-types';
import { NoDataMessage } from '../no-data-message';
import { DataTableCell } from '../data-table/data-table-cell';
import { SignalValue } from './signal-value';
import { getDenebState } from '../../../../state';
import { useDebugWrapperStyles } from '../styles';

type SignalViewerProps = {
    renderId: string;
};

/**
 * Represents a row of data in the table for presenting signals and values.
 */
type SignalTableDataRow = {
    key: string;
    /**
     * Always `null` at the row-data layer; the actual signal value is fetched
     * lazily by the `SignalValue` cell component using the row's `key`.
     */
    value: null;
};

/**
 * Handles display of signal data for the current Vega view.
 */
export const SignalViewer = ({ renderId }: SignalViewerProps) => {
    const classes = useDebugWrapperStyles();
    const columns = useMemo(() => getTableColumns(renderId), [renderId]);
    const values = useMemo(() => getSignalTableValues(), [renderId]);
    logRender('SignalViewer', {
        columns,
        values,
        renderId
    });
    if (values?.length) {
        return (
            <div className={classes.container}>
                <div className={classes.wrapper}>
                    <div className={classes.details}>
                        <DataTableViewer
                            columns={columns}
                            data={values}
                            defaultSortFieldId={undefined}
                        />
                    </div>
                </div>
            </div>
        );
    }
    const reason =
        VegaViewServices.getView() === null ? 'view-unavailable' : 'no-signals';
    return <NoDataMessage reason={reason} />;
};

/**
 * For the Signals table, get the list of signal names. We only extract the keys here rather than values because some
 * Vega signals (particularly bin-related ones) contain accessor functions that throw errors when evaluated without a
 * proper `datum` context. The actual values are fetched safely in the SignalValue component.
 */
const getSignalTableValues = () => {
    const signals = VegaViewServices.getAllSignals();
    return Object.keys(signals).map((key) => ({
        key,
        value: null // Value will be fetched by SignalValue component
    }));
};

/**
 * Provides the necessary structure and rendering logic for the table columns.
 */
const getTableColumns = (
    renderId: string
): DataTableViewerColumn<SignalTableDataRow>[] => {
    const { translate } = getDenebState().i18n;
    return [
        {
            name: translate('Pivot_Signals_KeyColumn'),
            id: 'key',
            selector: (row) => row.key,
            sortable: true,
            // Fixed ideal widths in a ~2:5 ratio replace the previous
            // `grow` weights (auto-fit is disabled grid-wide, so these are
            // actual pixel sizes, user-resizable).
            width: SIGNAL_KEY_COLUMN_WIDTH,
            cell: (row) => (
                <DataTableCell
                    displayValue={row.key}
                    field={row.key}
                    rawValue={row.key}
                    inspectable={false}
                />
            )
        },
        {
            name: translate('Pivot_Signals_ValueColumn'),
            id: 'value',
            width: SIGNAL_VALUE_COLUMN_WIDTH,
            selector: (row) => row.key, // Use key for sorting since value is fetched dynamically
            cell: (row, rowIndex) => (
                <SignalValue
                    signalName={row.key}
                    renderId={renderId}
                    rowIndex={rowIndex}
                />
            )
        }
    ];
};

/** Fixed pixel widths replacing the former `grow: 2` / `grow: 5` weights. */
const SIGNAL_KEY_COLUMN_WIDTH = 200;
const SIGNAL_VALUE_COLUMN_WIDTH = 500;
