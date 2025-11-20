import { makeStyles, TableCell } from '@fluentui/react-components';

import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';
import { type ModalDialogType } from '../ui';
import { DataFieldDropdown } from './data-field-dropdown';

type DataAssignmentColumnCellProps = {
    item: UsermetaDatasetField;
    role: ModalDialogType;
};

export const useDataAssignmentColumnCellStyles = makeStyles({
    root: {
        minWidth: '300px'
    }
});

/**
 * Displays the dropdown for a template field, allowing assignment of a column
 * or measure from the data model.
 */
export const DataAssignmentColumnCell = ({
    item,
    role
}: DataAssignmentColumnCellProps) => {
    const classes = useDataAssignmentColumnCellStyles();
    return (
        <TableCell className={classes.root}>
            {
                <DataFieldDropdown
                    key={item.key}
                    datasetField={item}
                    dialogType={role}
                />
            }
        </TableCell>
    );
};
