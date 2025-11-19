import React from 'react';
import { Caption1, TableCell } from '@fluentui/react-components';

import { useTemplateStyles } from '.';

interface IDataDescriptionColumnCell {
    text: string;
}

/**
 * Displays the name of a template dataset field.
 */
export const DataDescriptionColumnCell: React.FC<
    IDataDescriptionColumnCell
> = ({ text }) => {
    const classes = useTemplateStyles();
    return (
        <TableCell>
            <div className={classes.datasetDescriptionField}>
                <Caption1>{text}</Caption1>
            </div>
        </TableCell>
    );
};
