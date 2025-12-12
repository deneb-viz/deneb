import { useMemo } from 'react';
import { TableColumn } from 'react-data-table-component';

import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { logRender } from '@deneb-viz/utils/logging';
import { stringifyPruned } from '@deneb-viz/utils/object';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { makeStyles } from '@fluentui/react-components';
import {
    PREVIEW_PANE_TOOLBAR_MIN_SIZE,
    SPLIT_PANE_HANDLE_SIZE
} from '../../../../lib';
import { DataTableViewer } from '../data-table/data-table';
import { NoDataMessage } from '../no-data-message';
import { DataTableCell } from '../data-table/data-table-cell';
import { SignalValue } from './signal-value';

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

const useSignalViewerStyles = makeStyles({
    container: {
        height: `calc(100% - ${PREVIEW_PANE_TOOLBAR_MIN_SIZE}px - ${
            SPLIT_PANE_HANDLE_SIZE / 2
        }px)`
    },
    wrapper: {
        display: 'flex',
        height: '100%',
        maxHeight: '100%',
        flexDirection: 'column'
    },
    details: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        overflow: 'auto'
    }
});

/**
 * Handles display of signal data for the current Vega view.
 */
export const SignalViewer = ({ renderId }: SignalViewerProps) => {
    const classes = useSignalViewerStyles();
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
                    <DataTableViewer columns={columns} data={values} />
                </div>
            </div>
        </div>
    ) : (
        <NoDataMessage />
    );
};

/**
 * For the Signals table, this swaps out the key/value pairs into an array of
 * entries, suitable for tabulator.
 */
const getSignalTableValues = () => {
    const signals = VegaViewServices.getAllSignals();
    return Object.entries(signals).map(([key, value]) => ({
        key,
        value:
            value !== null && typeof value === 'object' && !Array.isArray(value)
                ? JSON.parse(stringifyPruned(value))
                : value
    }));
};

/**
 * Provides the necessary structure and rendering logic for the table columns.
 */
const getTableColumns = (
    renderId: string
): TableColumn<SignalTableDataRow>[] => [
    {
        name: getI18nValue('Pivot_Signals_KeyColumn'),
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
        name: getI18nValue('Pivot_Signals_ValueColumn'),
        id: 'value',
        grow: 5,
        selector: (row) => row.value,
        cell: (row) => (
            <SignalValue
                signalName={row.key}
                initialValue={row.value}
                renderId={renderId}
            />
        )
    }
];
