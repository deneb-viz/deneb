import { makeStyles, TableCell } from '@fluentui/react-components';
import {
    TEMPLATE_DATA_FIELD_COLUMN_MAX_WIDTH,
    TEMPLATE_DATA_FIELD_COLUMN_MIN_WIDTH
} from './constants';

type DataNameColumnCellProps = {
    name: string;
};

export const useDataNameColumnCellStyles = makeStyles({
    root: {
        minWidth: `${TEMPLATE_DATA_FIELD_COLUMN_MIN_WIDTH}px`,
        maxWidth: `${TEMPLATE_DATA_FIELD_COLUMN_MAX_WIDTH}px`
    }
});

/**
 * Displays the name of a template dataset field.
 */
export const DataNameColumnCell = ({ name }: DataNameColumnCellProps) => {
    const classes = useDataNameColumnCellStyles();
    return <TableCell className={classes.root}>{name}</TableCell>;
};
