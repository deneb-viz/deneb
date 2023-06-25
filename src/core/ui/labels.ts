import { getI18nValue } from '../../features/i18n';
import {
    ITemplateDatasetField,
    TDatasetFieldType
} from '../../features/template';

/**
 * For a given column or measure (or template placeholder), resolve the UI tooltip/title text for its data type.
 */
export const getDataTypeIconTitle = (type: TDatasetFieldType) => {
    switch (type) {
        case 'bool':
            return getI18nValue('Template_Type_Descriptor_Bool');
        case 'text':
            return getI18nValue('Template_Type_Descriptor_Text');
        case 'numeric':
            return getI18nValue('Template_Type_Descriptor_Numeric');
        case 'dateTime':
            return getI18nValue('Template_Type_Descriptor_DateTime');
        default:
            return getI18nValue('Template_Import_Not_Deneb');
    }
};

/**
 * Supply assistive text to a placeholder, based on whether it allows columns, measures or both.
 */
export const getPlaceholderDropdownText = (
    datasetField: ITemplateDatasetField
) => {
    switch (datasetField.kind) {
        case 'column':
            return getI18nValue('Dropdown_Placeholder_Column');
        case 'measure':
            return getI18nValue('Dropdown_Placeholder_Measure');
        default:
            return getI18nValue('Dropdown_Placeholder_Both');
    }
};

export const resolveAutoApplyLabel = (enabled: boolean) =>
    enabled
        ? getI18nValue('Button_Auto_Apply_Off')
        : getI18nValue('Button_Auto_Apply_On');
