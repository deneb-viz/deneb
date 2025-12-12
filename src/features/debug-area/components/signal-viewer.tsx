import React, { useMemo } from 'react';
import toPairs from 'lodash/toPairs';
import isObjectLike from 'lodash/isObjectLike';
import { TableColumn } from 'react-data-table-component';

import { useDebugStyles } from '..';
import { DataTableViewer } from './data-table-viewer';
import { ISignalTableDataRow } from '../types';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { logRender } from '@deneb-viz/utils/logging';
import { stringifyPruned } from '@deneb-viz/utils/object';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { DataTableCell, NoDataMessage, SignalValue } from '@deneb-viz/app-core';

interface ISignalViewerProps {
    renderId: string;
}

/**
 * Handles display of signal data for the current Vega view.
 */
export const SignalViewer: React.FC<ISignalViewerProps> = ({ renderId }) => {
    const classes = useDebugStyles();
    const columns = useMemo(() => getTableColumns(renderId), [renderId]);
    const values = useMemo(() => getSignalTableValues(), [renderId]);
    logRender('SignalViewer', {
        columns,
        values,
        renderId
    });
    return values?.length ? (
        <div className={classes.container}>
            <div className={classes.contentWrapper}>
                <div className={classes.dataTableDetails}>
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
const getSignalTableValues = () =>
    toPairs<any>(VegaViewServices.getAllSignals()).map((s) => ({
        key: s[0],
        value: isObjectLike(s[1]) ? JSON.parse(stringifyPruned(s[1])) : s[1]
    }));

/**
 * Provides the necessary structure and rendering logic for the table columns.
 */
const getTableColumns = (
    renderId: string
): TableColumn<ISignalTableDataRow>[] => [
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
