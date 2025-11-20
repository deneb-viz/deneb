import { makeStyles, TableCell } from '@fluentui/react-components';

import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/dataset/data';
import { CappedTextField } from '../ui';
import {
    TEMPLATE_DATA_FIELD_COLUMN_MAX_WIDTH,
    TEMPLATE_DATA_FIELD_COLUMN_MIN_WIDTH,
    TEMPLATE_DATASET_FIELD_PROPS
} from './constants';

type DataNameColumnFieldProps = {
    item: UsermetaDatasetField;
    index: number;
};

export const useDataNameColumnFieldStyles = makeStyles({
    root: {
        minWidth: `${TEMPLATE_DATA_FIELD_COLUMN_MIN_WIDTH}px`,
        maxWidth: `${TEMPLATE_DATA_FIELD_COLUMN_MAX_WIDTH}px`
    }
});

/**
 * Displays a template field name as an editable field.
 */
export const DataNameColumnField = ({
    item,
    index
}: DataNameColumnFieldProps) => {
    const classes = useDataNameColumnFieldStyles();
    return (
        <TableCell className={classes.root}>
            <CappedTextField
                id={`${DATASET_DEFAULT_NAME}.${index}.name`}
                i18nLabel={`${item.name}`}
                i18nPlaceholder={`${item?.namePlaceholder}`}
                maxLength={TEMPLATE_DATASET_FIELD_PROPS.name.maxLength}
                inline
            />
        </TableCell>
    );
};
