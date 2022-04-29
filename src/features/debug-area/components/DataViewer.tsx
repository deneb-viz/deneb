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
    getCellTooltip,
    getFormattedValueForTable
} from '../data-table';
import {
    DATASET_IDENTITY_NAME,
    DATASET_KEY_NAME,
    DATASET_NAME
} from '../../../constants';

/**
 * Represents content to be displayed in a data table.
 */
interface IDataTableContent {
    columns: ColumnDefinition[];
    data: any[];
}

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
 * Retrieve a dataset from the view by name.
 */
const getNamedDataset = (view: View, name = DATASET_NAME) =>
    getDatasets(view)?.find((d) => d.key === name);

/**
 * For a dataset view, we need to dynamically get and assign columns from the
 * selected dataset from the view.
 */
const getDataTableColumns = (dataset: string, view: View): ColumnDefinition[] =>
    keys(view.data(dataset)?.[0])
        ?.filter(
            (c) => [DATASET_KEY_NAME, DATASET_IDENTITY_NAME].indexOf(c) === -1
        )
        ?.map((c) => ({
            title: c,
            field: c,
            tooltip: (cell) => getCellTooltip(cell),
            headerTooltip: (column) => getColumnHeaderTooltip(column),
            formatter: (cell, params, onRendered) =>
                getFormattedValueForTable(cell)
        })) || [];

/**
 * Obtain table content for display.
 */
const getDataTableContent = (view: View, name: string): IDataTableContent => ({
    columns: getDataTableColumns(name, view),
    data: view.data(name)
});

/**
 * Handles display of dataset info in the debug area.
 */
export const DataViewer: React.FC = () => {
    const { editorView } = store((state) => state);
    const dropdownOptions = getDatasets(editorView);
    const [selectedItem, setSelectedItem] = useState<IDropdownOption>(
        getNamedDataset(editorView)
    );
    // Ensure that if a change to the spec removes selected dataset, that its
    // contents are set to the default dataset
    let dataTableContent: IDataTableContent = { columns: [], data: [] };
    try {
        dataTableContent = getDataTableContent(editorView, selectedItem?.text);
    } catch {
        setSelectedItem(getNamedDataset(editorView));
    }
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
                        name={selectedItem.text}
                        columns={dataTableContent.columns}
                        data={dataTableContent.data}
                        layout='fitData'
                    />
                ) : (
                    i18nValue('Pivot_Dataset_Select_None')
                )}
            </StackItem>
        </>
    );
};
