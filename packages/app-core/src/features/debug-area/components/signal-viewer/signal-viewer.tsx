import { useMemo } from 'react';
import { TableColumn } from 'react-data-table-component';

import { logRender } from '@deneb-viz/utils/logging';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { DataTableViewer } from '../data-table/data-table';
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
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
    return values?.length ? (
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
    ) : (
        <NoDataMessage />
    );
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
): TableColumn<SignalTableDataRow>[] => {
    const { translate } = getDenebState().i18n;
    return [
        {
            name: translate('Pivot_Signals_KeyColumn'),
            id: 'key',
            selector: (row) => row.key,
            sortable: true,
            grow: 2,
            cell: (row) => (
                <DataTableCell
                    displayValue={row.key}
                    field={row.key}
                    rawValue={row.key}
                />
            )
        },
        {
            name: translate('Pivot_Signals_ValueColumn'),
            id: 'value',
            grow: 5,
            selector: (row) => row.key, // Use key for sorting since value is fetched dynamically
            cell: (row) => (
                <SignalValue signalName={row.key} renderId={renderId} />
            )
        }
    ];
};
