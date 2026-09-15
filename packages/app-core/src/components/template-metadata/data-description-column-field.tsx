import { TableCell } from '@fluentui/react-components';

import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import { CappedTextField, type CappedTextFieldChange } from '../ui';
import { TEMPLATE_DATASET_FIELD_PROPS } from './constants';

type IDataDescriptionColumnFieldProps = {
    index: number;
    onValueChange: (change: CappedTextFieldChange) => void;
};

/**
 * Displays a template field description as an editable text area.
 */
export const DataDescriptionColumnField = ({
    index,
    onValueChange
}: IDataDescriptionColumnFieldProps) => {
    return (
        <TableCell>
            <CappedTextField
                id={`datasets.${DATASET_DEFAULT_NAME}.${index}.description`}
                i18nLabel='Field Description'
                i18nPlaceholder='Template_Description_Optional_Placeholder'
                maxLength={TEMPLATE_DATASET_FIELD_PROPS.description.maxLength}
                onValueChange={onValueChange}
                multiline
                inline
            />
        </TableCell>
    );
};
