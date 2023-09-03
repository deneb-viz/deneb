import React from 'react';
import { TableCell } from '@fluentui/react-components';

import { useTemplateStyles } from '.';

interface IDataNameColumnCellProps {
    name: string;
}

/**
 * Displays the name of a template dataset field.
 */
export const DataNameColumnCell: React.FC<IDataNameColumnCellProps> = ({
    name
}) => {
    const classes = useTemplateStyles();
    return <TableCell className={classes.datasetColumnName}>{name}</TableCell>;
};
