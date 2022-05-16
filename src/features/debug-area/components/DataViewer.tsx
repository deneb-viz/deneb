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
import { getDataset } from '../../../core/data/dataset';

/**
 * Represents content to be displayed in a data table.
 */
interface IDataTableContent {
    columns: ColumnDefinition[];
    data: any[];
}

/**
 * Name of dataset to substitute into the dropdown if the view doesn't contain
 * any (which will still allow creators to view the underlying Power BI data).
 */
const NO_DATASET_NAME = 'dataset';

/**
 * The name of the root dataset, to filter out when deriving from the view.
 */
const ROOT_DATASET_NAME = 'root';

/**
 * Override regular dropdown width styling to handle longer names.
 */
const DROPDOWN_STYLES: Partial<IDropdownStyles> = {
    ...horizontalDropdownStyles,
    ...{ dropdown: { width: 200 } }
};

/**
 * Obtains all current datasets from a Vega view.
 */
const getDatasets = (view: View): IDropdownOption[] => {
    const datasets = keys(getViewData(view)).filter(
        (key) => key !== ROOT_DATASET_NAME
    );
    return (datasets.length === 0 ? [NO_DATASET_NAME] : datasets).map(
        (key) => ({ key, text: key })
    );
};

/**
 * Apply necessary logic to the view state to get current datasets.
 */
const getViewData = (view: View) =>
    view?.getState({ data: truthy, signals: falsy, recurse: true }).data;

/**
 * Retrieve a dataset from the view by name.
 */
const getNamedDataset = (view: View, name = DATASET_NAME) => {
    const datasets = getDatasets(view);
    return (
        datasets?.find((d) => d.key === name) ||
        datasets?.[0] || { key: NO_DATASET_NAME, text: NO_DATASET_NAME }
    );
};

/**
 * For a dataset view, we need to dynamically get and assign columns from the
 * selected dataset from the view.
 */
const getDataTableColumns = (dataset: string, view: View): ColumnDefinition[] =>
    keys(getDataTableData(view, dataset)?.[0])
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
 * Get the resolved data for the table, accommodating for a potentially
 * empty Vega view.
 */
const getDataTableData = (view: View, name: string) =>
    viewHasDataset(view, name) ? view?.data(name) : getDataset().values;

/**
 * Obtain table content for display.
 */
const getDataTableContent = (view: View, name: string): IDataTableContent => ({
    columns: getDataTableColumns(name, view),
    data: getDataTableData(view, name) || []
});

/**
 * If our view isn't valid, then we need to substitute the visual dataset, as
 * it won't be present. This provides a truthiness test for that scenario.
 */
const viewHasDataset = (view: View, name: string) => {
    try {
        return view?.data(name) !== undefined;
    } catch (e) {
        return false;
    }
};

/**
 * Handles display of dataset info in the debug area.
 */
export const DataViewer: React.FC = () => {
    const { editorView } = store((state) => state);
    const dropdownOptions = getDatasets(editorView);
    const [selectedItem, setSelectedItem] = useState<IDropdownOption>(
        getNamedDataset(editorView)
    );
    const datasetName = selectedItem?.text;
    // Ensure that if a change to the spec removes selected dataset, that its
    // contents are set to the default dataset
    let dataTableContent: IDataTableContent = { columns: [], data: [] };
    try {
        dataTableContent = getDataTableContent(editorView, datasetName);
    } catch (e) {
        setSelectedItem(getNamedDataset(editorView));
    }
    const [key, setKey] = useState<number>(0);
    const debounceData = debounce(100, () => setKey((key) => key + 1));
    const handleChange = (
        ev: React.FormEvent<HTMLDivElement>,
        item: IDropdownOption
    ): void => {
        setSelectedItem(item);
    };
    useEffect(() => {
        viewHasDataset(editorView, datasetName) &&
            editorView?.addDataListener(datasetName, debounceData);
        return () => {
            viewHasDataset(editorView, datasetName)
                ? editorView?.removeDataListener(datasetName, debounceData)
                : null;
        };
    });
    reactLog('Rendering [DataViewer]');
    return (
        <>
            <StackItem>
                <Stack horizontal horizontalAlign='end'>
                    <Dropdown
                        styles={DROPDOWN_STYLES}
                        options={dropdownOptions}
                        selectedKey={selectedItem?.key}
                        label={i18nValue('Pivot_Dataset_Select_Label')}
                        onChange={handleChange}
                    />
                </Stack>
            </StackItem>
            <StackItem grow styles={dataTableStackItemStyles}>
                {selectedItem ? (
                    <DataTable
                        name={datasetName}
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
