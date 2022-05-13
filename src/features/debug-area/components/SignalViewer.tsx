import React, { useEffect, useState } from 'react';
import { ColumnDefinition } from 'react-tabulator';
import { StackItem } from '@fluentui/react/lib/Stack';
import toPairs from 'lodash/toPairs';
import { View, truthy, debounce } from 'vega';

import { DataTable } from './DataTable';
import { reactLog } from '../../../core/utils/reactLog';
import store from '../../../store';
import {
    dataTableStackItemStyles,
    getCellTooltip,
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
        tooltip: (cell) => getCellTooltip(cell),
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
        view?.getState({ data: truthy, signals: truthy, recurse: true }).signals
    ).map((s) => ({ key: s[0], value: s[1] }));

/**
 * Handles display of signals in the debug area.
 */
export const SignalViewer: React.FC = () => {
    const { editorView } = store((state) => state);
    reactLog('Rendering [SignalViewer]');
    const [key, setKey] = useState<number>(0);
    const debounceSignal = debounce(100, () => setKey((key) => key + 1));
    useEffect(() => {
        getSignalTableValues(editorView).forEach((s) => {
            editorView.addSignalListener(s.key, debounceSignal);
        });
        return () =>
            getSignalTableValues(editorView).forEach((s) => {
                editorView.removeSignalListener(s.key, debounceSignal);
            });
    });
    return (
        <>
            <StackItem grow styles={dataTableStackItemStyles}>
                <DataTable
                    name='signals'
                    columns={getSignalTableColumns()}
                    data={getSignalTableValues(editorView)}
                    layout='fitColumns'
                />
            </StackItem>
        </>
    );
};
