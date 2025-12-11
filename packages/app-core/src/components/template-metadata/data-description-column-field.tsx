import { TableCell } from '@fluentui/react-components';

import { DATASET_DEFAULT_NAME } from '@deneb-viz/powerbi-compat/dataset';
import { CappedTextField } from '../ui';
import { TEMPLATE_DATASET_FIELD_PROPS } from './constants';

type IDataDescriptionColumnFieldProps = {
    index: number;
};

/**
 * Displays a template field description as an editable text area.
 */
export const DataDescriptionColumnField = ({
    index
}: IDataDescriptionColumnFieldProps) => {
    return (
        <TableCell>
            <CappedTextField
                id={`${DATASET_DEFAULT_NAME}[${index}].description`}
                i18nLabel='Field Description'
                i18nPlaceholder='Template_Description_Optional_Placeholder'
                maxLength={TEMPLATE_DATASET_FIELD_PROPS.description.maxLength}
                multiline
                inline
            />
        </TableCell>
    );
};
