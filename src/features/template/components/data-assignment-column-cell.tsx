import React from 'react';
import { TableCell } from '@fluentui/react-components';

import { useTemplateStyles } from '.';
import { DataFieldDropDown } from './data-field-dropdown';
import { TModalDialogType } from '../../modal-dialog';
import { UsermetaDatasetField } from '@deneb-viz/core-dependencies';

interface IDataAssignmentColumnCellProps {
    item: UsermetaDatasetField;
    role: TModalDialogType;
}

/**
 * Displays the dropdown for a template field, allowing assignment of a column
 * or measure from the data model.
 */
export const DataAssignmentColumnCell: React.FC<IDataAssignmentColumnCellProps> =
    ({ item, role }) => {
        const classes = useTemplateStyles();
        return (
            <TableCell className={classes.datasetColumnAssignment}>
                {
                    <DataFieldDropDown
                        key={item.key}
                        datasetField={item}
                        dialogType={role}
                    />
                }
            </TableCell>
        );
    };
