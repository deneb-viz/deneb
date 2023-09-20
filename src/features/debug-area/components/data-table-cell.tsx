import React from 'react';
import { getCellTooltip } from '../data-table';

interface IDataTableCellProps {
    displayValue: string;
    field: string;
    rawValue: any;
}

/**
 * Handles rendering a cell in the data table, with a tooltip, and allowing
 * for any formatting specifics (such as truncating long values).
 */
export const DataTableCell: React.FC<IDataTableCellProps> = ({
    displayValue,
    field,
    rawValue
}) => {
    const tooltipValue = getCellTooltip(field, rawValue);
    return <div title={tooltipValue}>{displayValue}</div>;
};
