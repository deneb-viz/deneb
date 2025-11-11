import React, { useState } from 'react';
import {
    TableCell,
    TableCellLayout,
    Tooltip
} from '@fluentui/react-components';

import { useTemplateStyles } from '.';
import { DataTypeIcon } from './data-type-icon';
import { getDataTypeIconTitle } from '../fields';
import { TooltipCustomMount } from '../../interface';
import { type UsermetaDatasetFieldType } from '@deneb-viz/template-usermeta';

interface IDataTypeColumnCellProps {
    type: UsermetaDatasetFieldType;
}

/**
 * Displays the icon for a data type, complete with tooltip.
 */
export const DataTypeColumnCell: React.FC<IDataTypeColumnCellProps> = ({
    type
}) => {
    const classes = useTemplateStyles();
    const [ref, setRef] = useState<HTMLElement | null>();
    return (
        <>
            <Tooltip
                content={getDataTypeIconTitle(type)}
                relationship='label'
                withArrow
                mountNode={ref}
            >
                <TableCell className={classes.datasetDataType}>
                    <TableCellLayout media={<DataTypeIcon type={type} />} />
                </TableCell>
            </Tooltip>
            <TooltipCustomMount setRef={setRef} />
        </>
    );
};
