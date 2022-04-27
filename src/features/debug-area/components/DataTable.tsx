import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { ColumnDefinition, ReactTabulator } from 'react-tabulator';

import { reactLog } from '../../../core/utils/reactLog';

const INITIAL_PAGE = 1;

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
    paginationSize: 10,
    paginationCounter: (
        pageSize: number,
        currentRow: number,
        currentPage: number,
        totalRows: number,
        totalPages: number
    ) => `Showing ${pageSize} rows of ${totalRows} total.`
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
    const [pageNumber, setPageNumber] = useState(INITIAL_PAGE);
    const options = {
        ...defaultOptions,
        ...{ layout },
        ...{
            paginationInitialPage: pageNumber
        }
    };
    const handleReset = () => {
        setPageNumber(INITIAL_PAGE);
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
                columns={columns}
                options={options}
                events={{
                    pageLoaded: (num: number) => setPageNumber(num)
                }}
            />
        </div>
    );
};
