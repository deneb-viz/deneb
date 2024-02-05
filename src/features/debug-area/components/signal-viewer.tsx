import React, { useMemo } from 'react';
import toPairs from 'lodash/toPairs';
import isObjectLike from 'lodash/isObjectLike';
import { TableColumn } from 'react-data-table-component';

import { useDebugStyles } from '..';
import { SignalValue } from './signal-value';
import { DataTableViewer } from './data-table-viewer';
import { NoDataMessage } from './no-data-message';
import { logRender } from '../../logging';
import { VegaViewServices } from '../../vega-extensibility';
import { stringifyPruned } from '../../../core/utils/json';
import { ISignalTableDataRow } from '../types';
import { getI18nValue } from '../../i18n';
import { DataTableCell } from './data-table-cell';

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
