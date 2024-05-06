import React from 'react';
import { TableHeaderCell } from '@fluentui/react-components';

import { getDataColumnClass, getDataColumnText } from '../fields';
import { DenebTemplateDatasetColumnRole } from '@deneb-viz/core-dependencies';

interface IDataColumnHeaderProps {
    columnRole: DenebTemplateDatasetColumnRole;
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
