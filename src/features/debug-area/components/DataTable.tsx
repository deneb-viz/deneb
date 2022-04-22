import React, { CSSProperties } from 'react';
import { ColumnDefinition, ReactTabulator } from 'react-tabulator';

import { reactLog } from '../../../core/utils/reactLog';

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
    columns: ColumnDefinition[];
    data: any[];
    layout: string;
}

/**
 * General component for viewing data within the debug area.
 */
export const DataTable: React.FC<IDataTableProps> = ({
    columns,
    data,
    layout
}) => {
    reactLog('Rendering [DataTable]');
    const options = { ...defaultOptions, ...{ layout } };
    return (
        <div style={containerStyle}>
            <ReactTabulator
                data={data}
                tooltips={true}
                columns={columns}
                options={options}
            />
        </div>
    );
};
