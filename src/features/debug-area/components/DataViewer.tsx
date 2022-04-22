import React, { useEffect, useState } from 'react';
import { ColumnDefinition } from 'react-tabulator';
import { Stack, StackItem } from '@fluentui/react/lib/Stack';
import {
    Dropdown,
    IDropdownOption,
    IDropdownStyles
} from '@fluentui/react/lib/Dropdown';
import { debounce, falsy, truthy, View } from 'vega';
import keys from 'lodash/keys';

import { reactLog } from '../../../core/utils/reactLog';
import { i18nValue } from '../../../core/ui/i18n';
import { horizontalDropdownStyles } from '../../../components/elements';
import store from '../../../store';
import { DataTable } from './DataTable';
import {
    dataTableStackItemStyles,
    getColumnHeaderTooltip,
    getColumnTooltip,
    getFormattedValueForTable
} from '../data-table';
import { DATASET_KEY_NAME, DATASET_NAME } from '../../../constants';

/**
 * Override regular dropdown width styling to handle longer names.
 */
const dropdownStyles: Partial<IDropdownStyles> = {
    ...horizontalDropdownStyles,
    ...{ dropdown: { width: 200 } }
};

/**
 * Obtains all current datasets from a Vega view.
 */
const getDatasets = (view: View): IDropdownOption[] =>
    keys(view?.getState({ data: truthy, signals: falsy, recurse: true }).data)
        .filter((key) => key !== 'root')
        .map((key) => ({ key, text: key }));

/**
 * For a dataset view, we need to dynamically get and assign columns from the
 * selected dataset from the view.
 */
const getDataTableColumns = (dataset: string, view: View): ColumnDefinition[] =>
    keys(view.data(dataset)?.[0])
        ?.filter((c) => c !== DATASET_KEY_NAME)
        ?.map((c) => ({
            title: c,
            field: c,
            tooltip: (cell) => getColumnTooltip(cell),
            headerTooltip: (column) => getColumnHeaderTooltip(column),
            formatter: (cell, params, onRendered) =>
                getFormattedValueForTable(cell)
        })) || [];

/**
 * Handles display of dataset info in the debug area.
 */
export const DataViewer: React.FC = () => {
    const { editorView } = store((state) => state);
    const dropdownOptions = getDatasets(editorView);
    const [selectedItem, setSelectedItem] = useState<IDropdownOption>(
        dropdownOptions?.find((d) => d.key === DATASET_NAME) || undefined
    );
    const [key, setKey] = useState<number>(0);
    const debounceData = debounce(100, () => setKey((key) => key + 1));
    const addListener = (name: string) => {
        editorView?.addDataListener(name, debounceData);
    };
    const handleChange = (
        ev: React.FormEvent<HTMLDivElement>,
        item: IDropdownOption
    ): void => {
        if (selectedItem) {
            editorView?.removeDataListener(selectedItem.text, debounceData);
        }
        addListener(item.text);
        setSelectedItem(item);
    };
    useEffect(() => {
        addListener(selectedItem?.text);
    }, []);
    reactLog('Rendering [DataViewer]');
    return (
        <>
            <StackItem>
                <Stack horizontal horizontalAlign='end'>
                    <Dropdown
                        styles={dropdownStyles}
                        options={dropdownOptions}
                        selectedKey={selectedItem?.key}
                        label={i18nValue('Pivot_Dataset_Select_Label')}
                        onChange={handleChange}
                    />
                </Stack>
            </StackItem>
            <StackItem grow key={key} styles={dataTableStackItemStyles}>
                {selectedItem ? (
                    <DataTable
                        columns={getDataTableColumns(
                            selectedItem.text,
                            editorView
                        )}
                        data={editorView.data(selectedItem.text)}
                        layout='fitData'
                    />
                ) : (
                    i18nValue('Pivot_Dataset_Select_None')
                )}
            </StackItem>
        </>
    );
};
