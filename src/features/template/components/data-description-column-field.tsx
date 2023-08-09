import React from 'react';
import { TableCell } from '@fluentui/react-components';

import { CappedTextField } from '../../interface';
import { TEMPLATE_DATASET_FIELD_PROPS } from '../fields';
import { DATASET_NAME } from '../../../constants';

interface IDataNameColumnCellProps {
    index: number;
}

/**
 * Displays a template field description as an editable text area.
 */
export const DataDescriptionColumnField: React.FC<IDataNameColumnCellProps> = ({
    index
}) => {
    return (
        <TableCell>
            <CappedTextField
                id={`${DATASET_NAME}[${index}].description`}
                i18nLabel='Field Description'
                i18nPlaceholder='Template_Description_Optional_Placeholder'
                maxLength={TEMPLATE_DATASET_FIELD_PROPS.description.maxLength}
                multiline
                inline
            />
        </TableCell>
    );
};
