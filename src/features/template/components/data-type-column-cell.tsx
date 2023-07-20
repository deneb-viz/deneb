import React from 'react';
import {
    TableCell,
    TableCellLayout,
    Tooltip
} from '@fluentui/react-components';

import { useTemplateStyles } from '.';
import { DataTypeIcon } from './data-type-icon';
import { getDataTypeIconTitle } from '../fields';
import { TDatasetFieldType } from '../schema';

interface IDataTypeColumnCellProps {
    type: TDatasetFieldType;
}

/**
 * Displays the icon for a data type, complete with tooltip.
 */
export const DataTypeColumnCell: React.FC<IDataTypeColumnCellProps> = ({
    type
}) => {
    const classes = useTemplateStyles();
    return (
        <Tooltip
            content={getDataTypeIconTitle(type)}
            relationship='description'
        >
            <TableCell className={classes.datasetDataType}>
                <TableCellLayout media={<DataTypeIcon type={type} />} />
            </TableCell>
        </Tooltip>
    );
};
