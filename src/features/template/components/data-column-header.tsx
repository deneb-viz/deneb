import React from 'react';
import { TableHeaderCell } from '@fluentui/react-components';

import { TemplateDatasetColumnRole } from '../types';
import { getDataColumnClass, getDataColumnText } from '../fields';

interface IDataColumnHeaderProps {
    columnRole: TemplateDatasetColumnRole;
}

/**
 * Displays the table header for a name column.
 */
export const DataColumnHeader: React.FC<IDataColumnHeaderProps> = ({
    columnRole
}) => {
    return (
        <TableHeaderCell
            className={getDataColumnClass(columnRole)}
            key={columnRole}
        >
            {getDataColumnText(columnRole)}
        </TableHeaderCell>
    );
};
