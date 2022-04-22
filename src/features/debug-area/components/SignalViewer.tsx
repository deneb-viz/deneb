import React from 'react';
import { ColumnDefinition } from 'react-tabulator';
import { StackItem } from '@fluentui/react/lib/Stack';
import toPairs from 'lodash/toPairs';
import { View, truthy } from 'vega';

import { DataTable } from './DataTable';
import { reactLog } from '../../../core/utils/reactLog';
import store from '../../../store';
import {
    dataTableStackItemStyles,
    getColumnHeaderTooltip,
    getFormattedValueForTable
} from '../data-table';
import { i18nValue } from '../../../core/ui/i18n';

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
        headerTooltip: (column) => getColumnHeaderTooltip(column),
        formatter: (cell, params, onRendered) => getFormattedValueForTable(cell)
    }
];

/**
 * For the Signals table, this swaps out the key/value pairs into an array of
 * entries, suitable for tabulator.
 */
const getSignalTableValues = (view: View) =>
    toPairs<any>(
        view.getState({ data: truthy, signals: truthy, recurse: true }).signals
    ).map((s) => ({ key: s[0], value: s[1] }));

/**
 * Handles display of signals in the debug area.
 */
export const SignalViewer: React.FC = () => {
    const { editorView } = store((state) => state);
    reactLog('Rendering [SignalViewer]');
    return (
        <>
            <StackItem grow styles={dataTableStackItemStyles}>
                <DataTable
                    columns={getSignalTableColumns()}
                    data={getSignalTableValues(editorView)}
                    layout='fitColumns'
                />
            </StackItem>
        </>
    );
};
