import { useState } from 'react';
import {
    makeStyles,
    TableCell,
    TableCellLayout,
    Tooltip
} from '@fluentui/react-components';

import { type UsermetaDatasetFieldType } from '@deneb-viz/template-usermeta';
import { DataTypeIcon } from './data-type-icon';
import { TooltipCustomMount } from '../ui';
import { getDenebState } from '../../state';

type DataTypeColumnCellProps = {
    type: UsermetaDatasetFieldType;
};

export const useDataTypeColumnCellStyles = makeStyles({
    root: {
        minWidth: '15px',
        maxWidth: '15px'
    }
});

/**
 * Displays the icon for a data type, complete with tooltip.
 */
export const DataTypeColumnCell = ({ type }: DataTypeColumnCellProps) => {
    const classes = useDataTypeColumnCellStyles();
    const [ref, setRef] = useState<HTMLElement | null>();
    return (
        <>
            <Tooltip
                content={getDataTypeIconTitle(type)}
                relationship='label'
                withArrow
                mountNode={ref}
            >
                <TableCell className={classes.root}>
                    <TableCellLayout media={<DataTypeIcon type={type} />} />
                </TableCell>
            </Tooltip>
            <TooltipCustomMount setRef={setRef} />
        </>
    );
};

/**
 * For a given column or measure (or template placeholder), resolve the UI
 * tooltip/title text for its data type.
 */
const getDataTypeIconTitle = (type: UsermetaDatasetFieldType) => {
    const { translate } = getDenebState().i18n;
    switch (type) {
        case 'bool':
            return translate('Template_Type_Descriptor_Bool');
        case 'text':
            return translate('Template_Type_Descriptor_Text');
        case 'numeric':
            return translate('Template_Type_Descriptor_Numeric');
        case 'dateTime':
            return translate('Template_Type_Descriptor_DateTime');
        default:
            return translate('Template_Import_Not_Deneb');
    }
};
