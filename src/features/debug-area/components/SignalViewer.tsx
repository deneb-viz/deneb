import React, { useEffect, useState } from 'react';
import { ColumnDefinition } from 'react-tabulator';
import { StackItem } from '@fluentui/react/lib/Stack';
import isObjectLike from 'lodash/isObjectLike';
import toPairs from 'lodash/toPairs';
import { View, truthy, debounce } from 'vega';

import { DataTable } from './DataTable';
import { reactLog } from '../../../core/utils/reactLog';
import {
    dataTableStackItemStyles,
    getCellTooltip,
    getColumnHeaderTooltip,
    getFormattedValueForTable
} from '../data-table';
import { i18nValue } from '../../../core/ui/i18n';
import { VegaViewServices } from '../../vega-extensibility';
import { stringifyPruned } from '../../../core/utils/json';
import { logDebug } from '../../logging';

/**
 * For the Signals table, our columns represent the key/value pairs from the
 * view state.
 */
const getSignalTableColumns = (): ColumnDefinition[] => [
    {
        title: i18nValue('Pivot_Signals_KeyColumn'),
        field: 'key',
        headerTooltip: (column) => getColumnHeaderTooltip(column)
    },
    {
        title: i18nValue('Pivot_Signals_ValueColumn'),
        field: 'value',
        widthGrow: 5,
        tooltip: (cell) => getCellTooltip(cell),
        headerTooltip: (column) => getColumnHeaderTooltip(column),
        formatter: (cell, params, onRendered) => getFormattedValueForTable(cell)
    }
];

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
 * Handles display of signals in the debug area.
 * This currently does not work as intended; will be fixed within this version.
 */
export const SignalViewer: React.FC = () => {
    // reactLog('Rendering [SignalViewer]');
    // const [key, setKey] = useState<number>(0);
    // const debounceSignal = debounce(100, () => setKey((key) => key + 1));
    // useEffect(() => {
    //     getSignalTableValues().forEach((s) => {
    //         logDebug(`Adding signal listener for ${s.key} = ${s.value}`);
    //         VegaViewServices.getView()?.addSignalListener(
    //             s.key,
    //             debounceSignal
    //         );
    //     });
    //     return () =>
    //         getSignalTableValues().forEach((s) => {
    //             logDebug(`Removing signal listener for ${s.key} = ${s.value}`);
    //             VegaViewServices.getView()?.removeSignalListener(
    //                 s.key,
    //                 debounceSignal
    //             );
    //         });
    // });
    return (
        <>
            <div>To be fixed soon.</div>
            {/* <StackItem grow styles={dataTableStackItemStyles}>
                <DataTable
                    name='signals'
                    columns={getSignalTableColumns()}
                    data={getSignalTableValues()}
                    layout='fitColumns'
                />
            </StackItem> */}
        </>
    );
};
