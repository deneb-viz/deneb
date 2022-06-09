import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { ColumnDefinition, ReactTabulator } from 'react-tabulator';
import { Tabulator } from 'react-tabulator/lib/types/TabulatorTypes';
import Sorter = Tabulator.Sorter;

import sortBy from 'lodash/sortBy';
import { deepEqual } from 'vega-lite';

import { reactLog } from '../../../core/utils/reactLog';

const INITIAL_PAGE = 1;
const INITIAL_SORT = [];

/**
 * Generic tabulator options for all tables.
 */
const defaultOptions = {
    height: '100%',
    maxHeight: '100%',
    width: '100%',
    maxWidth: '100%',
    layout: 'fitData',
    movableColumns: true,
    columnDefaults: {
        tooltip: true
    },
    pagination: true,
    paginationSize: 10
};

/**
 * As our table is displayed in a flexbox, we need to apply some specific
 * styling to make it use the dimensions correctly. This is for the surrounding
 * div element.
 */
const containerStyle: CSSProperties = {
    height: '100%',
    maxHeight: '100%',
    width: '100%',
    maxWidth: '100%',
    position: 'absolute',
    paddingTop: '5px'
};

/**
 * Required properties for the `DataTable` component
 */
interface IDataTableProps {
    name: string;
    columns: ColumnDefinition[];
    data: any[];
    layout: string;
}

/**
 * Allows us to compare previous dataset name with current (and handle reset
 * of 'persisted' layout when this changes).
 */
const usePreviousNameProp = (name: string) => {
    const ref = useRef<string>();
    useEffect(() => {
        ref.current = name;
    });
    return ref.current;
};

/**
 * Check to ensure that column field names haven't changed. Note that the user
 * may have re-ordered, so we sort them to verify (and preserve order if they
 * are still within the same data stream).
 */
const haveColumnsChanged = (
    prev: ColumnDefinition[],
    current: ColumnDefinition[]
) => {
    const sortedPrev = sortBy(prev, (c) => c.field).map((c) => c.field);
    const sortedCurrent = sortBy(current, (c) => c.field).map((c) => c.field);
    return !deepEqual(sortedPrev, sortedCurrent);
};

/**
 * General component for viewing data within the debug area.
 */
export const DataTable: React.FC<IDataTableProps> = ({
    name,
    columns,
    data,
    layout
}) => {
    reactLog('Rendering [DataTable]');
    const prevName = usePreviousNameProp(name);
    const [paginationInitialPage, setPaginationInitialPage] =
        useState(INITIAL_PAGE);
    const [initialSort, setInitialSort] = useState<Sorter[]>(INITIAL_SORT);
    const [currentColumns, setCurrentColumns] =
        useState<ColumnDefinition[]>(columns);
    if (haveColumnsChanged(columns, currentColumns)) {
        setCurrentColumns(columns);
    }
    const handleReset = () => {
        setPaginationInitialPage(INITIAL_PAGE);
        setInitialSort(INITIAL_SORT);
    };
    const options = {
        ...defaultOptions,
        ...{
            layout,
            paginationInitialPage,
            initialSort
        }
    };
    useEffect(() => {
        if (name !== prevName) {
            handleReset();
        }
    });
    return (
        <div style={containerStyle}>
            <ReactTabulator
                data={data}
                tooltips={true}
                columns={currentColumns}
                options={options}
                events={{
                    columnMoved: (column: ColumnDefinition, columns: any[]) =>
                        setCurrentColumns(
                            columns.map((c) => c._column.definition)
                        ),
                    dataSorted: (sorters: Sorter[], rows: any[]) =>
                        setInitialSort(sorters),
                    pageLoaded: (num: number) => setPaginationInitialPage(num)
                }}
            />
        </div>
    );
};
